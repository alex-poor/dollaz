import { describe, it, expect } from 'vitest';
import { wellbeing, netWorthSeries, type Transaction, type Category } from '../src/index.js';

function tx(date: string, amount: number, categoryId: string | null = null): Transaction {
  return { id: date + amount, date, amount, description: 'x', raw: 'x', account: '', categoryId, importId: 'i' };
}

describe('wellbeing', () => {
  const txns = [
    tx('2026-04-01', 5000, 'inc'), tx('2026-04-05', -2000, 'g'),
    tx('2026-05-01', 5000, 'inc'), tx('2026-05-05', -2000, 'g'),
    tx('2026-06-01', 5000, 'inc'), tx('2026-06-05', -2000, 'g'),
  ];
  it('high savings rate + big buffer + fully categorised → high score', () => {
    const w = wellbeing(txns, 12000); // 6 months of $2000 expense
    expect(w.savingsRate).toBeCloseTo(0.6);
    expect(w.bufferMonths).toBeCloseTo(6);
    expect(w.uncatFraction).toBe(0);
    expect(w.score).toBe(100);
    expect(w.signals.every(s => s.ok)).toBe(true);
  });
  it('uncategorised spend lowers score and flips a signal', () => {
    const messy = [tx('2026-06-01', 5000, 'inc'), tx('2026-06-05', -2000, null)];
    const w = wellbeing(messy, 0);
    expect(w.uncatFraction).toBe(1);
    expect(w.signals.find(s => s.label.includes('nameless'))!.ok).toBe(false);
    expect(w.score).toBeLessThan(60);
  });
  it('handles no transactions (only the clean-ledger component contributes)', () => {
    const w = wellbeing([], 0);
    expect(w.score).toBeLessThanOrEqual(25);
    expect(w.signals[0]!.ok).toBe(false);
  });

  it('with categories, a one-off discretionary outlay does not sink the score', () => {
    const cats: Category[] = [
      { id: 'inc', name: 'Tithes', kind: 'income', color: '#1' },
      { id: 'g', name: 'Provisions', kind: 'expense', color: '#2', core: true },
      { id: 'h', name: 'Home Improvement', kind: 'expense', color: '#3', core: false },
    ];
    // Last month carries a big discretionary one-off on top of modest core spend.
    const oneOff = [
      tx('2026-05-01', 5000, 'inc'), tx('2026-05-05', -1000, 'g'),
      tx('2026-06-01', 5000, 'inc'), tx('2026-06-05', -1000, 'g'), tx('2026-06-20', -4000, 'h'),
    ];
    const allBasis = wellbeing(oneOff, 6000);          // no categories → counts the one-off
    const coreBasis = wellbeing(oneOff, 6000, cats);   // core only
    expect(coreBasis.savingsRate).toBeGreaterThan(allBasis.savingsRate); // one-off ignored
    expect(coreBasis.bufferMonths).toBeGreaterThan(allBasis.bufferMonths); // buffer = months of core
    expect(coreBasis.score).toBeGreaterThan(allBasis.score);
  });
});

describe('netWorthSeries', () => {
  it('ends exactly at the current total and has one point per month', () => {
    const txns = [tx('2026-05-01', 1000), tx('2026-06-01', 1000)];
    const s = netWorthSeries(txns, 50000);
    expect(s.length).toBe(2);
    expect(s[s.length - 1]!.value).toBe(50000);
    expect(s[0]!.ym).toBe('2026-05');
  });
  it('empty when no transactions', () => {
    expect(netWorthSeries([], 100)).toEqual([]);
  });
});
