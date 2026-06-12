// dashboard.jsx — Sanctum. Financial-wellbeing home.
(function () {
  const { Money, Button, CatDot, Delta, Sparkline, StackedBar, BarsChart, Donut, Icon, Corners, Headpiece, Laurel, EmptyState } = window;
  const D = window.DATA;

  const pctDelta = (cur, prev) => (prev ? Math.round(((cur - prev) / Math.abs(prev)) * 100) : 0);
  const KIND_LABEL = { spending: 'Daily coffer', saving: 'Reserve', credit: 'Debt-bond', retire: 'The long sleep' };

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Dawn creeps in' : h < 18 ? 'The pall of afternoon' : 'Night gathers';
  }

  function LedgerCell({ label, value, series, color, delta, invert, compact }) {
    return (
      <div className="ledger-cell">
        <div style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', letterSpacing: '0.03em', color: 'var(--text-muted)', fontSize: '0.95rem' }}>{label}</div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <Money value={value} compact={compact} className="num" style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--text-strong)', letterSpacing: '-0.03em' }} />
          {delta != null && <Delta value={delta} invert={invert} />}
        </div>
        {series.length > 1 && <div style={{ marginTop: 4 }}><Sparkline values={series} color={color} height={26} fill={false} strokeWidth={1.4} /></div>}
      </div>
    );
  }

  function HeroCashflow() {
    const m = D.thisMonth, p = D.prevMonth;
    const netSeries = D.MONTHS12.map((x) => x.net);
    const inPct = (m.income + m.expenses) ? (m.income / (m.income + m.expenses)) * 100 : 50;
    return (
      <div className="card fade-up" style={{ overflow: 'hidden' }}>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 'var(--s7)', alignItems: 'center' }}>
          <div>
            <div className="stat-label" style={{ marginBottom: 8 }}><Icon name="leaf" size={15} /><span style={{ whiteSpace: 'nowrap' }}>What remained · {window.fmtMonthLong(m.ym)}</span></div>
            <div className="row" style={{ gap: 'var(--s4)', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Money value={m.net} sign className="num" style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, whiteSpace: 'nowrap', color: m.net >= 0 ? 'var(--pos)' : 'var(--neg)' }} />
              <Delta value={pctDelta(m.net, p.net)} />
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 18px', maxWidth: 420 }}>
              Thou keepest <strong style={{ color: 'var(--text-strong)' }}>{D.savingsRate}%</strong> of all thou gathered'st — {m.net >= p.net ? 'more than the moon prior' : 'less than the moon prior'}.
            </p>
            <div className="row" style={{ gap: 'var(--s7)' }}>
              <div><div className="row" style={{ gap: 7, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--pos)' }} />Gathered</div><Money value={m.income} className="num" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-strong)' }} /></div>
              <div><div className="row" style={{ gap: 7, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--neg)' }} />Devoured</div><Money value={-m.expenses} className="num" style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-strong)' }} /></div>
            </div>
            <div className="meter" style={{ marginTop: 14, height: 10 }}><span style={{ width: inPct + '%', background: 'var(--pos)' }} /><span style={{ width: (100 - inPct) + '%', background: 'var(--neg)' }} /></div>
          </div>
          <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, borderLeft: '1px solid var(--border)', paddingLeft: 'var(--s7)' }}>
            <div className="stat-label">The thread of what remains · {D.MONTHS12.length} moons</div>
            {netSeries.length > 1 ? <Sparkline values={netSeries} color="var(--accent)" height={84} strokeWidth={2.4} /> : <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Too few moons to trace a thread.</div>}
            <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-dim)' }}><span>Hoarded this year</span><Money value={D.ytdSurplus} className="num" style={{ color: 'var(--text-strong)', fontWeight: 700 }} /></div>
          </div>
        </div>
      </div>
    );
  }

  function HeroNetworth() {
    const nw = D.NETWORTH;
    if (!nw.length) return null;
    const cur = nw[nw.length - 1].value, prev = (nw[nw.length - 2] || nw[nw.length - 1]).value;
    const sumKind = (kinds) => D.ACCOUNTS.filter(a => kinds.includes(a.kind)).reduce((s, a) => s + a.balance, 0);
    const buckets = [
      { name: 'Coin', color: 'var(--accent)', value: sumKind(['spending', 'credit']) },
      { name: 'Reserve', color: '#6366f1', value: sumKind(['saving']) },
      { name: 'Long Slumber', color: 'var(--pos)', value: sumKind(['retire']) },
    ].filter(b => b.value !== 0);
    const total = buckets.reduce((s, b) => s + Math.abs(b.value), 0) || 1;
    return (
      <div className="card fade-up">
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 'var(--s7)', alignItems: 'center' }}>
          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}><Icon name="shield" size={15} />The Sum of Thy Hoard</div>
            <div className="row" style={{ gap: 'var(--s4)', alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Money value={cur} className="num" style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, whiteSpace: 'nowrap' }} />
              <Delta value={pctDelta(cur, prev)} />
            </div>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 16px' }}>{cur >= prev ? 'Swollen by ' : 'Diminished by '}<Money value={Math.abs(cur - prev)} className="num" style={{ color: cur >= prev ? 'var(--pos)' : 'var(--neg)', fontWeight: 700 }} /> this moon, across every vault.</p>
            <div className="meter" style={{ height: 12, marginBottom: 12 }}>{buckets.map((b, i) => <span key={i} style={{ width: (Math.abs(b.value) / total) * 100 + '%', background: b.color }} />)}</div>
            <div className="row" style={{ gap: 'var(--s5)', flexWrap: 'wrap' }}>{buckets.map((b, i) => <span key={i} className="row" style={{ gap: 7, fontSize: '0.85rem' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: b.color }} /><span style={{ color: 'var(--text-muted)' }}>{b.name}</span><Money value={b.value} compact className="num" style={{ fontWeight: 700, color: 'var(--text-strong)' }} /></span>)}</div>
          </div>
          <Sparkline values={nw.map(x => x.value)} color="var(--accent)" height={150} strokeWidth={2.6} />
        </div>
      </div>
    );
  }

  function HeroWellbeing() {
    const score = D.wb.score, signals = D.wb.signals;
    return (
      <div className="card fade-up" style={{ position: 'relative', overflow: 'hidden' }}>
        <Corners />
        <div className="card-body" style={{ padding: 'var(--s7) var(--s8)' }}>
          <Headpiece title="Of Thy Standing" sub={window.fmtMonthLong(D.thisMonth.ym)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--s8)', alignItems: 'center', marginTop: 'var(--s6)' }}>
            <div style={{ position: 'relative', width: 230, height: 230, display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Laurel size={230} />
              <Donut segments={[{ value: score, color: 'var(--gold)' }, { value: 100 - score, color: 'var(--surface-2)' }]} size={150} thickness={8} centerLabel="AUGURY" centerValue={score} />
            </div>
            <div>
              <h2 className="chapter" style={{ textAlign: 'left', fontSize: '2.1rem', marginBottom: 10 }}>{score >= 66 ? 'Thy estate yet endures' : score >= 33 ? 'Thy estate stands uneasy' : 'Thy estate is sore beset'}</h2>
              <p className="dropcap" style={{ color: 'var(--text-muted)', margin: '0 0 20px', maxWidth: 500, fontSize: '1.1rem', lineHeight: 1.6 }}>A reckoning of what is kept, what shields thee from famine, and what yet lies nameless in thy ledger. Mark well the portents below.</p>
              <div className="grid" style={{ gap: 11 }}>
                {signals.map((s, i) => (
                  <div key={i} className="row" style={{ gap: 13 }}>
                    <span style={{ width: 24, height: 24, transform: 'rotate(45deg)', display: 'grid', placeItems: 'center', flex: 'none', border: `1px solid ${s.ok ? 'var(--pos)' : 'var(--amber)'}`, background: s.ok ? 'color-mix(in srgb, var(--pos) 14%, transparent)' : 'color-mix(in srgb, var(--amber) 16%, transparent)', color: s.ok ? 'var(--pos)' : 'var(--amber)' }}>
                      <span style={{ transform: 'rotate(-45deg)', display: 'grid', placeItems: 'center' }}><Icon name={s.ok ? 'check' : 'alert'} size={14} /></span>
                    </span>
                    <span style={{ color: 'var(--text)', fontWeight: 500, fontSize: '1.08rem' }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function WhereItGoes({ go }) {
    const items = D.CATSPEND.map((x) => ({ ...x, cat: x.catId ? (D.catById[x.catId] || D.UNCAT) : D.UNCAT })).sort((a, b) => b.amount - a.amount);
    const total = items.reduce((s, x) => s + x.amount, 0) || 1;
    const segs = items.map((x) => ({ value: x.amount, color: x.cat.color, label: x.cat.name }));
    return (
      <div className="card" style={{ position: 'relative' }}>
        <div className="card-head"><div><div className="card-title">Whither the Coin Flees</div><div className="card-sub">By sigil · this moon</div></div><Money value={total} className="num" style={{ fontWeight: 700, fontSize: '1.2rem' }} /></div>
        <div className="card-body">
          <StackedBar segments={segs} height={14} />
          <div style={{ marginTop: 'var(--s5)' }}>
            {items.map((x, i) => {
              const isUncat = x.catId === null;
              return (
                <div key={i} className={'leader-row' + (isUncat ? ' uncat' : '')}>
                  <span className="row" style={{ gap: 11, flex: 'none' }}>
                    <span style={{ width: 11, height: 11, transform: 'rotate(45deg)', background: x.cat.color, flex: 'none' }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '1.06rem', color: isUncat ? 'var(--amber)' : 'var(--text)', fontStyle: isUncat ? 'italic' : 'normal', whiteSpace: 'nowrap' }}>{x.cat.name}</span>
                    {isUncat && <button className="btn ghost sm" style={{ color: 'var(--amber)', padding: '1px 8px', fontSize: '0.82rem' }} onClick={() => go('transactions')}><Icon name="flag" size={13} />Name these</button>}
                  </span>
                  <span className="leader-fill" />
                  <span className="num" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{Math.round((x.amount / total) * 100)}%</span>
                  <Money value={x.amount} className="num" style={{ fontWeight: 600, minWidth: 96, textAlign: 'right' }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function AccountsMini({ go }) {
    if (!D.ACCOUNTS.length) {
      return <div className="card"><div className="card-head"><div className="card-title">The Vaults</div></div><div className="card-body"><p style={{ color: 'var(--text-muted)', margin: '0 0 12px', fontSize: '0.92rem' }}>No vaults yet bound.</p><Button variant="ghost" size="sm" iconName="plus" onClick={() => go('accounts')}>Bind a vault</Button></div></div>;
    }
    return (
      <div className="card">
        <div className="card-head"><div className="card-title">The Vaults</div><button className="btn ghost sm" onClick={() => go('accounts')}>All vaults<Icon name="chevronRight" size={15} /></button></div>
        <div className="card-body" style={{ paddingTop: 'var(--s3)' }}>
          {D.ACCOUNTS.map((a, i) => (
            <div key={a.id} className="row" style={{ justifyContent: 'space-between', padding: '11px 0', borderBottom: i < D.ACCOUNTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span className="row" style={{ gap: 12 }}>
                <span className="acct-icon" style={{ width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${a.color} 18%, var(--surface))`, color: a.color }}><Icon name={a.icon} size={17} /></span>
                <span><div style={{ fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{a.name}</div><div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{KIND_LABEL[a.kind] || a.kind}</div></span>
              </span>
              <Money value={a.balance} className="num" style={{ fontWeight: 700, color: a.balance < 0 ? 'var(--neg)' : 'var(--text-strong)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function NeedsReview({ go }) {
    return (
      <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--amber) 35%, var(--border))' }}>
        <div className="card-body">
          <div className="row" style={{ gap: 10, marginBottom: 8 }}><span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--amber) 16%, transparent)', color: 'var(--amber)' }}><Icon name="flag" size={17} /></span><div className="card-title">Demands thy reckoning</div></div>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 14px', fontSize: '0.92rem' }}><strong style={{ color: 'var(--text-strong)' }} className="num">{D.uncatCount}</strong> inscriptions, worth <Money value={D.uncatTotal} className="num" style={{ color: 'var(--text-strong)', fontWeight: 700 }} />, lie nameless and unquiet.</p>
          <Button variant="primary" size="sm" iconName="sparkles" onClick={() => go('transactions')}>Bestow their sigils</Button>
        </div>
      </div>
    );
  }

  function Dashboard({ t, go }) {
    if (!D.hasData) {
      return <div className="content"><EmptyState iconName="importIcon" title="The sanctum stands empty" action={<Button variant="primary" iconName="importIcon" onClick={() => go('import')}>Summon thy records</Button>}>Cast a bank scroll — CSV, OFX or QIF — into the circle, and thy ledger shall be reckoned.</EmptyState></div>;
    }
    const m = D.thisMonth, p = D.prevMonth;
    return (
      <div className="content wide">
        <div className="page-head">
          <div><div className="page-title">{greeting()}</div><div className="page-meta">A reckoning of thy coin · <span className="num">{D.TXNS.length}</span> inscriptions</div></div>
          {D.uncatCount > 0 && <Button variant="" iconName="flag" onClick={() => go('transactions')} style={{ color: 'var(--amber)', borderColor: 'color-mix(in srgb, var(--amber) 40%, var(--border))' }}><span className="num">{D.uncatCount}</span> unnamed</Button>}
        </div>
        <div className="grid" style={{ gap: 'var(--s6)' }}>
          <HeroWellbeing />
          <div className="ledger-strip">
            <LedgerCell label="Tithes" value={m.income} series={D.MONTHS12.map(x => x.income)} color="var(--pos)" delta={pctDelta(m.income, p.income)} />
            <LedgerCell label="Devoured" value={m.expenses} series={D.MONTHS12.map(x => x.expenses)} color="var(--neg)" delta={pctDelta(m.expenses, p.expenses)} invert />
            <LedgerCell label="What Remains" value={m.net} series={D.MONTHS12.map(x => x.net)} color="var(--gold)" delta={pctDelta(m.net, p.net)} />
            <LedgerCell label="Mean Devouring" value={D.avgSpend} series={D.MONTHS12.map(x => x.expenses)} color="var(--text-dim)" />
          </div>
          <div style={{ marginTop: 'var(--s2)' }}><Headpiece title="The Twelvemonth" /></div>
          <div className="grid grid-2" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
            <div className="card" style={{ position: 'relative' }}>
              <Corners />
              <div className="card-head" style={{ flexWrap: 'wrap', rowGap: 8 }}>
                <div style={{ flex: '1 1 auto' }}><div className="card-title" style={{ whiteSpace: 'nowrap' }}>Tithes against Tolls</div><div className="card-sub">{D.MONTHS12.length} moons · the thread of what remains</div></div>
                <div className="row" style={{ gap: 14, fontSize: '0.85rem', color: 'var(--text-muted)', flex: 'none', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 9, height: 9, transform: 'rotate(45deg)', background: 'var(--pos)' }} />Tithe</span>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 9, height: 9, transform: 'rotate(45deg)', background: 'var(--neg)' }} />Toll</span>
                  <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 2, background: 'var(--gold)' }} />Kept</span>
                </div>
              </div>
              <div className="card-body">{D.MONTHS12.length ? <BarsChart data={D.MONTHS12} height={250} showNet={t.chartStyle !== 'bars'} /> : null}</div>
            </div>
            <div className="grid" style={{ gap: 'var(--s6)' }}>
              {D.uncatCount > 0 && <NeedsReview go={go} />}
              <AccountsMini go={go} />
            </div>
          </div>
          <div style={{ marginTop: 'var(--s2)' }}><Headpiece title="Whither It Flees" /></div>
          <WhereItGoes go={go} />
        </div>
      </div>
    );
  }

  window.Dashboard = Dashboard;
  window.HeroCashflow = HeroCashflow;
  window.HeroNetworth = HeroNetworth;
})();
