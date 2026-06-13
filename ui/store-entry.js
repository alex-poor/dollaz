// store-entry.js — bundled by build.sh. Bridges the disk-backed store (Tauri
// commands load_data/save_data) to the UI as window.ffStore. No-ops in a
// browser, where state.jsx falls back to localStorage.
import { invoke } from '@tauri-apps/api/core';

const inTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

async function load() {
  if (!inTauri) return null;
  try { const s = await invoke('load_data'); return s || null; }
  catch (e) { console.warn('store load failed', e); return null; }
}
async function save(json) {
  if (!inTauri) return false;
  try { await invoke('save_data', { data: json }); return true; }
  catch (e) { console.warn('store save failed', e); return false; }
}

window.ffStore = { inTauri, load, save };
