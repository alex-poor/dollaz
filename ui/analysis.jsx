// analysis.jsx — category-over-time trends and basic projections.
const { ICONS, Button, Money, LineChart, ChartLegend, CatDot, EmptyState } = window;

function addMonths(ym, k) {
  let [y, m] = ym.split('-').map(Number);
  m += k; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function AnalysisScreen({ state, setState, onImport }) {
  const DZ = window.DZ;
  const { transactions, categories, settings } = state;
  const [kind, setKind] = React.useState('expense');
  const [focus, setFocus] = React.useState('__total__');       // category id or __total__
  const method = settings.projectionMethod;
  const horizon = settings.projectionMonths;

  const setSetting = (patch) => setState(s => ({ ...s, settings: { ...s.settings, ...patch } }));

  if (!transactions.length) {
    return <div className="content"><EmptyState icon={<ICONS.TrendUp size={48}/>} title="Nothing to analyse yet" body="Import some transactions and trends and projections will appear here." action={<Button variant="primary" icon={<ICONS.Import/>} onClick={onImport}>Import a CSV</Button>}/></div>;
  }

  const ot = DZ.byCategoryOverTime(transactions, categories, kind);
  const months = ot.months;
  const topSeries = ot.series.slice(0, 6);

  // Series the projection focuses on: a single category, or the total across all.
  const focusSeries = focus === '__total__'
    ? months.map((_, i) => ot.series.reduce((sum, s) => sum + s.amounts[i], 0))
    : (ot.series.find(s => s.categoryId === focus)?.amounts || months.map(() => 0));
  const focusColor = focus === '__total__' ? 'var(--accent)' : (ot.series.find(s => s.categoryId === focus)?.color || 'var(--accent)');
  const focusName = focus === '__total__' ? `Total ${kind}` : (categories.find(c => c.id === focus)?.name || 'Category');

  const proj = DZ.project(focusSeries, horizon, method, 3);
  const projLabels = [...months, ...Array.from({ length: horizon }, (_, i) => addMonths(months[months.length - 1], i + 1))];
  const projValues = [...proj.history, ...proj.forecast];
  const forecastTotal = proj.forecast.reduce((s, v) => s + v, 0);

  // Per-category projection table.
  const table = ot.series.map(s => {
    const p = DZ.project(s.amounts, horizon, method, 3);
    const trendUp = DZ.linearRegression(s.amounts).slope > 0;
    return { ...s, avg: p.monthlyAverage, nextMonth: p.forecast[0] || 0, horizonTotal: p.forecast.reduce((a, b) => a + b, 0), trendUp };
  });

  return (
    <div className="content">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Analysis & projections</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>Category trends over time, with a simple forward projection.</div>
        </div>
        <div className="seg">
          <button className={kind === 'expense' ? 'on' : ''} onClick={() => setKind('expense')}>Expenses</button>
          <button className={kind === 'income' ? 'on' : ''} onClick={() => setKind('income')}>Income</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h3>{kind === 'expense' ? 'Spending' : 'Income'} by category over time</h3><span className="sub">top {topSeries.length} · {months.length} months</span></div>
        <div className="card-body">
          {months.length < 2 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Need at least two months of data to plot a trend.</div> : (
            <>
              <LineChart series={topSeries.map(s => ({ name: s.name, color: s.color, values: s.amounts }))} labels={months}/>
              <ChartLegend items={topSeries.map(s => ({ label: s.name, color: s.color }))}/>
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <h3>Projection</h3>
          <div style={{ flex: 1 }}/>
          <select className="input" style={{ width: 'auto', fontSize: 12.5, padding: '4px 8px' }} value={focus} onChange={e => setFocus(e.target.value)}>
            <option value="__total__">Total {kind}</option>
            {ot.series.map(s => <option key={s.categoryId} value={s.categoryId}>{s.name}</option>)}
          </select>
          <div className="seg" style={{ marginLeft: 4 }}>
            <button className={method === 'avg' ? 'on' : ''} onClick={() => setSetting({ projectionMethod: 'avg' })} title="Flat at recent average">Average</button>
            <button className={method === 'linear' ? 'on' : ''} onClick={() => setSetting({ projectionMethod: 'linear' })} title="Extrapolate the trend">Trend</button>
          </div>
          <select className="input" style={{ width: 'auto', fontSize: 12.5, padding: '4px 8px', marginLeft: 4 }} value={horizon} onChange={e => setSetting({ projectionMonths: Number(e.target.value) })}>
            {[3, 6, 12].map(n => <option key={n} value={n}>{n} months</option>)}
          </select>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 28, marginBottom: 14, flexWrap: 'wrap' }}>
            <Stat label="Recent monthly average" value={<Money value={proj.monthlyAverage} decimals={0}/>}/>
            <Stat label={`Projected next ${horizon} months`} value={<Money value={forecastTotal} decimals={0}/>}/>
            <Stat label="Projected monthly (next)" value={<Money value={proj.forecast[0] || 0} decimals={0}/>}/>
          </div>
          <LineChart series={[{ name: focusName, color: focusColor, values: projValues }]} labels={projLabels} forecastFrom={months.length - 1}/>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
            Shaded region is projected ({method === 'avg' ? 'flat at the 3-month average' : 'linear trend, clamped at zero'}). A rough guide, not financial advice.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Per-category outlook</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Category</th><th className="num">3-mo avg / mo</th><th>Trend</th><th className="num">Next month</th><th className="num">Next {horizon} mo</th></tr></thead>
            <tbody>
              {table.map(r => (
                <tr key={r.categoryId}>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><CatDot color={r.color}/>{r.name}</span></td>
                  <td className="num"><Money value={r.avg} decimals={0}/></td>
                  <td><span className={'chip ' + (r.trendUp ? 'neg' : 'pos')}>{r.trendUp ? '▲ rising' : '▼ easing'}</span></td>
                  <td className="num"><Money value={r.nextMonth} decimals={0}/></td>
                  <td className="num"><Money value={r.horizonTotal} decimals={0}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

window.AnalysisScreen = AnalysisScreen;
