import { describe, it, expect } from 'vitest';
import { cashflowForecast } from '../src/index.js';

describe('cashflowForecast', () => {
  it('stable 60% spend ratio on $5000 income → ~surplus of $2000', () => {
    const income = Array(8).fill(5000);
    const expenses = Array(8).fill(3000); // ratio 0.6
    const cf = cashflowForecast(income, expenses, 3);
    expect(cf.recentIncome).toBeCloseTo(5000);
    expect(cf.net.point[0]!).toBeCloseTo(2000, -1); // ~2000
    expect(cf.verdict).toBe('surplus');
    expect(cf.expense.point[0]!).toBeCloseTo(3000, -1);
  });

  it('rising spend ratio crossing 100% → projected deficit', () => {
    const income = Array(8).fill(5000);
    const expenses = [3500, 3800, 4100, 4400, 4700, 5000, 5300, 5600]; // ratio climbs past 1
    const cf = cashflowForecast(income, expenses, 3);
    expect(cf.net.point[cf.net.point.length - 1]!).toBeLessThan(0); // deficit
    expect(cf.verdict).toBe('deficit');
  });

  it('uses recent income level, not old income', () => {
    const income = [3000, 3000, 3000, 6000, 6000, 6000];
    const expenses = income.map(i => i * 0.5); // constant 50% ratio
    const cf = cashflowForecast(income, expenses, 2, { incomeWindow: 3 });
    expect(cf.recentIncome).toBeCloseTo(6000);
    expect(cf.net.point[0]!).toBeCloseTo(3000, -1); // 6000 * (1-0.5)
  });

  it('net interval widens and brackets the point', () => {
    const income = Array(8).fill(5000);
    const expenses = [2900, 3100, 3000, 3200, 2800, 3100, 3000, 3050];
    const cf = cashflowForecast(income, expenses, 3, { level: 80 });
    for (let h = 0; h < 3; h++) {
      expect(cf.net.upper[h]!).toBeGreaterThanOrEqual(cf.net.point[h]!);
      expect(cf.net.point[h]!).toBeGreaterThanOrEqual(cf.net.lower[h]!);
    }
  });
});
