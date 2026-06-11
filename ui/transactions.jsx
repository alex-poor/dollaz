// transactions.jsx — browse, search, filter and recategorise transactions.
const { ICONS, Button, Money, CatDot, EmptyState } = window;

const PAGE = 200;

function TransactionsScreen({ state, setState, pushHistory, pushToast, onImport }) {
  const { transactions, categories } = state;
  const [query, setQuery] = React.useState('');
  const [catFilter, setCatFilter] = React.useState('all'); // all | uncat | <categoryId>
  const [limit, setLimit] = React.useState(PAGE);

  const catMap = React.useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toUpperCase();
    let rows = transactions;
    if (q) rows = rows.filter(t => (t.raw || t.description).toUpperCase().includes(q));
    if (catFilter === 'uncat') rows = rows.filter(t => !t.categoryId);
    else if (catFilter !== 'all') rows = rows.filter(t => t.categoryId === catFilter);
    return [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [transactions, query, catFilter]);

  const recategorise = (txnId, categoryId) => {
    pushHistory();
    setState(s => ({ ...s, transactions: s.transactions.map(t => t.id === txnId ? { ...t, categoryId: categoryId || null } : t) }));
  };

  React.useEffect(() => { setLimit(PAGE); }, [query, catFilter]);

  if (!transactions.length) {
    return <div className="content"><EmptyState icon={<ICONS.List size={48}/>} title="No transactions yet" body="Import a bank CSV to populate your ledger." action={<Button variant="primary" icon={<ICONS.Import/>} onClick={onImport}>Import a CSV</Button>}/></div>;
  }

  const shown = filtered.slice(0, limit);

  return (
    <div className="content">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Transactions</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{window.fmtNumber(filtered.length)} of {window.fmtNumber(transactions.length)} shown</div>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}><ICONS.Search size={15}/></span>
          <input className="input" style={{ paddingLeft: 32, width: 240 }} placeholder="Search description…" value={query} onChange={e => setQuery(e.target.value)}/>
        </div>
        <select className="input" style={{ width: 'auto' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">All categories</option>
          <option value="uncat">Uncategorised</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Date</th><th>Description</th><th>Account</th><th className="num">Amount</th><th>Category</th></tr></thead>
            <tbody>
              {shown.map(t => (
                <tr key={t.id}>
                  <td className="num" style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{window.fmtDate(t.date)}</td>
                  <td><div style={{ fontWeight: 500 }}>{t.description}</div>{t.raw && t.raw !== t.description && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.raw}</div>}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{t.account || '—'}</td>
                  <td className="num"><Money value={t.amount} colorSign/></td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <CatDot color={catMap.get(t.categoryId)?.color || '#9aa0a6'}/>
                      <select className="input" style={{ fontSize: 12.5, padding: '3px 6px', width: 'auto', border: t.categoryId ? '1px solid var(--border)' : '1px solid var(--amber)' }}
                        value={t.categoryId || ''} onChange={e => recategorise(t.id, e.target.value)}>
                        <option value="">Uncategorised</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {limit < filtered.length && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, filtered.length - limit)} more</Button>
        </div>
      )}
    </div>
  );
}

window.TransactionsScreen = TransactionsScreen;
