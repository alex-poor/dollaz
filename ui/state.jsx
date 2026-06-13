// state.jsx — app-wide state. Persisted to disk via window.ffStore (Tauri) when
// available — effectively unlimited — falling back to localStorage in the browser
// preview. Shape: { transactions[], categories[], rules[], accounts[], importFormats[], settings, firstRun }

const DZStorageKey = 'dollaz:v1';

function defaultTweaks() {
  return { mood: '#c9a23f', grain: true, gilt: true, brandMark: 'seal', chartStyle: 'net' };
}
function defaultSettings() {
  return { currency: '$', projectionMethod: 'avg', projectionMonths: 6, tweaks: defaultTweaks() };
}
function freshState() {
  return {
    transactions: [],
    categories: window.DZ.DEFAULT_CATEGORIES.slice(),
    rules: window.DZ.DEFAULT_RULES.slice(),
    accounts: [],
    importFormats: [],
    settings: defaultSettings(),
    firstRun: true,
  };
}

// Normalise a loaded object, filling in fields added in later versions.
function applyDefaults(saved) {
  saved.settings = { ...defaultSettings(), ...(saved.settings || {}) };
  saved.settings.tweaks = { ...defaultTweaks(), ...(saved.settings.tweaks || {}) };
  if (!Array.isArray(saved.importFormats)) saved.importFormats = [];
  if (!Array.isArray(saved.transactions)) saved.transactions = [];
  if (!Array.isArray(saved.accounts)) saved.accounts = [];
  if (!Array.isArray(saved.categories)) saved.categories = window.DZ.DEFAULT_CATEGORIES.slice();
  if (!Array.isArray(saved.rules)) saved.rules = [];
  return saved;
}
function parseRaw(raw) {
  try { const o = JSON.parse(raw); return o && typeof o === 'object' ? applyDefaults(o) : null; }
  catch { return null; }
}

// Async initial load: disk (Tauri) → migrate localStorage on first run → fresh.
async function loadInitial() {
  if (window.ffStore?.inTauri) {
    const raw = await window.ffStore.load();
    if (raw) return parseRaw(raw) || freshState();
    // First run on disk store: migrate any existing localStorage ledger.
    try {
      const ls = localStorage.getItem(DZStorageKey);
      if (ls) { const s = parseRaw(ls); if (s) { await window.ffStore.save(JSON.stringify(s)); return s; } }
    } catch {}
    return freshState();
  }
  try { const ls = localStorage.getItem(DZStorageKey); if (ls) return parseRaw(ls) || freshState(); } catch {}
  return freshState();
}

// Persist; resolves true on success, false on failure (full disk / quota).
async function persist(state) {
  const json = JSON.stringify(state);
  if (window.ffStore?.inTauri) return window.ffStore.save(json);
  try { localStorage.setItem(DZStorageKey, json); return true; } catch (e) { console.warn('persist failed', e); return false; }
}

// Undo/redo stack (last 30 snapshots). Push BEFORE a mutation.
function useHistory(value, setValue, cap = 30) {
  const histRef = React.useRef({ past: [], future: [] });
  const lastValRef = React.useRef(value);
  const push = React.useCallback(() => {
    histRef.current.past.push(JSON.parse(JSON.stringify(lastValRef.current)));
    if (histRef.current.past.length > cap) histRef.current.past.shift();
    histRef.current.future = [];
  }, [cap]);
  React.useEffect(() => { lastValRef.current = value; }, [value]);
  const undo = React.useCallback(() => {
    const h = histRef.current;
    if (!h.past.length) return false;
    const prev = h.past.pop();
    h.future.push(JSON.parse(JSON.stringify(lastValRef.current)));
    setValue(prev); return true;
  }, [setValue]);
  const redo = React.useCallback(() => {
    const h = histRef.current;
    if (!h.future.length) return false;
    const next = h.future.pop();
    h.past.push(JSON.parse(JSON.stringify(lastValRef.current)));
    setValue(next); return true;
  }, [setValue]);
  return { push, undo, redo, canUndo: () => histRef.current.past.length > 0, canRedo: () => histRef.current.future.length > 0 };
}

function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((msg) => {
    const m = typeof msg === 'string' ? msg : (msg && msg.msg) || '';
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, msg: m }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2800);
  }, []);
  return { toasts, push };
}

Object.assign(window, { loadInitial, persist, freshState, DZStorageKey, defaultSettings, defaultTweaks, useHistory, useToasts });
