import { describe, it, expect } from 'vitest';
import { runAiTool, AI_TOOLS, aiSystemPrompt, expenseSplit, type AiContext } from '../src/index.js';
import type { Transaction, Category, Account, Rule } from '../src/index.js';

const cats: Category[] = [
  { id: 'groc', name: 'Provisions', kind: 'expense', color: '#1' },
  { id: 'inc', name: 'Tithes', kind: 'income', color: '#2' },
  { id: 'xfer', name: 'Passage', kind: 'transfer', color: '#3' },
];
const rules: Rule[] = [
  { id: 'r1', pattern: 'COUNTDOWN', categoryId: 'groc', createdAt: 1 },
];
const accounts: Account[] = [
  { id: 'a1', name: 'Everyday', inst: 'Bank', kind: 'spending', balance: 4000, color: '#1', icon: 'card' },
  { id: 'a2', name: 'Reserve', inst: 'Bank', kind: 'saving', balance: 9000, color: '#2', icon: 'piggy' },
  { id: 'a3', name: 'Card', inst: 'Bank', kind: 'credit', balance: -500, color: '#3', icon: 'card' },
];

function tx(date: string, amount: number, opts: Partial<Transaction> = {}): Transaction {
  return { id: Math.random().toString(36).slice(2), date, amount, description: opts.raw || 'x', raw: opts.raw || 'x', account: 'a1', categoryId: null, importId: 'i', ...opts };
}

// Two months: income 5000/mo, COUNTDOWN groceries, a transfer that must be excluded.
const txns: Transaction[] = [
  tx('2026-01-05', 5000, { categoryId: 'inc', raw: 'SALARY' }),
  tx('2026-01-10', -300, { categoryId: 'groc', raw: 'COUNTDOWN 0420' }),
  tx('2026-01-15', -200, { raw: 'COUNTDOWN METRO' }),
  tx('2026-01-20', -1000, { transfer: true, raw: 'TRANSFER TO SAVINGS' }), // excluded
  tx('2026-02-05', 5000, { categoryId: 'inc', raw: 'SALARY' }),
  tx('2026-02-12', -400, { categoryId: 'groc', raw: 'COUNTDOWN 0420' }),
  tx('2026-02-18', -1000, { categoryId: 'xfer', raw: 'TO RESERVE' }), // excluded (transfer-kind sigil)
];

const ctx: AiContext = { transactions: txns, categories: cats, accounts, rules, currency: '$' };

describe('ai tool surface', () => {
  it('exposes a stable set of named, schema-bearing tools', () => {
    const names = AI_TOOLS.map(t => t.name);
    expect(names).toContain('overview');
    expect(names).toContain('forecast');
    for (const t of AI_TOOLS) {
      expect(typeof t.description).toBe('string');
      expect(t.input_schema.type).toBe('object');
    }
  });

  it('overview excludes transfers from income/expense', () => {
    const r: any = runAiTool('overview', {}, ctx);
    expect(r.income).toBe(10000);     // 2 × 5000, transfers excluded
    expect(r.expense).toBe(900);      // 300 + 200 + 400, both transfers excluded
    expect(r.net).toBe(9100);
    expect(r.netWorth).toBe(12500);   // 4000 + 9000 − 500
    expect(r.wellbeing.score).toBeGreaterThanOrEqual(0);
    expect(r.wellbeing.score).toBeLessThanOrEqual(100);
  });

  it('monthly_trend returns recent months only, transfers excluded', () => {
    const r: any = runAiTool('monthly_trend', { months: 1 }, ctx);
    expect(r.months).toHaveLength(1);
    expect(r.months[0].month).toBe('2026-02');
    expect(r.months[0].expense).toBe(400); // Feb COUNTDOWN only; transfer excluded
  });

  it('category_breakdown ranks sigils by spend with names only (no raw rows)', () => {
    const r: any = runAiTool('category_breakdown', {}, ctx);
    const provisions = r.categories.find((c: any) => c.name === 'Provisions');
    expect(provisions.total).toBe(700); // 300 + 400
    // never leaks descriptions / raw rows
    expect(JSON.stringify(r)).not.toContain('COUNTDOWN');
  });

  it('merchant_spend groups by payee and filters by query', () => {
    const r: any = runAiTool('merchant_spend', { query: 'countdown' }, ctx);
    const total = r.merchants.reduce((s: number, m: any) => s + m.total, 0);
    expect(total).toBe(900); // 300 + 200 + 400 across the COUNTDOWN payees
  });

  it('category_trend without a name lists available categories', () => {
    const r: any = runAiTool('category_trend', {}, ctx);
    expect(r.availableCategories).toContain('Provisions');
  });

  it('forecast projects a surplus given income above spend', () => {
    const r: any = runAiTool('forecast', { horizon: 3 }, ctx);
    expect(r.projection).toHaveLength(3);
    expect(r.verdict).toBe('surplus');
  });

  it('unknown tool returns an error rather than throwing', () => {
    const r: any = runAiTool('nonesuch', {}, ctx);
    expect(r.error).toMatch(/Unknown tool/);
  });

  it('system prompt embeds the currency mark and forbids inventing figures', () => {
    const p = aiSystemPrompt({ currency: '£', today: '2026-06-18' });
    expect(p).toContain('£');
    expect(p.toLowerCase()).toContain('never invent');
    expect(p).toContain('2026-06-18');
  });
});

describe('core vs discretionary spend', () => {
  const cats2: Category[] = [
    { id: 'g', name: 'Provisions', kind: 'expense', color: '#1', core: true },
    { id: 'h', name: 'Home Improvement', kind: 'expense', color: '#2', core: false },
    { id: 'i', name: 'Tithes', kind: 'income', color: '#3' },
  ];
  const txns2: Transaction[] = [
    tx('2026-01-05', 5000, { categoryId: 'i' }),
    tx('2026-01-10', -500, { categoryId: 'g' }),
    tx('2026-01-15', -3000, { categoryId: 'h' }), // one-off landscaping
    tx('2026-02-05', 5000, { categoryId: 'i' }),
    tx('2026-02-10', -500, { categoryId: 'g' }),
  ];
  const ctx2: AiContext = { transactions: txns2, categories: cats2, accounts: [], rules: [], currency: '$' };

  it('overview splits core vs discretionary', () => {
    const r: any = runAiTool('overview', {}, ctx2);
    expect(r.expense).toBe(4000);
    expect(r.coreExpense).toBe(1000);
    expect(r.discretionaryExpense).toBe(3000);
  });

  it('forecast defaults to core-only and excludes the one-off', () => {
    const core: any = runAiTool('forecast', {}, ctx2);       // default coreOnly true
    const all: any = runAiTool('forecast', { coreOnly: false }, ctx2);
    expect(core.basis).toBe('core');
    expect(all.basis).toBe('all');
    expect(core.verdict).toBe('surplus');                    // 5000 income vs ~500 core
    expect(core.excludedDiscretionaryMonthly).toBeGreaterThan(0);
    expect(all.excludedDiscretionaryMonthly).toBe(0);
  });

  it('category_breakdown flags discretionary sigils', () => {
    const r: any = runAiTool('category_breakdown', {}, ctx2);
    expect(r.categories.find((c: any) => c.name === 'Home Improvement').discretionary).toBe(true);
    expect(r.categories.find((c: any) => c.name === 'Provisions').discretionary).toBe(false);
  });

  it('expenseSplit aligns months and routes discretionary correctly', () => {
    const s = expenseSplit(txns2, cats2);
    expect(s.core).toEqual([500, 500]);
    expect(s.discretionary).toEqual([3000, 0]);
  });
});

describe('find_transactions (individual rows)', () => {
  it('returns individual rows matching a query, transfers excluded by default', () => {
    const r: any = runAiTool('find_transactions', { query: 'countdown' }, ctx);
    expect(r.matched).toBe(3); // the two COUNTDOWN tolls + the metro one; transfers excluded
    expect(r.transactions.every((t: any) => /COUNTDOWN/i.test(t.description) || /COUNTDOWN/i.test(t.merchant))).toBe(true);
    expect(r.transactions[0]).toHaveProperty('merchant');
    expect(r.transactions[0]).toHaveProperty('sigil');
  });

  it('sort=largest with a limit caps and flags truncation', () => {
    const r: any = runAiTool('find_transactions', { type: 'expense', sort: 'largest', limit: 2 }, ctx);
    expect(r.returned).toBe(2);
    expect(r.truncated).toBe(true);
    expect(Math.abs(r.transactions[0].amount)).toBeGreaterThanOrEqual(Math.abs(r.transactions[1].amount));
  });

  it('includeTransfers surfaces internal transfers', () => {
    const r: any = runAiTool('find_transactions', { query: 'reserve', includeTransfers: true }, ctx);
    expect(r.matched).toBe(1);
  });

  it('an unknown category returns a note, not rows', () => {
    const r: any = runAiTool('find_transactions', { category: 'nonesuch' }, ctx);
    expect(r.note).toMatch(/No such category/);
    expect(r.transactions).toHaveLength(0);
  });
});
