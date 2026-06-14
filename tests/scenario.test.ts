import { describe, it, expect } from 'vitest';
import { expenseShares, applyScenario } from '../src/index.js';

const cats = [
  { id: 'groceries', name: 'Provisions', color: '#000', values: [600, 600, 600] },
  { id: 'home', name: 'Stonework', color: '#111', values: [400, 400, 400] },
];
const totalExpense = [2000, 2000, 2000]; // groceries 30%, home 20%, other 50%

describe('expenseShares', () => {
  it('computes shares + an Unnamed remainder summing to 1', () => {
    const s = expenseShares(cats, totalExpense, 3);
    const g = s.find(x => x.id === 'groceries')!, h = s.find(x => x.id === 'home')!, o = s.find(x => x.id === '__other__')!;
    expect(g.share).toBeCloseTo(0.3);
    expect(h.share).toBeCloseTo(0.2);
    expect(o.share).toBeCloseTo(0.5);
    expect(s.reduce((a, x) => a + x.share, 0)).toBeCloseTo(1);
  });
});

describe('applyScenario', () => {
  const shares = expenseShares(cats, totalExpense, 3);
  const income = 1800, expF = [2000, 2000, 2000]; // baseline deficit −200/mo

  it('unchanged scenario equals baseline', () => {
    const r = applyScenario(income, expF, shares, {});
    expect(r.mult).toBeCloseTo(1);
    expect(r.scenNet).toEqual(r.baseNet);
    expect(r.baseNet[0]).toBe(-200);
  });

  it('stopping home improvement (20% share) turns deficit toward surplus', () => {
    const r = applyScenario(income, expF, shares, { home: 0 });
    expect(r.mult).toBeCloseTo(0.8);
    expect(r.monthlySaving).toBeCloseTo(400);       // 20% of 2000
    expect(r.scenNet[0]).toBeCloseTo(200);          // 1800 − 1600
    expect(r.baseNet[0]).toBe(-200);                // swing of +400
  });

  it('cutting groceries 50% yields the right per-category saving', () => {
    const r = applyScenario(income, expF, shares, { groceries: 0.5 });
    const g = r.rows.find(x => x.id === 'groceries')!;
    expect(g.baseMonthly).toBeCloseTo(600);
    expect(g.scenMonthly).toBeCloseTo(300);
    expect(g.saving).toBeCloseTo(300);
    expect(r.monthlySaving).toBeCloseTo(300);
  });
});
