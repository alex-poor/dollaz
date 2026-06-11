// updater-entry.js — bundled by build.sh. Exposes window.ffUpdate with
// check/install helpers that no-op in the browser, plus window.ffApp.getVersion()
// so the UI can read the bundle version at runtime.
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

const inTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

async function getAppVersion() {
  if (!inTauri) return null;
  try { return await getVersion(); } catch { return null; }
}

async function checkForUpdate() {
  if (!inTauri) return { available: false, reason: 'browser' };
  try {
    const update = await check();
    if (!update) return { available: false };
    return {
      available: true,
      version: update.version,
      currentVersion: update.currentVersion,
      date: update.date,
      body: update.body,
      _update: update,
    };
  } catch (err) {
    return { available: false, error: String(err?.message || err) };
  }
}

async function downloadAndInstall(info, onProgress) {
  if (!info?._update) throw new Error('No update handle');
  let downloaded = 0;
  let total = 0;
  await info._update.downloadAndInstall((event) => {
    if (event.event === 'Started') total = event.data.contentLength || 0;
    else if (event.event === 'Progress') downloaded += event.data.chunkLength || 0;
    onProgress?.({ phase: event.event, downloaded, total });
  });
  await relaunch();
}

window.ffUpdate = { inTauri, checkForUpdate, downloadAndInstall };
window.ffApp = { inTauri, getVersion: getAppVersion };
