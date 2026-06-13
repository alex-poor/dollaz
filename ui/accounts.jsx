// accounts.jsx — The Vaults. Per-account cards by kind + net worth + CRUD.
(function () {
  const { useState } = React;
  const { Money, Button, Sparkline, LineChart, Icon, EmptyState } = window;
  const D = window.DATA;

  const KIND_META = {
    spending: { label: 'Daily coffer', icon: 'card', color: '#c9a23f' },
    saving: { label: 'Reserve', icon: 'piggy', color: '#5a5bb0' },
    credit: { label: 'Debt-bond', icon: 'card', color: '#c47a3f' },
    retire: { label: 'The long sleep', icon: 'growth', color: '#5fae84' },
  };
  const rid = () => 'a-' + Math.random().toString(36).slice(2, 8);
  const mask = (id) => '•• ' + String(id).slice(-4);

  // inflow/outflow for an account in the latest month
  function monthFlow(accId) {
    const ym = D.YMS[D.YMS.length - 1];
    let inn = 0, out = 0;
    for (const t of D.TXNS) { if (t.account !== accId) continue; if (ym && t.date.slice(0, 7) !== ym) continue; if (t.amount >= 0) inn += t.amount; else out += -t.amount; }
    return { inn, out };
  }

  function Meter({ pct, color }) { return <div className="meter"><span style={{ width: Math.min(100, Math.max(0, pct)) + '%', background: color }} /></div>; }

  function AccountCard({ a, onEdit }) {
    const accentBg = `color-mix(in srgb, ${a.color} 16%, var(--surface))`;
    let detail = null;
    if (a.kind === 'spending') {
      const { inn, out } = monthFlow(a.id);
      detail = <div className="row" style={{ gap: 'var(--s6)', marginTop: 'var(--s4)' }}><div><div className="stat-label" style={{ fontSize: '0.78rem' }}>Gathered · moon</div><Money value={inn} compact className="num" style={{ fontWeight: 700, color: 'var(--pos)' }} /></div><div><div className="stat-label" style={{ fontSize: '0.78rem' }}>Devoured · moon</div><Money value={-out} compact className="num" style={{ fontWeight: 700, color: 'var(--neg)' }} /></div></div>;
    } else if (a.kind === 'saving') {
      const pct = a.goal ? Math.round((a.balance / a.goal) * 100) : null;
      detail = <div style={{ marginTop: 'var(--s4)' }}>{a.goal ? <><div className="row" style={{ justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Vow · {window.fmtCurrency(a.goal, { compact: true })}</span><span className="num" style={{ color: a.color, fontWeight: 700 }}>{pct}%</span></div><Meter pct={pct} color={a.color} /></> : null}{a.rate ? <div className="row" style={{ gap: 'var(--s5)', marginTop: 12 }}><span className="chip pos"><Icon name="trendUp" size={13} />{a.rate}% p.a.</span></div> : null}</div>;
    } else if (a.kind === 'credit') {
      const used = Math.abs(a.balance), pct = a.limit ? Math.round((used / a.limit) * 100) : null;
      detail = <div style={{ marginTop: 'var(--s4)' }}>{a.limit ? <><div className="row" style={{ justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Bound · {window.fmtCurrency(a.limit, { compact: true })}</span><span className="num" style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{pct}% spent</span></div><Meter pct={pct} color={pct > 70 ? 'var(--neg)' : 'var(--amber)'} /></> : null}<div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: 12 }}><Money value={Math.abs(a.balance)} className="num" /> owed</div></div>;
    } else if (a.kind === 'retire') {
      detail = <div style={{ marginTop: 'var(--s2)' }}><div className="row" style={{ gap: 'var(--s6)', marginTop: 10 }}>{a.returns12 != null ? <div><div className="stat-label" style={{ fontSize: '0.78rem' }}>Twelve-moon yield</div><span className="num" style={{ fontWeight: 700, color: a.returns12 >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{a.returns12 >= 0 ? '+' : ''}{a.returns12}%</span></div> : null}{a.contrib != null ? <div><div className="stat-label" style={{ fontSize: '0.78rem' }}>Offering</div><span className="num" style={{ fontWeight: 700, color: 'var(--text-strong)' }}>{a.contrib}%</span></div> : null}</div></div>;
    }
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-body">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="row" style={{ gap: 12 }}><span className="acct-icon" style={{ background: accentBg, color: a.color }}><Icon name={a.icon} /></span><div><div style={{ fontWeight: 700, color: 'var(--text-strong)', fontSize: '1.05rem', lineHeight: 1.2 }}>{a.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{a.inst}{a.num ? ' · ' + a.num : ''}</div></div></div>
            <button className="icon-btn" onClick={() => onEdit(a)}><Icon name="dots" size={18} /></button>
          </div>
          <Money value={a.balance} className="num" style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', color: a.balance < 0 ? 'var(--neg)' : 'var(--text-strong)', display: 'block', marginTop: 14 }} />
          {a.balanceDate && <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: 2 }}>balance as of {window.fmtDate(a.balanceDate)}</div>}
          {detail}
        </div>
      </div>
    );
  }

  function VaultModal({ initial, onClose, onSave, onDelete }) {
    const [v, setV] = useState(initial);
    const set = (patch) => setV(x => ({ ...x, ...patch }));
    const num = (s) => { const n = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; };
    return (
      <div className="modal-back" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-head"><h3 style={{ fontSize: '1.1rem' }}>{initial.id ? 'Amend the vault' : 'Bind a vault'}</h3></div>
        <div className="modal-body grid" style={{ gap: 'var(--s4)' }}>
          <div className="field"><label>Name</label><input className="input" autoFocus value={v.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Daily Coffer" /></div>
          <div className="field"><label>Institution</label><input className="input" value={v.inst} onChange={e => set({ inst: e.target.value })} placeholder="e.g. ASB Streamline" /></div>
          <div className="grid grid-2" style={{ gap: 'var(--s4)' }}>
            <div className="field"><label>Kind</label><select className="input" value={v.kind} onChange={e => { const k = e.target.value; set({ kind: k, icon: KIND_META[k].icon, color: v._autoColor ? KIND_META[k].color : v.color }); }}>{Object.keys(KIND_META).map(k => <option key={k} value={k}>{KIND_META[k].label}</option>)}</select></div>
            <div className="field"><label>Balance</label><input className="input num" value={v.balance} onChange={e => set({ balance: e.target.value })} placeholder={v.kind === 'credit' ? '-1284.20' : '0.00'} /></div>
          </div>
          <div className="grid grid-2" style={{ gap: 'var(--s4)' }}>
            {v.kind === 'saving' && <><div className="field"><label>Vow (goal)</label><input className="input num" value={v.goal ?? ''} onChange={e => set({ goal: e.target.value })} /></div><div className="field"><label>Rate % p.a.</label><input className="input num" value={v.rate ?? ''} onChange={e => set({ rate: e.target.value })} /></div></>}
            {v.kind === 'credit' && <div className="field"><label>Limit</label><input className="input num" value={v.limit ?? ''} onChange={e => set({ limit: e.target.value })} /></div>}
            {v.kind === 'retire' && <><div className="field"><label>12-moon yield %</label><input className="input num" value={v.returns12 ?? ''} onChange={e => set({ returns12: e.target.value })} /></div><div className="field"><label>Offering %</label><input className="input num" value={v.contrib ?? ''} onChange={e => set({ contrib: e.target.value })} /></div></>}
            <div className="field"><label>Mask (optional)</label><input className="input" value={v.num || ''} onChange={e => set({ num: e.target.value })} placeholder="•• 4021" /></div>
          </div>
        </div>
        <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
          <div>{initial.id && <Button variant="danger" iconName="trash" onClick={() => onDelete(initial.id)}>Unbind</Button>}</div>
          <div className="row" style={{ gap: 8 }}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { if (!v.name.trim()) return; onSave({ ...v, balance: num(v.balance) || 0, goal: num(v.goal), rate: num(v.rate), limit: num(v.limit), returns12: num(v.returns12), contrib: num(v.contrib) }); }}>{initial.id ? 'Amend' : 'Bind'}</Button></div>
        </div>
      </div></div>
    );
  }

  function Accounts({ go, app }) {
    const { setState, pushHistory, pushToast } = app;
    const [modal, setModal] = useState(null);
    const nw = D.NETWORTH;
    const cur = nw.length ? nw[nw.length - 1].value : D.acctTotal;
    const prev = nw.length > 1 ? nw[nw.length - 2].value : cur;
    const unlinked = D.unlinkedAccountIds || [];

    const blank = () => ({ name: '', inst: '', kind: 'spending', balance: '', icon: 'card', color: KIND_META.spending.color, _autoColor: true, num: '' });
    const save = (acc) => { pushHistory(); setState(s => acc.id ? { ...s, accounts: s.accounts.map(a => a.id === acc.id ? acc : a) } : { ...s, accounts: [...s.accounts, { ...acc, id: rid() }] }); setModal(null); };
    const del = (id) => { pushHistory(); setState(s => ({ ...s, accounts: s.accounts.filter(a => a.id !== id) })); setModal(null); };
    const deriveVaults = () => {
      pushHistory();
      setState(s => {
        const have = new Set(s.accounts.map(a => a.id));
        const add = (window.DATA.unlinkedAccountIds || []).filter(id => !have.has(id)).map(id => ({ id, name: 'Vault ' + mask(id), inst: '', kind: 'spending', balance: 0, color: KIND_META.spending.color, icon: 'card', num: mask(id), auto: true }));
        return { ...s, accounts: [...s.accounts, ...add] };
      });
      pushToast('Vaults derived from the ledger — set their balances, or re-import to sync');
    };

    return (
      <div className="content wide">
        <div className="page-head">
          <div><div className="page-title">The Vaults</div><div className="page-meta">All thou hoardest, gathered in one ledger</div></div>
          <div className="row" style={{ gap: 'var(--s3)' }}>
            {unlinked.length > 0 && <Button iconName="wallet" onClick={deriveVaults}>Derive <span className="num">{unlinked.length}</span> from the ledger</Button>}
            <Button iconName="plus" onClick={() => setModal(blank())}>Bind a vault</Button>
          </div>
        </div>

        {D.ACCOUNTS.length === 0 ? (
          <EmptyState iconName="wallet" title="No vaults yet bound" action={<div className="row" style={{ gap: 'var(--s3)', justifyContent: 'center' }}>{unlinked.length > 0 && <Button variant="primary" iconName="wallet" onClick={deriveVaults}>Derive {unlinked.length} from the ledger</Button>}<Button variant={unlinked.length ? '' : 'primary'} iconName="plus" onClick={() => setModal(blank())}>Bind a vault</Button></div>}>
            {unlinked.length > 0
              ? 'Thy imported scrolls already name their accounts. Derive vaults from them in one stroke — OFX imports will keep their balances synced — or bind one by hand.'
              : 'Vaults appear on their own when thou summon’st OFX scrolls (their balances sync each import). Bind one by hand for what thou dost not import — a KiwiSaver, say.'}
          </EmptyState>
        ) : (
          <div className="grid" style={{ gap: 'var(--s5)' }}>
            <div className="card fade-up">
              <div className="card-head"><div><div className="stat-label" style={{ marginBottom: 4 }}><Icon name="shield" size={15} />The Sum of Thy Hoard</div><div className="row" style={{ gap: 'var(--s4)', alignItems: 'baseline', flexWrap: 'wrap' }}><Money value={D.acctTotal} className="num" style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, whiteSpace: 'nowrap' }} />{nw.length > 1 && <span className={'chip ' + (cur >= prev ? 'pos' : 'neg')}><Icon name={cur >= prev ? 'trendUp' : 'trendDown'} size={13} />{cur >= prev ? '+' : '−'}<Money value={Math.abs(cur - prev)} compact className="num" /> this moon</span>}</div></div></div>
              {nw.length > 1 && <div className="card-body"><LineChart series={[{ name: 'The hoard', color: 'var(--accent)', values: nw.map(x => x.value) }]} months={D.YMS} height={230} area /></div>}
            </div>
            <div className="card" style={{ background: 'var(--accent-soft)', border: 'none' }}><div className="card-body" style={{ padding: 'var(--s4) var(--s6)', display: 'flex', alignItems: 'center', gap: 12 }}><Icon name="categories" size={20} style={{ color: 'var(--teal-ink)', flex: 'none' }} /><div style={{ fontSize: '0.92rem', color: 'var(--teal-ink)' }}>Every sigil <strong>gathers its due across every vault</strong> — coin spent on provisions, whether by debt-bond or daily coffer, pools into a single reckoning.</div></div></div>
            <div className="grid grid-2">{D.ACCOUNTS.map((a) => <AccountCard key={a.id} a={a} onEdit={(acc) => setModal({ ...acc, _autoColor: false, goal: acc.goal ?? '', rate: acc.rate ?? '', limit: acc.limit ?? '', returns12: acc.returns12 ?? '', contrib: acc.contrib ?? '' })} />)}</div>
          </div>
        )}
        {modal && <VaultModal initial={modal} onClose={() => setModal(null)} onSave={save} onDelete={del} />}
      </div>
    );
  }
  window.Accounts = Accounts;
})();
