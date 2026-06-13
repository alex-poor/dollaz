// merchants.jsx — The Bazaar. Spend grouped by merchant/payee (mapped or not),
// ranked, searchable, with a trend. Answers "how much have I paid X?".
(function () {
  const { useState, useMemo } = React;
  const { Money, CatDot, Icon, Sparkline, EmptyState, Button } = window;
  const D = window.DATA;

  function Merchants({ go, app }) {
    const [q, setQ] = useState('');
    const rows = useMemo(() => window.DZ.merchantSummary(D.TXNS, app.state.rules, D.YMS), [D.TXNS, app.state.rules, D.YMS]);

    if (!D.hasData) {
      return <div className="content"><EmptyState iconName="coins" title="The bazaar is empty" action={<Button variant="primary" iconName="importIcon" onClick={() => go('import')}>Summon records</Button>}>Summon thy records, and every merchant thou hast paid shall be reckoned here.</EmptyState></div>;
    }

    const ql = q.trim().toLowerCase();
    const shown = ql ? rows.filter(r => r.label.toLowerCase().includes(ql)) : rows;
    const grandTotal = rows.reduce((s, r) => s + r.total, 0) || 1;
    const focusTotal = ql ? shown.reduce((s, r) => s + r.total, 0) : null;

    return (
      <div className="content wide">
        <div className="page-head">
          <div><div className="page-title">The Bazaar</div><div className="page-meta">Whom thou hast paid, and how dearly · <span className="num">{rows.length}</span> merchants</div></div>
        </div>

        <div className="row" style={{ marginBottom: 'var(--s5)', gap: 'var(--s3)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}><Icon name="search" size={17} /></span>
            <input className="input" placeholder="Seek a merchant…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          {ql && <div className="chip" style={{ alignSelf: 'center' }}>Paid to “{q}”: <Money value={focusTotal} className="num" style={{ fontWeight: 700, marginLeft: 6 }} /></div>}
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Merchant</th><th>Sigil</th><th className="num" style={{ width: 70 }}>Times</th><th style={{ width: 90 }}>Last</th><th style={{ width: 130 }}>Trend</th><th className="num" style={{ width: 130 }}>Spent</th></tr></thead>
              <tbody>
                {shown.slice(0, 250).map((r) => {
                  const cat = r.categoryId ? D.catById[r.categoryId] : null;
                  return (
                    <tr key={r.key}>
                      <td><div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{r.label}</div><div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>{Math.round((r.total / grandTotal) * 100)}% of all tolls</div></td>
                      <td>{cat ? <span className="cat-pill"><CatDot color={cat.color} />{cat.name}</span> : <span className="cat-pill unmapped"><Icon name="alert" size={13} />Unnamed</span>}</td>
                      <td className="num" style={{ color: 'var(--text-muted)' }}>{r.count}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{window.fmtDate(r.last)}</td>
                      <td><div style={{ width: 110 }}>{r.series.length > 1 ? <Sparkline values={r.series} color={cat ? cat.color : 'var(--text-dim)'} height={26} strokeWidth={1.6} /> : null}</div></td>
                      <td className="num" style={{ fontWeight: 700, color: 'var(--text-strong)' }}>{window.fmtCurrency(r.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {shown.length > 250 && <div style={{ padding: 'var(--s3)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem' }}>Showing the 250 dearest of {shown.length} — seek by name to narrow.</div>}
          {shown.length === 0 && <div style={{ padding: 'var(--s6)', textAlign: 'center', color: 'var(--text-muted)' }}>No merchant answers to “{q}”.</div>}
        </div>
      </div>
    );
  }
  window.Merchants = Merchants;
})();
