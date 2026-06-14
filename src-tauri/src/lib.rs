use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

// Persist the whole app state as a JSON file in the per-user app-data dir, with
// rolling timestamped backups so a bad write can always be rolled back.
fn data_file(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  Ok(dir.join("dollaz.json"))
}

const BACKUP_INTERVAL_SECS: u64 = 900; // a new snapshot at most every 15 min of use
const BACKUP_KEEP: usize = 20;         // ~5 hours of snapshots

/// True if there are no backups yet, or the newest is older than the interval.
fn should_backup(bdir: &Path) -> bool {
  let mut newest: Option<SystemTime> = None;
  if let Ok(rd) = fs::read_dir(bdir) {
    for e in rd.flatten() {
      if let Ok(m) = e.metadata().and_then(|md| md.modified()) {
        if newest.map_or(true, |n| m > n) { newest = Some(m); }
      }
    }
  }
  match newest {
    None => true,
    Some(t) => SystemTime::now().duration_since(t).map(|d| d.as_secs() >= BACKUP_INTERVAL_SECS).unwrap_or(true),
  }
}

/// Keep only the newest `BACKUP_KEEP` backup files.
fn prune_backups(bdir: &Path) {
  let mut files: Vec<(SystemTime, std::path::PathBuf)> = fs::read_dir(bdir)
    .into_iter().flatten().flatten()
    .filter_map(|e| {
      let p = e.path();
      if p.extension().map_or(false, |x| x == "json") {
        let m = e.metadata().ok()?.modified().ok()?;
        Some((m, p))
      } else { None }
    })
    .collect();
  files.sort_by(|a, b| b.0.cmp(&a.0)); // newest first
  for (_, p) in files.into_iter().skip(BACKUP_KEEP) { let _ = fs::remove_file(p); }
}

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<String, String> {
  let file = data_file(&app)?;
  match fs::read_to_string(&file) {
    Ok(s) => Ok(s),
    Err(_) => Ok(String::new()), // missing file → empty (first run)
  }
}

#[tauri::command]
fn save_data(app: tauri::AppHandle, data: String) -> Result<(), String> {
  let file = data_file(&app)?;
  let dir = file.parent().ok_or("no parent dir")?;
  fs::create_dir_all(dir).map_err(|e| e.to_string())?;

  // Roll a backup of the current (about-to-be-replaced) ledger.
  if let Ok(existing) = fs::read_to_string(&file) {
    if !existing.trim().is_empty() {
      let bdir = dir.join("backups");
      let _ = fs::create_dir_all(&bdir);
      if should_backup(&bdir) {
        let ts = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
        let _ = fs::write(bdir.join(format!("dollaz-{}.json", ts)), &existing);
        prune_backups(&bdir);
      }
    }
  }

  // Write to a temp file then rename, so a crash mid-write can't corrupt the ledger.
  let tmp = dir.join("dollaz.json.tmp");
  fs::write(&tmp, data).map_err(|e| e.to_string())?;
  fs::rename(&tmp, &file).map_err(|e| e.to_string())?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![load_data, save_data])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
