// derive.js — compute the screens' `window.DATA` from live app state via window.DZ.
// DATA is a STABLE object whose contents are replaced in place by refreshData(),
// so screen modules can capture `const D = window.DATA` once and always read live.
(function () {
  window.DATA = {};
  const UNCAT = { id: null, name: 'Unnamed', color: '#9aa0a6', kind: 'expense' };

  function seriesForKind(txns, cats, YMS, kind) {
    const ot = window.DZ.byCategoryOverTime(txns, cats, kind); // {months, series}
    const mIndex = Object.fromEntries(ot.months.map((m, i) => [m, i]));
    return ot.series
      .filter(s => s.categoryId !== '__uncategorized__')
      .slice(0, 6)
      .map(s => ({
        id: s.categoryId, name: s.name, color: s.color,
        values: YMS.map(ym => (mIndex[ym] != null ? s.amounts[mIndex[ym]] : 0)),
      }));
  }

  function refreshData(state) {
    const DZ = window.DZ;
    const txns = state.transactions;
    const cats = state.categories;
    const catById = Object.fromEntries(cats.map(c => [c.id, c]));

    const allMonths = DZ.monthRange(txns);
    const YMS = allMonths.length > 18 ? allMonths.slice(allMonths.length - 18) : allMonths;

    const mtByYm = Object.fromEntries(DZ.monthlyTotals(txns).map(m => [m.month, m]));
    const MONTHS = YMS.map(ym => {
      const m = mtByYm[ym] || { income: 0, expense: 0, net: 0 };
      return { ym, income: m.income, expenses: m.expense, net: m.net };
    });

    const acctTotal = state.accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const liquid = state.accounts
      .filter(a => a.kind === 'spending' || a.kind === 'saving')
      .reduce((s, a) => s + (a.balance || 0), 0);

    const nwTarget = state.accounts.length ? acctTotal : DZ.monthlyTotals(txns).reduce((s, m) => s + m.net, 0);
    const nwByYm = Object.fromEntries(DZ.netWorthSeries(txns, nwTarget).map(p => [p.ym, p.value]));
    const NETWORTH = YMS.map(ym => ({ ym, value: nwByYm[ym] != null ? nwByYm[ym] : 0 }));

    // Latest-month spend by category (incl. uncategorised), biggest first.
    const lastYm = YMS[YMS.length - 1];
    const spend = new Map();
    for (const t of txns) {
      if (t.amount >= 0) continue;
      if (lastYm && t.date.slice(0, 7) !== lastYm) continue;
      const k = t.categoryId || '__null__';
      spend.set(k, (spend.get(k) || 0) + (-t.amount));
    }
    const CATSPEND = [...spend.entries()]
      .map(([k, amount]) => ({ catId: k === '__null__' ? null : k, amount }))
      .sort((a, b) => b.amount - a.amount);

    const catSeries = seriesForKind(txns, cats, YMS, 'expense');
    const catSeriesIncome = seriesForKind(txns, cats, YMS, 'income');

    const RULES = state.rules.map(r => ({ ...r, matches: 0 }));
    const ruleIx = Object.fromEntries(RULES.map((r, i) => [r.id, i]));
    for (const t of txns) {
      const m = DZ.matchRule(t.raw || t.description, state.rules);
      if (m && ruleIx[m.id] != null) RULES[ruleIx[m.id]].matches++;
    }

    const catCounts = {};
    for (const t of txns) if (t.categoryId) catCounts[t.categoryId] = (catCounts[t.categoryId] || 0) + 1;

    const thisMonth = MONTHS[MONTHS.length - 1] || { ym: lastYm || '', income: 0, expenses: 0, net: 0 };
    const prevMonth = MONTHS[MONTHS.length - 2] || { ym: '', income: 0, expenses: 0, net: 0 };
    const avgSpend = MONTHS.length ? Math.round(MONTHS.reduce((s, m) => s + m.expenses, 0) / MONTHS.length) : 0;
    const ytdSurplus = MONTHS.reduce((s, m) => s + m.net, 0);
    const savingsRate = thisMonth.income > 0 ? Math.round((thisMonth.net / thisMonth.income) * 100) : 0;

    const uncatCount = DZ.unmappedCount(txns);
    const uncatSpend = CATSPEND.find(c => c.catId === null);
    const uncatTotal = uncatSpend ? uncatSpend.amount
      : txns.reduce((s, t) => s + (t.amount < 0 && !t.categoryId ? -t.amount : 0), 0);

    const wb = DZ.wellbeing(txns, liquid || acctTotal || 0);

    Object.assign(window.DATA, {
      CATS: cats, catById, UNCAT,
      ACCOUNTS: state.accounts, acctTotal, liquid,
      YMS, MONTHS12: MONTHS, NETWORTH, CATSPEND, catSeries, catSeriesIncome,
      TXNS: txns, RULES, catCounts,
      uncatCount, uncatTotal, thisMonth, prevMonth, avgSpend, ytdSurplus, savingsRate,
      wb, hasData: txns.length > 0,
    });
  }

  window.refreshData = refreshData;
})();
