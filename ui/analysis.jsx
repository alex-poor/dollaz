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
    const [coreOnly, setCoreOnly] = useState(true); // Prophecy on baseline spend only
    const [adj, setAdj] = useState({}); // {unitId: factor} for the Crossroads what-if
    const [openCat, setOpenCat] = useState({}); // which sigils are expanded to merchants

    if (!D.hasData || D.YMS.length < 2) {
      return <div className="content"><EmptyState iconName="analysis" title="No portents yet" action={<Button variant="primary" iconName="importIcon" onClick={() => go('import')}>Summon records</Button>}>At least two moons of inscriptions are needed before the auguries can be cast.</EmptyState></div>;
    }

    const modeSeries = mode === 'expense' ? D.catSeries : D.catSeriesIncome;
    const series = modeSeries.map(s => ({ name: s.name, color: s.color, values: s.values }));
    const modeWord = mode === 'expense' ? 'toll' : 'tithe';

    // Cashflow prophecy — forecast the (stabler) spend-to-income ratio, apply it
    // to recent income, and project surplus/deficit (net) with intervals.
    const income = D.MONTHS12.map(m => m.income);
    const expensesAll = D.MONTHS12.map(m => m.expenses);
    const expensesCore = D.MONTHS12.map(m => (m.coreExpense != null ? m.coreExpense : m.expenses));
    // The Prophecy forecasts CORE spend by default (baseline, no lumpy one-offs);
    // the Crossroads below always reckons ALL spending so you can temper either.
    const cfAll = window.DZ.cashflowForecast(income, expensesAll, horizon, { level });
    const cf = coreOnly ? window.DZ.cashflowForecast(income, expensesCore, horizon, { level }) : cfAll;
    const netHist = D.MONTHS12.map(m => coreOnly ? (m.income - (m.coreExpense != null ? m.coreExpense : m.expenses)) : m.net);
    const discMo = (() => { const r = D.MONTHS12.slice(-Math.min(6, D.MONTHS12.length)).map(m => m.discExpense || 0); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0; })();
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

    // The Crossroads — what-if. Apportion the forecast spend by each category's
    // recent share, then split each category's share across its top-5 merchants
    // (+ a "rest" unit) so individual merchants can be scaled or forsaken.
    // Shares over ALL expense sigils with spend in the recent window (not just the
    // chart's top 6). Category AND merchant proportions use the SAME window, so each
    // merchant figure tracks its recent monthly average, scaled to the forecast total.
    const recentN = Math.min(6, D.YMS.length) || 1;
    const recentSet = new Set(D.YMS.slice(-recentN));
    const catRecent = {}; let totalRecent = 0;   // recent expense per category → shares
    const merchByCat = {};                        // merchant breakdown (same window) → proportions
    for (const t of D.TXNS) {
      if (t.transfer || t.amount >= 0) continue;
      if (!recentSet.has(t.date.slice(0, 7))) continue;
      const cid = t.categoryId || '__other__';
      catRecent[cid] = (catRecent[cid] || 0) + (-t.amount); totalRecent += -t.amount;
      const r = window.DZ.matchRule(t.raw || t.description, D.RULES);
      const key = r ? r.pattern.toUpperCase() : window.DZ.suggestMerchant(t.raw || t.description);
      const map = (merchByCat[cid] = merchByCat[cid] || new Map());
      const row = map.get(key) || { label: key, total: 0 };
      row.total += -t.amount; map.set(key, row);
    }
    totalRecent = totalRecent || 1;
    const catShares = Object.keys(catRecent).filter(cid => cid !== '__other__')
      .map(cid => ({ id: cid, name: D.catById[cid]?.name || cid, color: D.catById[cid]?.color || '#9aa0a6', share: catRecent[cid] / totalRecent }))
      .sort((a, b) => b.share - a.share);
    if (catRecent['__other__']) catShares.push({ id: '__other__', name: 'Unnamed & sundry', color: '#9aa0a6', share: catRecent['__other__'] / totalRecent });
    const groups = catShares.map(cs => {
      const map = merchByCat[cs.id];
      const mrows = map ? [...map.values()].sort((a, b) => b.total - a.total) : [];
      const catTotal = mrows.reduce((s, m) => s + m.total, 0) || 1;
      const top = mrows.slice(0, 5);
      const topFrac = Math.min(1, top.reduce((s, m) => s + m.total, 0) / catTotal);
      const units = top.map((m, i) => ({ id: 'u|' + cs.id + '|' + i, name: m.label, share: cs.share * (m.total / catTotal), merchant: true }));
      if (mrows.length > top.length) units.push({ id: 'u|' + cs.id + '|rest', name: 'other ' + cs.name, share: cs.share * Math.max(0, 1 - topFrac), rest: true });
      if (units.length === 0) units.push({ id: 'u|' + cs.id, name: cs.name, share: cs.share });
      return { cat: cs, units, expandable: units.some(u => u.merchant) };
    });
    const allUnits = groups.flatMap(g => g.units);
    const scen = window.DZ.applyScenario(cfAll.recentIncome, cfAll.expense.point, allUnits, adj);
    const avgExp = cfAll.expense.point.reduce((a, b) => a + b, 0) / (cfAll.expense.point.length || 1);
    const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
    const baseNetMo = avg(scen.baseNet), scenNetMo = avg(scen.scenNet), swing = scenNetMo - baseNetMo;
    const setUnits = (units, f) => setAdj(a => { const n = { ...a }; for (const u of units) { if (f === 1) delete n[u.id]; else n[u.id] = f; } return n; });
    const setOne = (id, f) => setAdj(a => { const n = { ...a }; if (f === 1) delete n[id]; else n[id] = f; return n; });

    return (
      <div className="content wide">
        <div className="page-head"><div><div className="page-title">Auguries</div><div className="page-meta">Portents, &amp; the doom toward which thou drift'st</div></div>
          <div className="seg"><button className={mode === 'expense' ? 'active' : ''} onClick={() => setMode('expense')}>Tolls</button><button className={mode === 'income' ? 'active' : ''} onClick={() => setMode('income')}>Tithes</button></div>
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
              <div><div className="card-title">Prophecy of Surplus &amp; Want</div><div className="card-sub">Thy {coreOnly ? 'baseline ' : ''}spending's turn upon recent income, foretold by {methodWord}</div></div>
              <div className="row" style={{ gap: 'var(--s3)', flexWrap: 'wrap' }}>
                <div className="seg" title="Baseline weighs only core, recurring sigils; All includes discretionary one-offs"><button className={coreOnly ? 'active' : ''} onClick={() => setCoreOnly(true)}>Baseline</button><button className={!coreOnly ? 'active' : ''} onClick={() => setCoreOnly(false)}>All</button></div>
                <div className="seg" title="Breadth of the prediction interval">{[80, 95].map((l) => <button key={l} className={level === l ? 'active' : ''} onClick={() => setLevel(l)}>{l}%</button>)}</div>
                <div className="seg">{[3, 6, 12].map((h) => <button key={h} className={horizon === h ? 'active' : ''} onClick={() => setHorizon(h)}>{h} moons</button>)}</div>
              </div>
            </div>
            <div className="card-body">
              <div className="row" style={{ gap: 10, marginBottom: 'var(--s4)' }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flex: 'none', background: `color-mix(in srgb, ${cf.verdict === 'deficit' ? 'var(--neg)' : 'var(--pos)'} 16%, transparent)`, color: cf.verdict === 'deficit' ? 'var(--neg)' : 'var(--pos)' }}><Icon name={cf.verdict === 'deficit' ? 'trendDown' : 'trendUp'} size={18} /></span>
                <div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-strong)' }}>{VERDICT[cf.verdict]}</div><div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>On recent income of <Money value={cf.recentIncome} className="num" />, {coreOnly ? 'baseline ' : ''}spending ~<span className="num">{nextRatioPct}%</span> — about <Money value={Math.abs(nextNet)} className="num" /> {cf.verdict === 'deficit' ? 'short' : 'spare'} each moon.{coreOnly && D.hasDiscretionary && discMo > 1 ? <> Discretionary spend of ~<Money value={discMo} className="num" />/moon is set aside.</> : null}</div></div>
              </div>
              <div className="stat-grid" style={{ marginBottom: 'var(--s5)', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat"><div className="stat-label">Next moon</div><Money value={nextNet} className="stat-value sm" colorSign /><div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: 2 }}>{window.fmtCurrency(cf.net.lower[0], { compact: true })} – {window.fmtCurrency(cf.net.upper[0], { compact: true })}</div></div>
                <div className="stat"><div className="stat-label">{horizon}-moon balance</div><Money value={horizonNet} className="stat-value sm" colorSign /></div>
                <div className="stat"><div className="stat-label">Foretold spend ratio</div><div className="stat-value sm num" style={{ fontSize: '1.2rem' }}>{nextRatioPct}%</div></div>
              </div>
              <LineChart series={[{ name: 'What remains', color: 'var(--accent)', values: netValues }]} months={projMonths} forecastFrom={D.YMS.length - 1} height={250} band={{ lower: bandLower, upper: bandUpper }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 8, fontStyle: 'italic' }}>
                The gold line is zero; above it surplus, below it want. We foretell the {coreOnly ? 'core ' : ''}spend-to-income ratio ({cf.method === 'seasonal' ? 'by Holt-Winters, weighing the year’s turning' : cf.method === 'trend' ? 'by a damped drift; seasonality awaits two full years' : 'held near its recent mean'}) and lay it upon thy recent income. The shaded region is the {level}% bound of likelihood. A scrying, not prophecy sworn.{coreOnly && !D.hasDiscretionary ? ' Mark any sigil as “discretionary” in Sigils to set one-off costs (landscaping, a new couch) aside from this baseline.' : ''}
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
                {groups.filter(g => g.units.reduce((s, u) => s + u.share, 0) > 0.002).map((g) => {
                  const base = g.units.reduce((s, u) => s + u.share * avgExp, 0);
                  const scn = g.units.reduce((s, u) => s + u.share * avgExp * (adj[u.id] ?? 1), 0);
                  const factor = base > 0 ? scn / base : 1, pct = Math.round((factor - 1) * 100);
                  const open = !!openCat[g.cat.id];
                  const isOther = g.cat.id === '__other__';
                  return (
                    <div key={g.cat.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="row" style={{ gap: 'var(--s4)', padding: '8px var(--s2)' }}>
                        <span className="row" style={{ gap: 7, width: 180, flex: 'none' }}>
                          {g.expandable ? <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setOpenCat(o => ({ ...o, [g.cat.id]: !o[g.cat.id] }))} title="Reveal its merchants"><Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} /></button> : <span style={{ width: 22, flex: 'none' }} />}
                          <span style={{ width: 11, height: 11, transform: 'rotate(45deg)', background: g.cat.color, flex: 'none' }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isOther ? 'var(--text-muted)' : 'var(--text)', fontStyle: isOther ? 'italic' : 'normal', fontWeight: 600 }}>{g.cat.name}</span>
                        </span>
                        <input type="range" className="dz-slider" min="-100" max="50" step="5" value={pct} onChange={(e) => setUnits(g.units, 1 + Number(e.target.value) / 100)} style={{ flex: 1, minWidth: 110 }} />
                        <span className="num" style={{ width: 52, textAlign: 'right', color: pct < 0 ? 'var(--pos)' : pct > 0 ? 'var(--neg)' : 'var(--text-dim)', fontWeight: 600 }}>{pct > 0 ? '+' : ''}{pct}%</span>
                        <span className="num" style={{ width: 92, textAlign: 'right', color: 'var(--text-strong)' }}>{window.fmtCurrency(scn, { compact: true })}<span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>/mo</span></span>
                        <button className="btn ghost sm" style={{ flex: 'none', color: factor === 0 ? 'var(--neg)' : 'var(--text-muted)' }} onClick={() => setUnits(g.units, factor === 0 ? 1 : 0)} title="Forsake the whole sigil">{factor === 0 ? 'forsaken' : 'forsake'}</button>
                      </div>
                      {open && g.units.map((u) => {
                        const f = adj[u.id] ?? 1, upct = Math.round((f - 1) * 100), ubase = u.share * avgExp;
                        return (
                          <div key={u.id} className="row" style={{ gap: 'var(--s4)', padding: '4px var(--s2) 4px 50px', background: 'color-mix(in srgb, var(--gold) 3%, transparent)' }}>
                            <span style={{ width: 150, flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem', color: u.rest ? 'var(--text-dim)' : 'var(--text-muted)', fontStyle: u.rest ? 'italic' : 'normal' }}>{u.name}</span>
                            <input type="range" className="dz-slider" min="-100" max="50" step="5" value={upct} onChange={(e) => setOne(u.id, 1 + Number(e.target.value) / 100)} style={{ flex: 1, minWidth: 90 }} />
                            <span className="num" style={{ width: 52, textAlign: 'right', fontSize: '0.82rem', color: upct < 0 ? 'var(--pos)' : upct > 0 ? 'var(--neg)' : 'var(--text-dim)' }}>{upct > 0 ? '+' : ''}{upct}%</span>
                            <span className="num" style={{ width: 92, textAlign: 'right', fontSize: '0.82rem', color: 'var(--text)' }}>{window.fmtCurrency(ubase * f, { compact: true })}</span>
                            <button className="btn ghost sm" style={{ flex: 'none', fontSize: '0.78rem', color: f === 0 ? 'var(--neg)' : 'var(--text-dim)' }} onClick={() => setOne(u.id, f === 0 ? 1 : 0)}>{f === 0 ? 'forsaken' : 'forsake'}</button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 'var(--s4)', fontStyle: 'italic' }}>Each figure is the forecast monthly spend, apportioned by each sigil's and merchant's share of the last {recentN} moons — not a raw average. Slide to cut or swell it; “forsake” halts it wholly. Income is held at its recent level. This reckons all spending — core and discretionary alike — so thou mayst weigh tempering the very one-offs the Prophecy sets aside.</div>
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
