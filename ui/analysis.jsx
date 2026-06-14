// analysis.jsx — Auguries. Category trends + projection with dashed forecast.
(function () {
  const { useState } = React;
  const { Money, LineChart, ChartLegend, Chip, CatDot, Icon, HeroCashflow, HeroNetworth, Button, EmptyState } = window;
  const D = window.DATA;

  function addMonths(ym, k) {
    let [y, m] = ym.split('-').map(Number); m += k; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  }

  const METHOD_WORD = { seasonal: 'the turning of the seasons', trend: 'a damped drift', mean: 'recent means' };

  function Analysis({ go }) {
    const [mode, setMode] = useState('expense');
    const [level, setLevel] = useState(80);
    const [horizon, setHorizon] = useState(3);
    const [adj, setAdj] = useState({}); // {catId: factor} for the Crossroads what-if

    if (!D.hasData || D.YMS.length < 2) {
      return <div className="content"><EmptyState iconName="analysis" title="No portents yet" action={<Button variant="primary" iconName="importIcon" onClick={() => go('import')}>Summon records</Button>}>At least two moons of inscriptions are needed before the auguries can be cast.</EmptyState></div>;
    }

    const modeSeries = mode === 'expense' ? D.catSeries : D.catSeriesIncome;
    const series = modeSeries.map(s => ({ name: s.name, color: s.color, values: s.values }));
    const modeWord = mode === 'expense' ? 'toll' : 'tithe';

    // Cashflow prophecy — forecast the (stabler) spend-to-income ratio, apply it
    // to recent income, and project surplus/deficit (net) with intervals.
    const income = D.MONTHS12.map(m => m.income);
    const expenses = D.MONTHS12.map(m => m.expenses);
    const netHist = D.MONTHS12.map(m => m.net);
    const cf = window.DZ.cashflowForecast(income, expenses, horizon, { level });
    const projMonths = [...D.YMS];
    for (let i = 1; i <= horizon; i++) projMonths.push(addMonths(D.YMS[D.YMS.length - 1], i));
    const netValues = [...netHist, ...cf.net.point];
    const lastNet = netHist[netHist.length - 1];
    const bandLower = netHist.map(() => null); const bandUpper = netHist.map(() => null);
    bandLower[netHist.length - 1] = lastNet; bandUpper[netHist.length - 1] = lastNet;
    cf.net.lower.forEach(v => bandLower.push(v)); cf.net.upper.forEach(v => bandUpper.push(v));
    const methodWord = METHOD_WORD[cf.method];
    const nextNet = cf.net.point[0] || 0;
    const horizonNet = cf.net.point.reduce((s, x) => s + x, 0);
    const nextRatioPct = Math.round((cf.ratio.point[0] || 0) * 100);
    const VERDICT = { surplus: 'A surplus foretold', deficit: 'A deficit looms', even: 'Neither surplus nor want' };

    // The Crossroads — what-if: apportion the forecast spend by recent share,
    // then scale each area to see the surplus/deficit it would bring.
    const shares = window.DZ.expenseShares(D.catSeries, expenses, 6);
    const scen = window.DZ.applyScenario(cf.recentIncome, cf.expense.point, shares, adj);
    const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
    const baseNetMo = avg(scen.baseNet), scenNetMo = avg(scen.scenNet), swing = scenNetMo - baseNetMo;
    const setFactor = (id, f) => setAdj(a => { const n = { ...a }; if (f === 1) delete n[id]; else n[id] = f; return n; });

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
              <div><div className="card-title">Prophecy of Surplus &amp; Want</div><div className="card-sub">Thy spending's turn upon recent income, foretold by {methodWord}</div></div>
              <div className="row" style={{ gap: 'var(--s3)', flexWrap: 'wrap' }}>
                <div className="seg" title="Breadth of the prediction interval">{[80, 95].map((l) => <button key={l} className={level === l ? 'active' : ''} onClick={() => setLevel(l)}>{l}%</button>)}</div>
                <div className="seg">{[3, 6, 12].map((h) => <button key={h} className={horizon === h ? 'active' : ''} onClick={() => setHorizon(h)}>{h} moons</button>)}</div>
              </div>
            </div>
            <div className="card-body">
              <div className="row" style={{ gap: 10, marginBottom: 'var(--s4)' }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none', background: `color-mix(in srgb, ${cf.verdict === 'deficit' ? 'var(--neg)' : 'var(--pos)'} 16%, transparent)`, color: cf.verdict === 'deficit' ? 'var(--neg)' : 'var(--pos)' }}><Icon name={cf.verdict === 'deficit' ? 'trendDown' : 'trendUp'} size={18} /></span>
                <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-strong)' }}>{VERDICT[cf.verdict]}</div><div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>On recent income of <Money value={cf.recentIncome} className="num" />, spending ~<span className="num">{nextRatioPct}%</span> — about <Money value={Math.abs(nextNet)} className="num" /> {cf.verdict === 'deficit' ? 'short' : 'spare'} each moon.</div></div>
              </div>
              <div className="stat-grid" style={{ marginBottom: 'var(--s5)', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat"><div className="stat-label">Next moon</div><Money value={nextNet} className="stat-value sm" colorSign /><div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: 2 }}>{window.fmtCurrency(cf.net.lower[0], { compact: true })} – {window.fmtCurrency(cf.net.upper[0], { compact: true })}</div></div>
                <div className="stat"><div className="stat-label">{horizon}-moon balance</div><Money value={horizonNet} className="stat-value sm" colorSign /></div>
                <div className="stat"><div className="stat-label">Foretold spend ratio</div><div className="stat-value sm num" style={{ fontSize: '1.2rem' }}>{nextRatioPct}%</div></div>
              </div>
              <LineChart series={[{ name: 'What remains', color: 'var(--accent)', values: netValues }]} months={projMonths} forecastFrom={D.YMS.length - 1} height={250} band={{ lower: bandLower, upper: bandUpper }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>
                The gold line is zero; above it surplus, below it want. We foretell the spend-to-income ratio ({cf.method === 'seasonal' ? 'by Holt-Winters, weighing the year’s turning' : cf.method === 'trend' ? 'by a damped drift; seasonality awaits two full years' : 'held near its recent mean'}) and lay it upon thy recent income. The shaded region is the {level}% bound of likelihood. A scrying, not prophecy sworn.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div><div className="card-title">The Crossroads</div><div className="card-sub">Temper thy spending, and behold the fate it brings</div></div>
              {Object.keys(adj).length > 0 && <Button variant="ghost" iconName="refresh" onClick={() => setAdj({})}>Restore all</Button>}
            </div>
            <div className="card-body">
              <div className="row" style={{ gap: 'var(--s6)', alignItems: 'center', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
                <div><div className="stat-label">As foretold</div><Money value={baseNetMo} className="num" style={{ fontSize: '1.5rem', fontWeight: 700 }} colorSign /><div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>each moon</div></div>
                <Icon name="chevronRight" size={20} style={{ color: 'var(--text-dim)' }} />
                <div><div className="stat-label" style={{ color: 'var(--gold)' }}>Shouldst thou temper it</div><Money value={scenNetMo} className="num" style={{ fontSize: '1.85rem', fontWeight: 700 }} colorSign /><div style={{ fontSize: '0.74rem', color: scenNetMo >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{scenNetMo >= 0 ? 'a surplus' : 'a deficit'} · {window.fmtCurrency(scen.monthlySaving, { compact: true })} spared/moon</div></div>
                {Math.abs(swing) > 1 && <span className={'chip ' + (swing > 0 ? 'pos' : 'neg')} style={{ fontSize: '0.92rem' }}><Icon name={swing > 0 ? 'trendUp' : 'trendDown'} size={14} />{swing > 0 ? '+' : '−'}<Money value={Math.abs(swing)} className="num" /> swing</span>}
              </div>
              <div className="grid" style={{ gap: 2 }}>
                {scen.rows.filter(r => r.baseMonthly > 0.5).map((r) => {
                  const pct = Math.round((r.factor - 1) * 100);
                  return (
                    <div key={r.id} className="row" style={{ gap: 'var(--s4)', padding: '8px var(--s2)', borderBottom: '1px solid var(--border)' }}>
                      <span className="row" style={{ gap: 9, width: 170, flex: 'none' }}><span style={{ width: 11, height: 11, transform: 'rotate(45deg)', background: r.color, flex: 'none' }} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: r.id === '__other__' ? 'var(--text-muted)' : 'var(--text)', fontStyle: r.id === '__other__' ? 'italic' : 'normal' }}>{r.name}</span></span>
                      <input type="range" className="dz-slider" min="-100" max="50" step="5" value={pct} onChange={(e) => setFactor(r.id, 1 + Number(e.target.value) / 100)} style={{ flex: 1, minWidth: 120 }} />
                      <span className="num" style={{ width: 56, textAlign: 'right', color: pct < 0 ? 'var(--pos)' : pct > 0 ? 'var(--neg)' : 'var(--text-dim)', fontWeight: 600 }}>{pct > 0 ? '+' : ''}{pct}%</span>
                      <span className="num" style={{ width: 96, textAlign: 'right', color: 'var(--text-strong)' }}>{window.fmtCurrency(r.scenMonthly, { compact: true })}<span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>/mo</span></span>
                      <button className="btn ghost sm" style={{ flex: 'none', color: r.factor === 0 ? 'var(--neg)' : 'var(--text-muted)' }} onClick={() => setFactor(r.id, r.factor === 0 ? 1 : 0)} title="Forsake this entirely">{r.factor === 0 ? 'forsaken' : 'forsake'}</button>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 'var(--s4)', fontStyle: 'italic' }}>Each area is reckoned from its recent share of thy spending and the forecast total. Slide to cut or swell it; “forsake” halts it wholly. Income is held at its recent level.</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Auguries by Sigil</div></div>
            <div className="card-body" style={{ paddingTop: 'var(--s2)' }}>
              <table className="table">
                <thead><tr><th>Sigil</th><th className="num">3-moon mean</th><th>Omen</th><th className="num">Next moon</th><th className="num">{horizon}-moon sum</th></tr></thead>
                <tbody>
                  {modeSeries.map((s) => {
                    const f = window.DZ.forecast(s.values, horizon, { level });
                    const avg3 = s.values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, s.values.length);
                    const rising = window.DZ.linearRegression(s.values).slope > 0;
                    return (
                      <tr key={s.id}>
                        <td><span className="row" style={{ gap: 9 }}><CatDot color={s.color} lg />{s.name}</span></td>
                        <td className="num">{window.fmtCurrency(avg3)}</td>
                        <td>{rising ? <Chip tone="neg" iconName="trendUp">Waxing</Chip> : <Chip tone="pos" iconName="trendDown">Waning</Chip>}</td>
                        <td className="num">{window.fmtCurrency(f.point[0] || 0)}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{window.fmtCurrency(f.point.reduce((a, b) => a + b, 0))}</td>
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
