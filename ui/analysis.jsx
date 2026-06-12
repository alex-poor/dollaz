// analysis.jsx — Auguries. Category trends + projection with dashed forecast.
(function () {
  const { useState } = React;
  const { Money, LineChart, ChartLegend, Chip, CatDot, Icon, HeroCashflow, HeroNetworth, Button, EmptyState } = window;
  const D = window.DATA;

  function addMonths(ym, k) {
    let [y, m] = ym.split('-').map(Number); m += k; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  function Analysis({ go }) {
    const [mode, setMode] = useState('expense');
    const [focus, setFocus] = useState('total');
    const [method, setMethod] = useState('avg');
    const [horizon, setHorizon] = useState(6);

    if (!D.hasData || D.YMS.length < 2) {
      return <div className="content"><EmptyState iconName="analysis" title="No portents yet" action={<Button variant="primary" iconName="importIcon" onClick={() => go('import')}>Summon records</Button>}>At least two moons of inscriptions are needed before the auguries can be cast.</EmptyState></div>;
    }

    const modeSeries = mode === 'expense' ? D.catSeries : D.catSeriesIncome;
    const series = modeSeries.map(s => ({ name: s.name, color: s.color, values: s.values }));

    const totalSeries = D.MONTHS12.map(m => mode === 'expense' ? m.expenses : m.income);
    const focusObj = modeSeries.find(s => s.id === focus);
    const base = focus === 'total' ? totalSeries : (focusObj ? focusObj.values : totalSeries);
    const proj = window.DZ.project(base, horizon, method, 3);
    const projValues = [...proj.history, ...proj.forecast];
    const projMonths = [...D.YMS];
    for (let i = 1; i <= horizon; i++) projMonths.push(addMonths(D.YMS[D.YMS.length - 1], i));
    const horizonTotal = proj.forecast.reduce((s, x) => s + x, 0);
    const modeWord = mode === 'expense' ? 'toll' : 'tithe';
    const methodWord = method === 'avg' ? 'the mean' : 'the drift';
    const focusName = focus === 'total' ? (mode === 'expense' ? 'All tolls' : 'All tithes') : (focusObj ? focusObj.name : 'All');

    return (
      <div className="content wide">
        <div className="page-head"><div><div className="page-title">Auguries</div><div className="page-meta">Portents, &amp; the doom toward which thou drift'st</div></div>
          <div className="seg"><button className={mode === 'expense' ? 'active' : ''} onClick={() => { setMode('expense'); setFocus('total'); }}>Tolls</button><button className={mode === 'income' ? 'active' : ''} onClick={() => { setMode('income'); setFocus('total'); }}>Tithes</button></div>
        </div>

        <div className="grid" style={{ gap: 'var(--s5)' }}>
          <div className="nav-section" style={{ padding: '0 0 0 2px', margin: 0 }}>The Scrying</div>
          <HeroCashflow />
          {D.ACCOUNTS.length > 0 && <HeroNetworth />}
          <div className="nav-section" style={{ padding: 'var(--s3) 0 0 2px', margin: 0 }}>Portents &amp; Prophecy</div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Sigils across the Moons</div><div className="card-sub">Chief {modeWord} sigils · {D.YMS.length} moons</div></div></div>
            <div className="card-body">
              {series.length ? <><LineChart series={series} months={D.YMS} height={280} /><div style={{ marginTop: 'var(--s4)' }}><ChartLegend items={series} /></div></> : <p style={{ color: 'var(--text-muted)' }}>No {modeWord} sigils yet bestowed.</p>}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div><div className="card-title">Prophecy</div><div className="card-sub">Foretold spending, by {methodWord} of recent moons</div></div>
              <div className="row" style={{ gap: 'var(--s3)', flexWrap: 'wrap' }}>
                <select className="input" style={{ width: 'auto' }} value={focus} onChange={(e) => setFocus(e.target.value)}><option value="total">{mode === 'expense' ? 'All spending' : 'All income'}</option>{modeSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                <div className="seg"><button className={method === 'avg' ? 'active' : ''} onClick={() => setMethod('avg')}>Mean</button><button className={method === 'linear' ? 'active' : ''} onClick={() => setMethod('linear')}>Drift</button></div>
                <div className="seg">{[3, 6, 12].map((h) => <button key={h} className={horizon === h ? 'active' : ''} onClick={() => setHorizon(h)}>{h} moons</button>)}</div>
              </div>
            </div>
            <div className="card-body">
              <div className="stat-grid" style={{ marginBottom: 'var(--s5)', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat"><div className="stat-label">Next moon</div><Money value={proj.forecast[0] || 0} className="stat-value sm" /></div>
                <div className="stat"><div className="stat-label">Mean per moon</div><Money value={Math.round(proj.monthlyAverage)} className="stat-value sm" /></div>
                <div className="stat"><div className="stat-label">{horizon}-moon sum</div><Money value={horizonTotal} className="stat-value sm" /></div>
              </div>
              <LineChart series={[{ name: focusName, color: 'var(--accent)', values: projValues }]} months={projMonths} forecastFrom={D.YMS.length - 1} height={250} area />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>The shaded region is foretold ({method === 'avg' ? 'flat at the 3-moon mean' : 'by the drift, clamped at naught'}). A rough scrying, not prophecy sworn.</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Auguries by Sigil</div></div>
            <div className="card-body" style={{ paddingTop: 'var(--s2)' }}>
              <table className="table">
                <thead><tr><th>Sigil</th><th className="num">3-moon mean</th><th>Omen</th><th className="num">Next moon</th><th className="num">{horizon}-moon sum</th></tr></thead>
                <tbody>
                  {modeSeries.map((s) => {
                    const p = window.DZ.project(s.values, horizon, method, 3);
                    const rising = window.DZ.linearRegression(s.values).slope > 0;
                    return (
                      <tr key={s.id}>
                        <td><span className="row" style={{ gap: 9 }}><CatDot color={s.color} lg />{s.name}</span></td>
                        <td className="num">{window.fmtCurrency(p.monthlyAverage)}</td>
                        <td>{rising ? <Chip tone="neg" iconName="trendUp">Waxing</Chip> : <Chip tone="pos" iconName="trendDown">Waning</Chip>}</td>
                        <td className="num">{window.fmtCurrency(p.forecast[0] || 0)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{window.fmtCurrency(p.forecast.reduce((a, b) => a + b, 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
  window.Analysis = Analysis;
})();
