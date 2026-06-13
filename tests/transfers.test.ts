import { describe, it, expect } from 'vitest';
import { detectTransfers, markTransfers, type Transaction } from '../src/index.js';

function tx(id: string, date: string, amount: number, account: string): Transaction {
  return { id, date, amount, description: 'x', raw: 'x', account, categoryId: null, importId: 'i' };
}

describe('detectTransfers', () => {
  it('pairs an outflow with the opposite inflow in another account', () => {
    const txns = [
      tx('a', '2026-06-01', -1000, 'checking'),
      tx('b', '2026-06-02', 1000, 'savings'),
      tx('c', '2026-06-03', -50, 'checking'),   // real expense, single-sided
      tx('d', '2026-06-04', 3200, 'checking'),  // salary, single-sided
    ];
    const pairs = detectTransfers(txns);
    expect(pairs.length).toBe(1);
    expect([pairs[0]!.outId, pairs[0]!.inId].sort()).toEqual(['a', 'b']);
  });

  it('does not pair within the same account or beyond the window', () => {
    const sameAcct = [tx('a', '2026-06-01', -100, 'x'), tx('b', '2026-06-01', 100, 'x')];
    expect(detectTransfers(sameAcct)).toEqual([]);
    const tooFar = [tx('a', '2026-06-01', -100, 'x'), tx('b', '2026-06-20', 100, 'y')];
    expect(detectTransfers(tooFar, { windowDays: 4 })).toEqual([]);
  });

  it('needs account labels on both sides', () => {
    const noAcct = [tx('a', '2026-06-01', -100, ''), tx('b', '2026-06-02', 100, '')];
    expect(detectTransfers(noAcct)).toEqual([]);
  });

  it('matches a credit-card payment (checking out, card in)', () => {
    const txns = [tx('p', '2026-06-10', -1284.20, 'checking'), tx('q', '2026-06-11', 1284.20, 'visa')];
    expect(detectTransfers(txns).length).toBe(1);
  });

  it('markTransfers flags both sides', () => {
    const txns = [tx('a', '2026-06-01', -1000, 'checking'), tx('b', '2026-06-02', 1000, 'savings'), tx('c', '2026-06-03', -50, 'checking')];
    const { transactions, count } = markTransfers(txns);
    expect(count).toBe(2);
    expect(transactions.find(t => t.id === 'a')!.transfer).toBe(true);
    expect(transactions.find(t => t.id === 'b')!.transfer).toBe(true);
    expect(transactions.find(t => t.id === 'c')!.transfer).toBeUndefined();
  });
});
