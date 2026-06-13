use std::fs;
use tauri::Manager;

// Persist the whole app state as a JSON file in the per-user app-data dir.
// This replaces the browser's ~5 MB localStorage cap with effectively unlimited
// disk storage, and survives app updates.
fn data_file(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  Ok(dir.join("dollaz.json"))
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
