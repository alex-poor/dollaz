// state.jsx — app-wide state in localStorage. No network.
// Shape: { transactions[], categories[], rules[], importFormats[], settings, firstRun }

const DZStorageKey = 'dollaz:v1';

function loadState() {
  try {
    const raw = localStorage.getItem(DZStorageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveState(s) {
  try { localStorage.setItem(DZStorageKey, JSON.stringify(s)); }
  catch (e) { console.warn('saveState failed (storage full?)', e); }
}

function defaultSettings() {
  return { theme: 'light', currency: '$', projectionMethod: 'avg', projectionMonths: 6 };
}

function makeInitialState() {
  const saved = loadState();
  if (saved) {
    // Forward-compatible defaults for fields added in later versions.
    if (!saved.settings) saved.settings = defaultSettings();
    else saved.settings = { ...defaultSettings(), ...saved.settings };
    if (!Array.isArray(saved.importFormats)) saved.importFormats = [];
    if (!Array.isArray(saved.transactions)) saved.transactions = [];
    if (!Array.isArray(saved.categories)) saved.categories = window.DZ.DEFAULT_CATEGORIES.slice();
    if (!Array.isArray(saved.rules)) saved.rules = [];
    return saved;
  }
  return {
    transactions: [],
    categories: window.DZ.DEFAULT_CATEGORIES.slice(),
    rules: window.DZ.DEFAULT_RULES.slice(),
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
    setValue(prev);
    return true;
  }, [setValue]);
  const redo = React.useCallback(() => {
    const h = histRef.current;
    if (!h.future.length) return false;
    const next = h.future.pop();
    h.past.push(JSON.parse(JSON.stringify(lastValRef.current)));
    setValue(next);
    return true;
  }, [setValue]);
  return { push, undo, redo, canUndo: () => histRef.current.past.length > 0, canRedo: () => histRef.current.future.length > 0 };
}

function useToasts() {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, ...t }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), t.duration || 3500);
  }, []);
  const dismiss = (id) => setToasts(ts => ts.filter(x => x.id !== id));
  return { toasts, push, dismiss };
}

Object.assign(window, { makeInitialState, loadState, saveState, useHistory, useToasts, DZStorageKey, defaultSettings });
