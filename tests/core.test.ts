import { describe, it, expect } from 'vitest';
import {
  parseCsv, parseAmount, parseDate, normalizeDescription, suggestMerchant,
  prepareCsv, guessMapping, buildTransactions,
  applyRules, groupUnmapped, unmappedCount,
  dedupe, txnKey,
  summarize, monthlyTotals, byCategoryTotals, byCategoryOverTime, monthRange,
  project, linearRegression,
  type Rule, type ColumnMapping,
} from '../src/index.js';

describe('parseAmount', () => {
  it('handles currency symbols, thousands, negatives, parentheses', () => {
    expect(parseAmount('$1,234.56')).toBe(1234.56);
    expect(parseAmount('-12.30')).toBe(-12.3);
    expect(parseAmount('(45.00)')).toBe(-45);
    expect(parseAmount('1.234,56')).toBe(1234.56); // EU format
    expect(parseAmount('12,50')).toBe(12.5);       // EU decimal comma
    expect(parseAmount('1,234')).toBe(1234);       // US thousands
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('parseDate', () => {
  it('parses ISO, named months, and ambiguous numeric dates', () => {
    expect(parseDate('2026-06-12')).toBe('2026-06-12');
    expect(parseDate('12/06/2026', 'DMY')).toBe('2026-06-12');
    expect(parseDate('06/12/2026', 'MDY')).toBe('2026-06-12');
    expect(parseDate('25/12/2025', 'auto')).toBe('2025-12-25'); // day>12 → day-first
    expect(parseDate('5 Jan 2026')).toBe('2026-01-05');
    expect(parseDate('not a date')).toBeNull();
  });
});

describe('normalize / suggestMerchant', () => {
  it('collapses noise into a clean merchant label', () => {
    expect(normalizeDescription('  Woolworths   1234  ')).toBe('WOOLWORTHS 1234');
    expect(suggestMerchant('WOOLWORTHS 1234 SYDNEY AU 12/06')).toBe('WOOLWORTHS SYDNEY');
    expect(suggestMerchant('EFTPOS DEBIT CARD PURCHASE NETFLIX.COM')).toContain('NETFLIX');
  });
});

describe('csv parsing', () => {
  it('handles quoted fields with commas and detects delimiter', () => {
    const { rows, delimiter } = parseCsv('a,b,c\n"1,000",x,"he said ""hi"""\n');
    expect(delimiter).toBe(',');
    expect(rows[1]).toEqual(['1,000', 'x', 'he said "hi"']);
  });
  it('detects semicolon delimiter', () => {
    expect(parseCsv('a;b\n1;2').delimiter).toBe(';');
  });
});

const SAMPLE = `Date,Description,Amount,Balance
12/06/2026,WOOLWORTHS 1234 SYDNEY,-85.40,1000.00
11/06/2026,SALARY ACME PTY LTD,3200.00,1085.40
10/06/2026,NETFLIX.COM,-15.99,2.00
09/06/2026,SOME RANDOM CAFE,-6.50,17.99
`;

describe('import pipeline', () => {
  it('prepares, guesses mapping, and builds transactions', () => {
    const prepared = prepareCsv(SAMPLE);
    expect(prepared.hasHeader).toBe(true);
    expect(prepared.rows.length).toBe(4);

    const mapping = guessMapping(prepared.headers);
    expect(mapping.date).toBe('Date');
    expect(mapping.description).toBe('Description');
    expect(mapping.amount).toBe('Amount');

    const { transactions, skipped } = buildTransactions(prepared, { ...mapping, dateFormat: 'DMY' }, 'imp-1');
    expect(skipped).toBe(0);
    expect(transactions.length).toBe(4);
    expect(transactions[0]!.amount).toBe(-85.4);
    expect(transactions[1]!.amount).toBe(3200);
    expect(transactions[0]!.date).toBe('2026-06-12');
  });

  it('resolves debit/credit column pairs', () => {
    const csv = 'Date,Details,Debit,Credit\n01/01/2026,RENT,1500,\n02/01/2026,REFUND,,40\n';
    const prepared = prepareCsv(csv);
    const m: ColumnMapping = {
      date: 'Date', description: 'Details', amount: null, debit: 'Debit', credit: 'Credit',
      account: null, flipSign: false, dateFormat: 'DMY', hasHeader: true,
    };
    const { transactions } = buildTransactions(prepared, m, 'imp-2');
    expect(transactions[0]!.amount).toBe(-1500);
    expect(transactions[1]!.amount).toBe(40);
  });
});

describe('categorisation', () => {
  const rules: Rule[] = [
    { id: 'r1', pattern: 'WOOLWORTHS', categoryId: 'c-groceries', createdAt: 0 },
    { id: 'r2', pattern: 'NETFLIX', categoryId: 'c-fun', createdAt: 0 },
    { id: 'r3', pattern: 'SALARY', categoryId: 'c-income', createdAt: 0 },
  ];
  it('applies rules and surfaces unmapped groups', () => {
    const prepared = prepareCsv(SAMPLE);
    const mapping = guessMapping(prepared.headers);
    const { transactions } = buildTransactions(prepared, { ...mapping, dateFormat: 'DMY' }, 'imp-1');
    const categorised = applyRules(transactions, rules);
    expect(categorised.find(t => t.raw.includes('WOOLWORTHS'))!.categoryId).toBe('c-groceries');
    expect(categorised.find(t => t.raw.includes('SALARY'))!.categoryId).toBe('c-income');

    const unmapped = groupUnmapped(categorised);
    expect(unmappedCount(categorised)).toBe(1); // only the random cafe
    expect(unmapped[0]!.merchant).toContain('CAFE');
  });
  it('prefers the longer (more specific) matching rule', () => {
    const r: Rule[] = [
      { id: 'a', pattern: 'WOOLWORTHS', categoryId: 'general', createdAt: 0 },
      { id: 'b', pattern: 'WOOLWORTHS METRO', categoryId: 'specific', createdAt: 0 },
    ];
    const t = [{ id: '1', date: '2026-01-01', amount: -5, raw: 'WOOLWORTHS METRO 99', description: 'WOOLWORTHS METRO 99', account: '', categoryId: null, importId: 'i' }];
    expect(applyRules(t, r)[0]!.categoryId).toBe('specific');
  });
});

describe('dedupe', () => {
  it('drops rows already present and within-batch duplicates', () => {
    const base = { date: '2026-01-01', amount: -10, raw: 'X', account: '' };
    const existing = [{ ...base, id: 'a', description: 'X', categoryId: null, importId: 'i1' }];
    const incoming = [
      { ...base, id: 'b', description: 'X', categoryId: null, importId: 'i2' }, // dup of existing
      { ...base, id: 'c', amount: -20, description: 'Y', raw: 'Y', categoryId: null, importId: 'i2' },
      { ...base, id: 'd', amount: -20, description: 'Y', raw: 'Y', categoryId: null, importId: 'i2' }, // dup of c
    ];
    const res = dedupe(existing, incoming);
    expect(res.fresh.length).toBe(1);
    expect(res.duplicates).toBe(2);
  });
});

describe('analysis', () => {
  const txns = [
    { id: '1', date: '2026-01-15', amount: -100, raw: 'A', description: 'A', account: '', categoryId: 'g', importId: 'i' },
    { id: '2', date: '2026-01-20', amount: 2000, raw: 'PAY', description: 'PAY', account: '', categoryId: 'inc', importId: 'i' },
    { id: '3', date: '2026-02-10', amount: -150, raw: 'A', description: 'A', account: '', categoryId: 'g', importId: 'i' },
    { id: '4', date: '2026-03-01', amount: -50, raw: 'B', description: 'B', account: '', categoryId: null, importId: 'i' },
  ];
  const cats = [
    { id: 'g', name: 'Groceries', kind: 'expense' as const, color: '#000' },
    { id: 'inc', name: 'Income', kind: 'income' as const, color: '#0f0' },
  ];
  it('summarises totals', () => {
    const s = summarize(txns);
    expect(s.income).toBe(2000);
    expect(s.expense).toBe(300);
    expect(s.net).toBe(1700);
    expect(s.firstDate).toBe('2026-01-15');
  });
  it('builds a zero-filled month range', () => {
    expect(monthRange(txns)).toEqual(['2026-01', '2026-02', '2026-03']);
  });
  it('totals expenses per month', () => {
    const mt = monthlyTotals(txns);
    expect(mt.map(m => m.expense)).toEqual([100, 150, 50]);
    expect(mt[0]!.income).toBe(2000);
  });
  it('totals by category and over time', () => {
    const ct = byCategoryTotals(txns, cats, 'expense');
    expect(ct[0]!.name).toBe('Groceries');
    expect(ct[0]!.total).toBe(250);
    expect(ct.find(c => c.categoryId === '__uncategorized__')!.total).toBe(50);

    const ot = byCategoryOverTime(txns, cats, 'expense');
    expect(ot.months.length).toBe(3);
    const groceries = ot.series.find(s => s.name === 'Groceries')!;
    expect(groceries.amounts).toEqual([100, 150, 0]);
  });
});

describe('projection', () => {
  it('linear regression recovers a known slope', () => {
    const { slope, intercept } = linearRegression([0, 2, 4, 6]);
    expect(slope).toBeCloseTo(2);
    expect(intercept).toBeCloseTo(0);
  });
  it('avg projects a flat trailing mean', () => {
    const p = project([100, 200, 300], 3, 'avg', 3);
    expect(p.monthlyAverage).toBe(200);
    expect(p.forecast).toEqual([200, 200, 200]);
  });
  it('linear projects the trend and clamps at zero', () => {
    const p = project([100, 200, 300, 400], 2, 'linear');
    expect(p.forecast[0]).toBeCloseTo(500);
    expect(p.forecast[1]).toBeCloseTo(600);
    expect(project([100, 50, 0], 3, 'linear').forecast.every(v => v >= 0)).toBe(true);
  });
});
