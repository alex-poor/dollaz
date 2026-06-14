// transactions.jsx — The Ledger. Searchable, filterable; inline re-sigil.
(function () {
  const { useState } = React;
  const { Money, Button, CatDot, Icon, EmptyState } = window;
  const D = window.DATA;

  function Transactions({ go, app }) {
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState('all');
    const [limit, setLimit] = useState(40);
    const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
    const cats = D.CATS;

    if (!D.TXNS.length) {
      return <div className="content"><EmptyState iconName="transactions" title="The ledger is bare" action={<Button variant="primary" iconName="importIcon" onClick={() => go('import')}>Summon records</Button>}>No inscriptions yet. Summon a bank scroll to fill the ledger.</EmptyState></div>;
    }

    const acctName = (id) => (D.ACCOUNTS.find((a) => a.id === id) || {}).name || (id || '—');
    const sigilName = (r) => r.transfer ? '￿' : r.categoryId ? (D.catById[r.categoryId]?.name || '￾') : '￾'; // transfers last, unnamed before named
    const KEYFN = {
      date: (r) => r.date, desc: (r) => (r.description || '').toLowerCase(),
      vault: (r) => acctName(r.account).toLowerCase(), sum: (r) => Math.abs(r.amount),
      sigil: (r) => sigilName(r).toLowerCase(),
    };
    const DEFAULT_DIR = { date: 'desc', desc: 'asc', vault: 'asc', sum: 'desc', sigil: 'asc' };
    const onSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: DEFAULT_DIR[key] });

    let rows = D.TXNS;
    if (q) rows = rows.filter((r) => (r.description + ' ' + r.raw).toLowerCase().includes(q.toLowerCase()));
    if (filter === 'uncat') rows = rows.filter((r) => !r.categoryId && !r.transfer);
    else if (filter === 'transfer') rows = rows.filter((r) => r.transfer);
    else if (filter !== 'all') rows = rows.filter((r) => r.categoryId === filter && !r.transfer);
    const keyfn = KEYFN[sort.key];
    rows = [...rows].sort((a, b) => {
      const va = keyfn(a), vb = keyfn(b);
      let c = va < vb ? -1 : va > vb ? 1 : 0;
      if (c === 0) c = b.date.localeCompare(a.date) || b.id.localeCompare(a.id); // stable tiebreak: newest first
      else if (sort.dir === 'desc') c = -c;
      return c;
    });
    const shown = rows.slice(0, limit);

    function Th({ k, label, num, width }) {
      const active = sort.key === k;
      return (
        <th className={num ? 'num' : ''} style={{ width, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }} onClick={() => onSort(k)} title="Sort by this column">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: active ? 'var(--gold)' : 'inherit' }}>
            {label}<Icon name={active ? (sort.dir === 'asc' ? 'arrowUp' : 'arrowDown') : 'arrowDown'} size={12} style={{ opacity: active ? 0.9 : 0.25 }} />
          </span>
        </th>
      );
    }

    const reSigil = (txnId, value) => {
      app.pushHistory();
      app.setState(s => ({ ...s, transactions: s.transactions.map(t => {
        if (t.id !== txnId) return t;
        if (value === '__transfer__') return { ...t, transfer: true };
        return { ...t, transfer: false, categoryId: value || null };
      }) }));
    };

    const reconcile = () => {
      app.pushHistory();
      app.setState(s => ({ ...s, transactions: window.DZ.markTransfers(s.transactions).transactions }));
      app.pushToast(D.transferSuggested ? `${D.transferSuggested} transfers cast out of the reckoning` : 'No new transfers found');
    };

    return (
      <div className="content wide">
        <div className="page-head">
          <div><div className="page-title">The Ledger</div><div className="page-meta"><span className="num">{D.TXNS.length}</span> inscribed · <span className="num">{D.uncatCount}</span> yet unnamed{D.transferCount ? <> · <span className="num">{D.transferCount}</span> transfers set apart</> : null}</div></div>
          {D.transferSuggested > 0 && <Button iconName="refresh" onClick={reconcile} title="Detect transfers between your vaults and exclude them from income/expense"><span className="num">{D.transferSuggested}</span> transfers to reconcile</Button>}
        </div>
        <div className="row" style={{ marginBottom: 'var(--s5)', gap: 'var(--s3)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}><Icon name="search" size={17} /></span>
            <input className="input" placeholder="Seek among the inscriptions…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          <div className="seg">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'uncat' ? 'active' : ''} onClick={() => setFilter('uncat')} style={filter === 'uncat' ? {} : { color: 'var(--amber)' }}>Unnamed</button>
            <button className={filter === 'transfer' ? 'active' : ''} onClick={() => setFilter('transfer')}>Transfers</button>
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><Th k="date" label="When" width={90} /><Th k="desc" label="Inscription" /><Th k="vault" label="Vault" width={130} /><Th k="sum" label="Sum" num width={130} /><Th k="sigil" label="Sigil" width={220} /></tr></thead>
              <tbody>
                {shown.map((r) => {
                  const cat = r.categoryId ? D.catById[r.categoryId] : null;
                  const isTransfer = !!r.transfer;
                  const isUncat = !r.categoryId && !isTransfer;
                  const border = isTransfer ? 'var(--border-strong)' : isUncat ? 'color-mix(in srgb, var(--amber) 40%, transparent)' : 'var(--border)';
                  return (
                    <tr key={r.id} style={isTransfer ? { opacity: 0.62 } : null}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }} className="num">{window.fmtDate(r.date)}</td>
                      <td><div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{r.description}</div>{r.raw && r.raw !== r.description && <div className="desc-raw">{r.raw}</div>}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{acctName(r.account)}</td>
                      <td className="num" style={{ fontWeight: 600, color: isTransfer ? 'var(--text-dim)' : r.amount > 0 ? 'var(--pos)' : 'var(--text-strong)' }}>{window.fmtCurrency(r.amount, { sign: r.amount > 0 })}</td>
                      <td>
                        <span className={'cat-pill' + (isUncat ? ' unmapped' : '')} style={{ position: 'relative', border: '1px solid ' + border }}>
                          {isTransfer ? <span style={{ color: 'var(--text-muted)' }}>⇄</span> : isUncat ? <Icon name="alert" size={13} /> : <CatDot color={cat ? cat.color : '#9aa0a6'} />}
                          <span style={{ color: isTransfer ? 'var(--text-muted)' : isUncat ? 'var(--amber)' : 'inherit' }}>{isTransfer ? 'Transfer' : isUncat ? 'Unnamed' : cat.name}</span>
                          <Icon name="chevronDown" size={13} style={{ opacity: 0.5, marginLeft: 2 }} />
                          <select value={isTransfer ? '__transfer__' : (r.categoryId || '')} onChange={(e) => reSigil(r.id, e.target.value)}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
                            <option value="">Unnamed</option>
                            <option value="__transfer__">⇄ Transfer (between vaults)</option>
                            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {limit < rows.length && <div style={{ padding: 'var(--s4)', textAlign: 'center', borderTop: '1px solid var(--border)' }}><Button variant="ghost" onClick={() => setLimit((l) => l + 40)}>Unearth more <span className="num" style={{ color: 'var(--text-dim)' }}>({rows.length - limit})</span></Button></div>}
        </div>
      </div>
    );
  }
  window.Transactions = Transactions;
})();
