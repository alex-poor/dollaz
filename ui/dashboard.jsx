// dashboard.jsx — summary tiles, monthly income/expense trend, top categories.
const { ICONS, Button, Money, BarsChart, StackedBar, EmptyState, CatDot } = window;

function Dashboard({ state, onImport, onAnalyse }) {
  const { transactions, categories } = state;
  const DZ = window.DZ;

  if (!transactions.length) {
    return (
      <div className="content">
        <EmptyState
          icon={<ICONS.Wallet size={48}/>}
          title="Welcome to Dollaz"
          body="Import a bank CSV to get started. Transactions are categorised automatically from your saved rules; anything new, you map once and it's remembered."
          action={<Button variant="primary" icon={<ICONS.Import/>} onClick={onImport}>Import a CSV</Button>}
        />
      </div>
    );
  }

  const summary = DZ.summarize(transactions);
  const monthly = DZ.monthlyTotals(transactions);
  const recentMonths = monthly.slice(-12).map(m => ({ label: window.fmtMonthShort(m.month), income: m.income, expense: m.expense, net: m.net }));
  const byCat = DZ.byCategoryTotals(transactions, categories, 'expense').slice(0, 8);
  const unmapped = DZ.unmappedCount(transactions);

  // Average monthly spend over the period.
  const months = monthly.length || 1;
  const avgSpend = summary.expense / months;

  return (
    <div className="content">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {window.fmtDate(summary.firstDate)} – {window.fmtDate(summary.lastDate)} · {window.fmtNumber(summary.count)} transactions
          </div>
        </div>
        {unmapped > 0 && (
          <Button variant="default" icon={<ICONS.Tag/>} onClick={onImport}>
            {unmapped} uncategorised
          </Button>
        )}
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <Stat label="Income" icon={<ICONS.TrendUp size={13}/>} value={<Money value={summary.income} decimals={0} className="pos"/>}/>
        <Stat label="Expenses" icon={<ICONS.Coins size={13}/>} value={<Money value={summary.expense} decimals={0} className="neg"/>}/>
        <Stat label="Net" value={<Money value={summary.net} decimals={0} colorSign/>} meta={summary.net >= 0 ? 'Saving' : 'Spending more than earning'}/>
        <Stat label="Avg monthly spend" value={<Money value={avgSpend} decimals={0}/>} meta={`across ${months} month${months > 1 ? 's' : ''}`}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3>Income vs expenses</h3>
            <span className="sub">last {recentMonths.length} months</span>
            <div style={{ flex: 1 }}/>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CatDot color="var(--pos)"/> Income</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CatDot color="var(--neg)"/> Expense</span>
            </span>
          </div>
          <div className="card-body">
            <BarsChart data={recentMonths}/>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Where it goes</h3><div style={{ flex: 1 }}/><Button variant="ghost" size="sm" onClick={onAnalyse}>Analyse →</Button></div>
          <div className="card-body">
            {byCat.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No expenses yet.</div> : (
              <>
                <StackedBar items={byCat.map(c => ({ label: c.name, value: c.total, color: c.color }))} height={12}/>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {byCat.map(c => (
                    <div key={c.categoryId} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <CatDot color={c.color}/>
                      <span style={{ flex: 1 }}>{c.name}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{((c.total / summary.expense) * 100).toFixed(0)}%</span>
                      <Money value={c.total} decimals={0} className="" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, meta, icon }) {
  return (
    <div className="stat">
      <div className="label">{icon}{label}</div>
      <div className="value">{value}</div>
      {meta && <div className="meta">{meta}</div>}
    </div>
  );
}

window.Dashboard = Dashboard;
