import { describe, it, expect } from 'vitest';
import { merchantSummary, type Rule, type Transaction } from '../src/index.js';

function tx(id: string, date: string, amount: number, raw: string, cat: string | null = null, transfer = false): Transaction {
  return { id, date, amount, description: raw, raw, account: 'a', categoryId: cat, importId: 'i', transfer };
}
const rules: Rule[] = [
  { id: 'r1', pattern: 'COUNTDOWN', categoryId: 'groceries', createdAt: 0 },
  { id: 'r2', pattern: 'Z ENERGY', categoryId: 'transport', createdAt: 0 },
];

describe('merchantSummary', () => {
  const txns = [
    tx('1', '2026-05-02', -64.20, 'COUNTDOWN PONSONBY', 'groceries'),
    tx('2', '2026-06-11', -156.80, 'COUNTDOWN ALBANY', 'groceries'),
    tx('3', '2026-06-05', -5.50, 'Z ENERGY CALEDONIAN', 'transport'),
    tx('4', '2026-06-09', -38.20, 'MECCA NEWMARKET', null),       // unmapped
    tx('5', '2026-06-04', 3200, 'SALARY ACME', 'income'),          // income — excluded
    tx('6', '2026-06-06', -1000, 'TFR SAVINGS', null, true),       // transfer — excluded
  ];
  it('groups expenses by matched pattern, ranked by spend', () => {
    const rows = merchantSummary(txns, rules);
    expect(rows[0]!.key).toBe('COUNTDOWN');
    expect(rows[0]!.total).toBeCloseTo(221);
    expect(rows[0]!.count).toBe(2);
    expect(rows[0]!.mapped).toBe(true);
    expect(rows[0]!.categoryId).toBe('groceries');
    expect(rows[0]!.last).toBe('2026-06-11');
  });
  it('excludes income and transfers; surfaces unmapped merchants', () => {
    const rows = merchantSummary(txns, rules);
    expect(rows.some(r => /SALARY/.test(r.key))).toBe(false);
    expect(rows.some(r => /TFR|SAVINGS/.test(r.key))).toBe(false);
    const mecca = rows.find(r => r.key.includes('MECCA'));
    expect(mecca && mecca.mapped).toBe(false);
  });
  it('produces a monthly series when months are given', () => {
    const rows = merchantSummary(txns, rules, ['2026-05', '2026-06']);
    const cd = rows.find(r => r.key === 'COUNTDOWN')!;
    expect(cd.series).toEqual([64.2, 156.8]);
  });
});
