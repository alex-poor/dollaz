// app.jsx — shell + router + drawers + updater, wired to real persisted state.
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const { Icon, Button } = window;

  function exportCsv(transactions, categories) {
    const cat = new Map(categories.map(c => [c.id, c.name]));
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [['date', 'description', 'amount', 'category', 'account', 'raw'].join(',')];
    for (const t of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
      lines.push([t.date, esc(t.description), t.amount, esc(cat.get(t.categoryId) || ''), esc(t.account), esc(t.raw)].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dollaz-ledger.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- Brand mark — gilded heraldic sigils ---------- */
  function BrandMark({ variant }) {
    const g = 'var(--gold-bright)';
    const dollar = <path d="M24 11v26M31 17c0-3.4-3.1-5.4-7-5.4s-7 2.2-7 5c0 6.8 14 3.8 14 10.4 0 2.8-3.1 5-7 5s-7-2.2-7-5.4" />;
    let inner;
    if (variant === 'laurel') inner = (<g fill="none" stroke={g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dollar}<path d="M11 14c-4 3-4 13 1 19M9 19c1.5.5 3 .5 4.5 0M9.5 25c1.5.5 3 .5 4.5 0M11 31c1.5.2 3 0 4.5-.6" /><path d="M37 14c4 3 4 13-1 19M39 19c-1.5.5-3 .5-4.5 0M38.5 25c-1.5.5-3 .5-4.5 0M37 31c-1.5.2-3 0-4.5-.6" /></g>);
    else if (variant === 'blade') inner = (<g fill="none" stroke={g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dollar}<path d="M24 4 19 10h10zM16 11h16" strokeWidth="1.6" /><path d="M24 40l-3.5-4h7z" strokeWidth="1.6" /></g>);
    else if (variant === 'ornament') inner = (<g fill="none" stroke={g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dollar}<path d="M24 3c-3 3-3 6 0 8 3-2 3-5 0-8zM24 45c-3-3-3-6 0-8 3 2 3 5 0 8z" strokeWidth="1.5" /><path d="M3 24c3-3 6-3 8 0-2 3-5 3-8 0zM45 24c-3-3-6-3-8 0 2 3 5 3 8 0z" strokeWidth="1.5" /></g>);
    else inner = (<g fill="none" stroke={g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="24" r="21" strokeWidth="1.5" /><circle cx="24" cy="24" r="17" strokeWidth="0.9" opacity="0.6" />{dollar}<circle cx="24" cy="3.5" r="1.3" fill={g} stroke="none" /><circle cx="24" cy="44.5" r="1.3" fill={g} stroke="none" /><circle cx="3.5" cy="24" r="1.3" fill={g} stroke="none" /><circle cx="44.5" cy="24" r="1.3" fill={g} stroke="none" /></g>);
    return <span className="brand-mark"><svg width="46" height="46" viewBox="0 0 48 48">{inner}</svg></span>;
  }

  function Sprig({ className }) {
    const leaves = [];
    for (let i = 0; i < 8; i++) { const y = 210 - i * 25, dir = i % 2 === 0 ? 1 : -1; leaves.push(<path key={i} d={`M100 ${y} C ${100 + dir * 10} ${y - 7} ${100 + dir * 44} ${y - 15} ${100 + dir * 56} ${y - 2} C ${100 + dir * 42} ${y + 9} ${100 + dir * 15} ${y + 7} 100 ${y} Z`} />); }
    return (<div className={className} aria-hidden="true"><svg viewBox="0 0 200 240" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%"><path d="M100 238 C100 175 100 110 100 22" /><path d="M100 22 C96 14 97 6 100 0 C103 6 104 14 100 22 Z" />{leaves}</svg></div>);
  }

  const NAV = [
    { id: 'dashboard', label: 'Sanctum', icon: 'dashboard' },
    { id: 'accounts', label: 'Vaults', icon: 'wallet' },
    { id: 'transactions', label: 'The Ledger', icon: 'transactions' },
    { id: 'analysis', label: 'Auguries', icon: 'analysis' },
    { id: 'categories', label: 'Sigils', icon: 'tag' },
  ];

  function Sidebar({ route, go, t, uncat, version, update, onUpdate, onCheck, checking }) {
    return (
      <aside className="sidebar">
        <div className="brand">
          <BrandMark variant={t.brandMark} />
          <div><div className="brand-name">Dollaz</div><div className="brand-sub">A reckoning of coin</div></div>
        </div>
        <button className="btn primary" style={{ margin: '0 var(--s2) var(--s2)', justifyContent: 'center' }} onClick={() => go('import')}>
          <Icon name="importIcon" size={17} />Summon records
        </button>
        {NAV.map((n) => (
          <button key={n.id} className={'nav-item' + (route === n.id ? ' active' : '')} onClick={() => go(n.id)}>
            <Icon name={n.icon} /><span className="nav-label">{n.label}</span>
            {n.id === 'transactions' && uncat > 0 ? <span className="badge warn">{uncat}</span> : null}
          </button>
        ))}
        <div className="sidebar-foot">
          <div className="local-note"><Icon name="lock" size={15} />Bound to this vessel alone</div>
          {update ? (
            <button className="update-pill" onClick={onUpdate}><Icon name="download" size={15} />A newer rite stirs</button>
          ) : window.ffUpdate?.inTauri ? (
            <button className="btn ghost sm" style={{ width: '100%', marginTop: 6 }} onClick={onCheck}>{checking ? 'Scrying…' : 'Scry for updates'}</button>
          ) : null}
          <div className="ver num">{version ? 'v' + version : 'dev build'}</div>
        </div>
      </aside>
    );
  }

  function Topbar({ onSettings, onHelp, undo, redo, canUndo, canRedo, saving }) {
    return (
      <header className="topbar">
        <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Icon name="undo" /></button>
        <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"><Icon name="redo" /></button>
        <div className="spacer" />
        <div className={'save-pill' + (saving ? ' saving' : '')}><span className="dot" />{saving ? 'Inscribing…' : 'All entries inscribed'}</div>
        <button className="icon-btn" onClick={onHelp} title="The Codex"><Icon name="help" /></button>
        <button className="icon-btn" onClick={onSettings} title="Rites & Bindings"><Icon name="settings" /></button>
      </header>
    );
  }

  function Drawer({ title, onClose, children }) {
    useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
    return (<><div className="drawer-back" onClick={onClose} /><div className="drawer"><div className="drawer-head"><h3 style={{ fontSize: '1.15rem' }}>{title}</h3><button className="icon-btn" onClick={onClose}><Icon name="x" /></button></div><div className="drawer-body">{children}</div></div></>);
  }

  const MOODS = ['#c9a23f', '#c0473f', '#5fae84', '#8f6fb5'];
  function SettingsBody({ state, setState, pushToast }) {
    const tw = state.settings.tweaks;
    const setTweak = (patch) => setState(s => ({ ...s, settings: { ...s.settings, tweaks: { ...s.settings.tweaks, ...patch } } }));
    const setCurrency = (v) => setState(s => ({ ...s, settings: { ...s.settings, currency: v } }));
    const [confirmReset, setConfirmReset] = useState(false);
    return (
      <div className="grid" style={{ gap: 'var(--s6)' }}>
        <div className="field"><label>Sigil of coin</label><input className="input" value={state.settings.currency} maxLength={3} style={{ maxWidth: 100 }} onChange={e => setCurrency(e.target.value)} /><span className="hint">Figures graven in monospace, tabular</span></div>
        <hr className="divider" />
        <div>
          <div className="nav-section" style={{ padding: '0 0 var(--s2)' }}>Gilding</div>
          <div className="row" style={{ gap: 10 }}>
            {MOODS.map(m => <button key={m} onClick={() => setTweak({ mood: m })} title="Humour" style={{ width: 28, height: 28, borderRadius: 6, background: m, border: tw.mood === m ? '2px solid var(--text-strong)' : '2px solid transparent', cursor: 'pointer' }} />)}
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}><span>Ash &amp; grain</span><Toggle on={tw.grain} onChange={v => setTweak({ grain: v })} /></div>
        <div className="row" style={{ justifyContent: 'space-between' }}><span>Gilded frames</span><Toggle on={tw.gilt} onChange={v => setTweak({ gilt: v })} /></div>
        <div className="field"><label>Sigil mark</label>
          <select className="input" value={tw.brandMark} onChange={e => setTweak({ brandMark: e.target.value })}>
            {['seal', 'laurel', 'blade', 'ornament'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="field"><label>The flow (chart)</label>
          <div className="seg"><button className={tw.chartStyle === 'net' ? 'active' : ''} onClick={() => setTweak({ chartStyle: 'net' })}>With net line</button><button className={tw.chartStyle === 'bars' ? 'active' : ''} onClick={() => setTweak({ chartStyle: 'bars' })}>Bars only</button></div>
        </div>
        <hr className="divider" />
        <Button iconName="download" onClick={() => { exportCsv(state.transactions, state.categories); pushToast('The ledger is cast out (CSV)'); }}>Cast out the ledger (CSV)</Button>
        <Button variant="danger" iconName="trash" onClick={() => setConfirmReset(true)}>Consign all to oblivion</Button>
        {confirmReset && (
          <div className="modal-back" onClick={() => setConfirmReset(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-head"><h3 style={{ fontSize: '1.1rem' }}>Consign all to oblivion?</h3></div>
              <div className="modal-body"><p style={{ margin: 0, color: 'var(--text-muted)' }}>Every inscription, sigil, incantation and vault is unmade, and the sanctum reborn. This cannot be undone.</p></div>
              <div className="modal-foot"><Button variant="ghost" onClick={() => setConfirmReset(false)}>Spare it</Button><Button variant="danger" onClick={() => { localStorage.removeItem(window.DZStorageKey); location.reload(); }}>Consign</Button></div>
            </div>
          </div>
        )}
      </div>
    );
  }
  function Toggle({ on, onChange }) {
    return <button onClick={() => onChange(!on)} style={{ width: 42, height: 24, borderRadius: 100, border: '1px solid var(--border-strong)', background: on ? 'var(--accent)' : 'var(--surface-2)', position: 'relative', cursor: 'pointer' }}><span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: on ? 'var(--bg)' : 'var(--text-dim)', transition: 'left 0.15s' }} /></button>;
  }

  function HelpBody() {
    const topics = [
      ['Summoning records', 'Cast a CSV, OFX or QIF scroll into the circle. What you summon is bound to thine own, and its twins cast out.'],
      ['Sigils & incantations', 'Incantations name each inscription by the merchant-marks it bears. Recast one to re-bind the whole history.'],
      ['Vaults', 'Bind daily coffers, reserves, the long slumber, and debt-bonds alike. Their balances pool into a single reckoning.'],
      ['Prophecy', 'Foretellings draw upon thy trailing mean, or thy drift. They re-reckon the instant thou bestow’st a sigil.'],
    ];
    return <div className="grid" style={{ gap: 'var(--s5)' }}>{topics.map(([h, b], i) => <div key={i}><div style={{ fontWeight: 700, color: 'var(--text-strong)', marginBottom: 3 }}>{h}</div><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>{b}</p></div>)}</div>;
  }

  function UpdateModal({ info, status, progress, msg, onClose, onInstall }) {
    return (
      <div className="modal-back" onClick={() => status !== 'downloading' && onClose()}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head"><h3 style={{ fontSize: '1.15rem' }}>A newer rite stirs — v{info.version}</h3></div>
          <div className="modal-body">
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>{`Thou bearest v${info.currentVersion}. This rite downloads, installs, and rouses Dollaz anew. Thy records never leave this vessel.`}</p>
            {status === 'downloading' && <div style={{ marginTop: 14 }}><div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>{msg || 'Summoning…'}</div><div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 100, overflow: 'hidden' }}><div style={{ height: '100%', width: progress + '%', background: 'var(--accent)' }} /></div></div>}
            {status === 'error' && <div style={{ marginTop: 12, color: 'var(--neg)', fontSize: '0.88rem' }}>{msg}</div>}
          </div>
          <div className="modal-foot"><Button variant="ghost" disabled={status === 'downloading'} onClick={onClose}>Not yet</Button><Button variant="primary" disabled={status === 'downloading'} onClick={onInstall}>Enact the rite</Button></div>
        </div>
      </div>
    );
  }

  function App() {
    const [state, setState] = useState(() => window.makeInitialState());
    const [route, setRoute] = useState('dashboard');
    const [drawer, setDrawer] = useState(null);
    const [saving, setSaving] = useState(false);
    const { toasts, push: pushToast } = window.useToasts();
    const history = window.useHistory(state, setState);

    // Derive the screens' DATA from state (memoised; mutates the stable window.DATA).
    useMemo(() => window.refreshData(state), [state]);

    const tw = state.settings.tweaks;

    // Apply theme + atmosphere + currency.
    useEffect(() => { document.documentElement.setAttribute('data-theme', 'dark'); }, []);
    useEffect(() => {
      const el = document.documentElement, v = tw.mood;
      el.style.setProperty('--gold', v);
      el.style.setProperty('--gold-bright', `color-mix(in srgb, ${v} 68%, white)`);
      el.style.setProperty('--gold-dim', `color-mix(in srgb, ${v} 52%, black)`);
      el.style.setProperty('--accent', v); el.style.setProperty('--teal', v);
      el.style.setProperty('--accent-hover', `color-mix(in srgb, ${v} 68%, white)`);
      el.style.setProperty('--teal-ink', `color-mix(in srgb, ${v} 68%, white)`);
    }, [tw.mood]);
    useEffect(() => { document.documentElement.classList.toggle('no-grain', !tw.grain); }, [tw.grain]);
    useEffect(() => { document.documentElement.classList.toggle('gilt', tw.gilt); }, [tw.gilt]);
    useEffect(() => { window.setCurrencySymbol(state.settings.currency || '$'); }, [state.settings.currency]);

    // Autosave
    useEffect(() => { setSaving(true); const t = setTimeout(() => { window.saveState(state); setSaving(false); }, 300); return () => clearTimeout(t); }, [state]);

    // Keyboard undo/redo
    useEffect(() => {
      const onKey = (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (history.undo()) pushToast('Undone'); }
        else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); if (history.redo()) pushToast('Redone'); }
      };
      window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
    }, [history, pushToast]);

    // Version + updater
    const [version, setVersion] = useState(null);
    useEffect(() => { let c = false; window.ffApp?.getVersion?.().then(v => { if (!c && v) setVersion(v); }); return () => { c = true; }; }, []);
    const [update, setUpdate] = useState(null);
    const [updateOpen, setUpdateOpen] = useState(false);
    const [uStatus, setUStatus] = useState('idle');
    const [uProgress, setUProgress] = useState(0);
    const [uMsg, setUMsg] = useState('');
    const [checking, setChecking] = useState(false);
    const checkUpdate = useCallback(async (silent) => {
      if (!window.ffUpdate) return;
      setChecking(true); const res = await window.ffUpdate.checkForUpdate(); setChecking(false);
      if (res.available) { setUpdate(res); setUpdateOpen(true); }
      else if (!silent) pushToast(res.reason === 'browser' ? 'Updates only stir in the desktop vessel' : res.error ? 'The scrying failed' : 'Thou bearest the latest rite');
    }, [pushToast]);
    useEffect(() => { if (!window.ffUpdate?.inTauri) return; const i = setTimeout(() => checkUpdate(true), 1500); const v = setInterval(() => checkUpdate(true), 30 * 60 * 1000); return () => { clearTimeout(i); clearInterval(v); }; }, [checkUpdate]);
    const install = async () => {
      setUStatus('downloading'); setUProgress(0); setUMsg('Summoning…');
      try {
        await window.ffUpdate.downloadAndInstall(update, ({ phase, downloaded, total }) => {
          if (phase === 'Started') setUMsg('Summoning…');
          else if (phase === 'Progress' && total) setUProgress(Math.min(100, Math.round((downloaded / total) * 100)));
          else if (phase === 'Finished') setUMsg('Binding…');
        });
      } catch (err) { setUStatus('error'); setUMsg(String(err?.message || err)); }
    };

    const go = (r) => setRoute(r);
    const app = { state, setState, pushHistory: history.push, pushToast };
    const D = window.DATA;
    const Screen = window[route.charAt(0).toUpperCase() + route.slice(1)] || window.Dashboard;

    return (
      <div className="app" data-screen-label={route}>
        <Sprig className="watermark" /><Sprig className="watermark left" />
        <Sidebar route={route} go={go} t={tw} uncat={D.uncatCount} version={version}
          update={update} onUpdate={() => setUpdateOpen(true)} onCheck={() => checkUpdate(false)} checking={checking} />
        <div className="main">
          <Topbar onSettings={() => setDrawer('settings')} onHelp={() => setDrawer('help')}
            undo={() => history.undo() && pushToast('Undone')} redo={() => history.redo() && pushToast('Redone')}
            canUndo={history.canUndo()} canRedo={history.canRedo()} saving={saving} />
          <Screen t={tw} go={go} toast={pushToast} app={app} key={route} />
        </div>

        {drawer === 'settings' && <Drawer title="Rites &amp; Bindings" onClose={() => setDrawer(null)}><SettingsBody state={state} setState={setState} pushToast={pushToast} /></Drawer>}
        {drawer === 'help' && <Drawer title="The Codex" onClose={() => setDrawer(null)}><HelpBody /></Drawer>}
        {update && updateOpen && <UpdateModal info={update} status={uStatus} progress={uProgress} msg={uMsg} onClose={() => setUpdateOpen(false)} onInstall={install} />}

        {toasts.length > 0 && (
          <div className="toast-stack">{toasts.map((x) => <div key={x.id} className="toast"><Icon name="check" size={16} style={{ color: 'var(--pos)' }} />{x.msg}</div>)}</div>
        )}
      </div>
    );
  }

  window.App = App;
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
