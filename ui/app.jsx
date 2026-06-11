// app.jsx — main shell, router, updater, settings.
const { ICONS, Button } = window;

// Minimal safe markdown renderer (release notes + help). React escapes all text.
function renderInline(text, kp = '') {
  const parts = []; const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) parts.push(<b key={kp + k++}>{t.slice(2, -2)}</b>);
    else if (t.startsWith('`')) parts.push(<code key={kp + k++} style={{ background: 'var(--surface-2)', padding: '1px 4px', borderRadius: 3 }}>{t.slice(1, -1)}</code>);
    else parts.push(<em key={kp + k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
function renderMarkdown(body) {
  if (!body) return null;
  const out = []; let list = null; let key = 0;
  const flush = () => { if (list) { out.push(<ul key={'u' + key++} style={{ margin: '4px 0 10px', paddingLeft: 22 }}>{list}</ul>); list = null; } };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    let m;
    if ((m = line.match(/^#{1,3} (.+)/))) { flush(); out.push(<div key={'h' + key++} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', margin: '12px 0 5px' }}>{renderInline(m[1])}</div>); continue; }
    if ((m = line.match(/^[-*] (.+)/))) { if (!list) list = []; list.push(<li key={'li' + list.length} style={{ marginBottom: 3, lineHeight: 1.45 }}>{renderInline(m[1])}</li>); continue; }
    flush(); out.push(<p key={'p' + key++} style={{ margin: '4px 0 8px', lineHeight: 1.5 }}>{renderInline(line)}</p>);
  }
  flush(); return out;
}

function exportCsv(transactions, categories) {
  const cat = new Map(categories.map(c => [c.id, c.name]));
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const header = ['date', 'description', 'amount', 'category', 'account', 'raw'];
  const lines = [header.join(',')];
  for (const t of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    lines.push([t.date, esc(t.description), t.amount, esc(cat.get(t.categoryId) || ''), esc(t.account), esc(t.raw)].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'dollaz-transactions.csv'; a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [state, setState] = React.useState(() => window.makeInitialState());
  const [route, setRoute] = React.useState(() => {
    try { const s = localStorage.getItem('dollaz:v1:route'); if (s) return JSON.parse(s); } catch {}
    return { name: 'dashboard' };
  });
  const [savingState, setSavingState] = React.useState('idle');
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const { toasts, push: pushToast } = window.useToasts();
  const history = window.useHistory(state, setState);

  // Keep currency symbol + theme in sync with settings.
  React.useEffect(() => {
    window.__dz_currency = state.settings.currency || '$';
    document.documentElement.dataset.theme = state.settings.theme || 'light';
  }, [state.settings.currency, state.settings.theme]);

  // Autosave
  React.useEffect(() => {
    setSavingState('saving');
    const t = setTimeout(() => { window.saveState(state); setSavingState('saved'); }, 300);
    return () => clearTimeout(t);
  }, [state]);
  React.useEffect(() => { try { localStorage.setItem('dollaz:v1:route', JSON.stringify(route)); } catch {} }, [route]);

  // App version (Tauri runtime)
  const [appVersion, setAppVersion] = React.useState(null);
  React.useEffect(() => { let c = false; window.ffApp?.getVersion?.().then(v => { if (!c && v) setAppVersion(v); }); return () => { c = true; }; }, []);

  // Updater
  const [updateInfo, setUpdateInfo] = React.useState(null);
  const [updateModalOpen, setUpdateModalOpen] = React.useState(false);
  const [updateStatus, setUpdateStatus] = React.useState('idle');
  const [updateProgress, setUpdateProgress] = React.useState(0);
  const [updateMsg, setUpdateMsg] = React.useState('');
  const runUpdateCheck = React.useCallback(async (silent) => {
    if (!window.ffUpdate) return;
    setUpdateStatus('checking');
    const res = await window.ffUpdate.checkForUpdate();
    setUpdateStatus('idle');
    if (res.available) { setUpdateInfo(res); setUpdateModalOpen(true); }
    else if (!silent) {
      if (res.reason === 'browser') pushToast({ msg: 'Updates only check in the desktop app' });
      else if (res.error) pushToast({ msg: `Update check failed: ${res.error}` });
      else pushToast({ msg: 'You’re on the latest version' });
    }
  }, [pushToast]);
  React.useEffect(() => {
    if (!window.ffUpdate?.inTauri) return;
    const initial = setTimeout(() => runUpdateCheck(true), 1500);
    const interval = setInterval(() => runUpdateCheck(true), 30 * 60 * 1000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [runUpdateCheck]);

  // Keyboard undo/redo
  React.useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (history.undo()) pushToast({ msg: 'Undone' }); }
      else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); if (history.redo()) pushToast({ msg: 'Redone' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history, pushToast]);

  const go = (name) => setRoute({ name });
  const common = { state, setState, pushToast, pushHistory: history.push };
  const unmapped = window.DZ.unmappedCount(state.transactions);

  let screen;
  if (route.name === 'dashboard') screen = <window.Dashboard {...common} onImport={() => go('import')} onAnalyse={() => go('analysis')}/>;
  else if (route.name === 'import') screen = <window.ImportScreen {...common}/>;
  else if (route.name === 'categories') screen = <window.CategoriesScreen {...common}/>;
  else if (route.name === 'transactions') screen = <window.TransactionsScreen {...common} onImport={() => go('import')}/>;
  else if (route.name === 'analysis') screen = <window.AnalysisScreen {...common} onImport={() => go('import')}/>;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">$</div>
          <div><div className="brand-name">Dollaz</div><div className="brand-sub">Personal finance</div></div>
        </div>

        <NavItem icon={<ICONS.Dashboard/>} active={route.name === 'dashboard'} onClick={() => go('dashboard')}>Dashboard</NavItem>
        <NavItem icon={<ICONS.Import/>} active={route.name === 'import'} onClick={() => go('import')}>Import</NavItem>
        <NavItem icon={<ICONS.List/>} active={route.name === 'transactions'} onClick={() => go('transactions')} count={state.transactions.length || null}>Transactions</NavItem>
        <NavItem icon={<ICONS.TrendUp/>} active={route.name === 'analysis'} onClick={() => go('analysis')}>Analysis</NavItem>

        <div className="nav-section">Setup</div>
        <NavItem icon={<ICONS.Tag/>} active={route.name === 'categories'} onClick={() => go('categories')} count={unmapped > 0 ? unmapped : null} warn={unmapped > 0}>Categories & rules</NavItem>

        <div style={{ flex: 1 }}/>
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}><ICONS.Wallet size={12}/> Local-only · on this machine</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{appVersion ? `v${appVersion}` : 'dev build'}</div>
          {updateInfo ? (
            <button onClick={() => setUpdateModalOpen(true)} className="update-pill"><span className="dot"/> Update to v{updateInfo.version}</button>
          ) : window.ffUpdate?.inTauri ? (
            <button onClick={() => runUpdateCheck(false)} className="btn ghost sm" style={{ marginTop: 6, width: '100%', fontSize: 11.5 }}>Check for updates</button>
          ) : null}
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="btn ghost sm" onClick={history.undo} title="Undo (Ctrl+Z)" disabled={!history.canUndo()}><ICONS.Undo size={14}/></button>
          <button className="btn ghost sm" onClick={history.redo} title="Redo (Ctrl+Shift+Z)" disabled={!history.canRedo()}><ICONS.Redo size={14}/></button>
          <div className="spacer"/>
          <span className={'save-pill ' + (savingState === 'saving' ? 'saving' : '')}><span className="dot"/>{savingState === 'saving' ? 'Saving…' : 'All changes saved'}</span>
          <button className="btn ghost sm icon" onClick={() => setHelpOpen(v => !v)} title="Help"><ICONS.Help size={15}/></button>
          <button className="btn ghost sm icon" onClick={() => setSettingsOpen(true)} title="Settings"><ICONS.Settings size={15}/></button>
        </div>
        {screen}
      </main>

      <div className="toast-stack">{toasts.map(t => <div key={t.id} className="toast"><span>{t.msg}</span></div>)}</div>

      {settingsOpen && <SettingsPanel state={state} setState={setState} pushToast={pushToast} onClose={() => setSettingsOpen(false)}/>}
      {helpOpen && <HelpPanel routeName={route.name} onClose={() => setHelpOpen(false)}/>}

      {updateInfo && updateModalOpen && (
        <div className="modal-back" onClick={() => updateStatus !== 'downloading' && setUpdateModalOpen(false)}>
          <div className="modal fade-in" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head"><h3>Update available — v{updateInfo.version}</h3></div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{`You're on v${updateInfo.currentVersion}. This downloads, installs, and relaunches Dollaz.`}</div>
              {updateInfo.body && <div style={{ fontSize: 12.5, background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--r)', maxHeight: 280, overflow: 'auto' }}>{renderMarkdown(updateInfo.body)}</div>}
              {updateStatus === 'downloading' && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{updateMsg || 'Downloading…'}</div>
                  <div style={{ height: 6, background: 'var(--stone)', borderRadius: 100, overflow: 'hidden' }}><div style={{ height: '100%', width: updateProgress + '%', background: 'var(--accent)', transition: 'width 0.2s' }}/></div>
                </div>
              )}
              {updateStatus === 'error' && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--red)' }}>{updateMsg}</div>}
            </div>
            <div className="modal-foot">
              <button className="btn ghost" disabled={updateStatus === 'downloading'} onClick={() => setUpdateModalOpen(false)}>Later</button>
              <button className="btn primary" disabled={updateStatus === 'downloading'} onClick={async () => {
                setUpdateStatus('downloading'); setUpdateProgress(0); setUpdateMsg('Starting…');
                try {
                  await window.ffUpdate.downloadAndInstall(updateInfo, ({ phase, downloaded, total }) => {
                    if (phase === 'Started') setUpdateMsg('Downloading…');
                    else if (phase === 'Progress' && total) setUpdateProgress(Math.min(100, Math.round((downloaded / total) * 100)));
                    else if (phase === 'Finished') setUpdateMsg('Installing…');
                  });
                } catch (err) { setUpdateStatus('error'); setUpdateMsg(String(err?.message || err)); }
              }}>Install and restart</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, active, onClick, count, warn, children }) {
  return (
    <button className={'nav-item' + (active ? ' active' : '')} onClick={onClick}>
      {icon}<span style={{ flex: 1 }}>{children}</span>
      {count != null && <span className={'badge' + (warn ? ' warn' : '')}>{count}</span>}
    </button>
  );
}

function SettingsPanel({ state, setState, pushToast, onClose }) {
  const [confirmReset, setConfirmReset] = React.useState(false);
  const s = state.settings;
  const set = (patch) => setState(st => ({ ...st, settings: { ...st.settings, ...patch } }));
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>Settings</h3></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Group label="Theme">
            <div className="seg" style={{ width: '100%' }}>
              <button className={s.theme === 'light' ? 'on' : ''} style={{ flex: 1 }} onClick={() => set({ theme: 'light' })}><ICONS.Sun size={13}/> Light</button>
              <button className={s.theme === 'dark' ? 'on' : ''} style={{ flex: 1 }} onClick={() => set({ theme: 'dark' })}><ICONS.Moon size={13}/> Dark</button>
            </div>
          </Group>
          <Group label="Currency symbol">
            <input className="input" style={{ width: 100 }} value={s.currency} maxLength={3} onChange={e => set({ currency: e.target.value })}/>
          </Group>
          <Group label="Data">
            <div style={{ display: 'flex', gap: 8 }}>
              <Button icon={<ICONS.Download/>} onClick={() => { exportCsv(state.transactions, state.categories); pushToast({ msg: 'Exported dollaz-transactions.csv' }); }}>Export CSV</Button>
              <Button variant="danger" icon={<ICONS.Trash/>} onClick={() => setConfirmReset(true)}>Reset all data</Button>
            </div>
          </Group>
        </div>
        <div className="modal-foot"><Button variant="ghost" onClick={onClose}>Close</Button></div>
      </div>
      <window.ConfirmModal open={confirmReset} title="Reset all data"
        body="Deletes every transaction, category and rule, and reloads the app. This cannot be undone."
        confirmLabel="Reset" onConfirm={() => { localStorage.removeItem(window.DZStorageKey); location.reload(); }} onClose={() => setConfirmReset(false)}/>
    </div>
  );
}

function Group({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function HelpPanel({ routeName, onClose }) {
  const TITLES = { dashboard: 'Dashboard', import: 'Import', transactions: 'Transactions', analysis: 'Analysis', categories: 'Categories & rules' };
  const body = (window.HELP || {})[routeName] || '';
  React.useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 39 }}/>
      <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '92vw', background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ICONS.Help size={16}/><h2 style={{ fontSize: 14, fontWeight: 600, flex: 1, margin: 0 }}>Help · {TITLES[routeName] || ''}</h2>
          <button className="btn ghost sm icon" onClick={onClose}><ICONS.X size={14}/></button>
        </div>
        <div style={{ padding: '8px 20px 24px', overflowY: 'auto', fontSize: 13.5, lineHeight: 1.55 }}>
          {body ? renderMarkdown(body) : <p style={{ color: 'var(--text-muted)' }}>No help for this screen yet.</p>}
        </div>
      </aside>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
