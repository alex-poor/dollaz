// state.jsx — app-wide state in localStorage. Dark-only grimoire build.
// Shape: { transactions[], categories[], rules[], accounts[], importFormats[], settings, firstRun }
// settings.tweaks holds the design knobs (mood/grain/gilt/brandMark/chartStyle).

const DZStorageKey = 'dollaz:v1';

function loadState() {
  try { const raw = localStorage.getItem(DZStorageKey); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function saveState(s) {
  try { localStorage.setItem(DZStorageKey, JSON.stringify(s)); }
  catch (e) { console.warn('saveState failed (storage full?)', e); }
}

function defaultTweaks() {
  return { mood: '#c9a23f', grain: true, gilt: true, brandMark: 'seal', chartStyle: 'net' };
}
function defaultSettings() {
  return { currency: '$', projectionMethod: 'avg', projectionMonths: 6, tweaks: defaultTweaks() };
}

function makeInitialState() {
  const saved = loadState();
  if (saved) {
    saved.settings = { ...defaultSettings(), ...(saved.settings || {}) };
    saved.settings.tweaks = { ...defaultTweaks(), ...(saved.settings.tweaks || {}) };
    if (!Array.isArray(saved.importFormats)) saved.importFormats = [];
    if (!Array.isArray(saved.transactions)) saved.transactions = [];
    if (!Array.isArray(saved.accounts)) saved.accounts = [];
    if (!Array.isArray(saved.categories)) saved.categories = window.DZ.DEFAULT_CATEGORIES.slice();
    if (!Array.isArray(saved.rules)) saved.rules = [];
    return saved;
  }
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

Object.assign(window, { makeInitialState, loadState, saveState, useHistory, useToasts, DZStorageKey, defaultSettings, defaultTweaks });
