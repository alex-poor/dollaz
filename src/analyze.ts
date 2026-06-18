// analyze.ts — aggregations for the dashboard and category analysis screens.
import type { Category, Transaction } from './types.js';

export function monthOf(dateISO: string): string {
  return dateISO.slice(0, 7); // yyyy-mm
}

/** Inclusive list of yyyy-mm strings from the earliest to latest month present. */
export function monthRange(txns: Transaction[]): string[] {
  if (!txns.length) return [];
  let min = txns[0]!.date.slice(0, 7);
  let max = min;
  for (const t of txns) {
    const m = t.date.slice(0, 7);
    if (m < min) min = m;
    if (m > max) max = m;
  }
  const months: string[] = [];
  let [y, mo] = min.split('-').map(Number) as [number, number];
  const [my, mm] = max.split('-').map(Number) as [number, number];
  while (y < my || (y === my && mo <= mm)) {
    months.push(`${y}-${String(mo).padStart(2, '0')}`);
    mo++; if (mo > 12) { mo = 1; y++; }
  }
  return months;
}

export interface Summary {
  income: number;       // sum of positive amounts (income/transfer-in)
  expense: number;      // absolute sum of negative amounts
  net: number;          // income - expense
  count: number;
  firstDate: string | null;
  lastDate: string | null;
}

export function summarize(txns: Transaction[]): Summary {
  let income = 0, expense = 0, firstDate: string | null = null, lastDate: string | null = null;
  for (const t of txns) {
    if (t.amount >= 0) income += t.amount; else expense += -t.amount;
    if (firstDate == null || t.date < firstDate) firstDate = t.date;
    if (lastDate == null || t.date > lastDate) lastDate = t.date;
  }
  return { income, expense, net: income - expense, count: txns.length, firstDate, lastDate };
}

export interface MonthlyTotal { month: string; income: number; expense: number; net: number; }

/** Income / expense / net per month across the full range (zero-filled). */
export function monthlyTotals(txns: Transaction[]): MonthlyTotal[] {
  const months = monthRange(txns);
  const map = new Map<string, MonthlyTotal>();
  for (const m of months) map.set(m, { month: m, income: 0, expense: 0, net: 0 });
  for (const t of txns) {
    const row = map.get(monthOf(t.date));
    if (!row) continue;
    if (t.amount >= 0) row.income += t.amount; else row.expense += -t.amount;
    row.net = row.income - row.expense;
  }
  return months.map(m => map.get(m)!);
}

/** A category is discretionary when its `core` flag is explicitly false;
 *  undefined or true means core (baseline/essential). */
export function isDiscretionary(cat?: Category | null): boolean {
  return !!cat && cat.core === false;
}

export interface ExpenseSplit { months: string[]; core: number[]; discretionary: number[]; }

/** Monthly expense split into core vs discretionary, aligned to the full range.
 *  Pass already-flow-filtered transactions (transfers excluded). Uncategorised
 *  spend counts as core (conservative — we don't drop unknowns from the baseline). */
export function expenseSplit(txns: Transaction[], categories: Category[]): ExpenseSplit {
  const months = monthRange(txns);
  const idx = new Map(months.map((m, i) => [m, i]));
  const disc = new Set(categories.filter(c => c.core === false).map(c => c.id));
  const core = months.map(() => 0);
  const discretionary = months.map(() => 0);
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const i = idx.get(monthOf(t.date));
    if (i == null) continue;
    if (t.categoryId && disc.has(t.categoryId)) discretionary[i]! += -t.amount;
    else core[i]! += -t.amount;
  }
  return { months, core, discretionary };
}

export interface CategoryTotal { categoryId: string; name: string; color: string; total: number; count: number; }

/** Absolute spend per category (expenses only by default), biggest first. */
export function byCategoryTotals(txns: Transaction[], categories: Category[], kind: 'expense' | 'income' = 'expense'): CategoryTotal[] {
  const cat = new Map(categories.map(c => [c.id, c]));
  const totals = new Map<string, CategoryTotal>();
  const UNCAT = '__uncategorized__';
  for (const t of txns) {
    if (kind === 'expense' && t.amount >= 0) continue;
    if (kind === 'income' && t.amount < 0) continue;
    const id = t.categoryId || UNCAT;
    const meta = cat.get(id);
    let row = totals.get(id);
    if (!row) {
      row = { categoryId: id, name: meta?.name || 'Uncategorised', color: meta?.color || '#9aa0a6', total: 0, count: 0 };
      totals.set(id, row);
    }
    row.total += Math.abs(t.amount);
    row.count++;
  }
  return [...totals.values()].sort((a, b) => b.total - a.total);
}

export interface CategorySeries {
  months: string[];
  series: { categoryId: string; name: string; color: string; amounts: number[] }[];
}

/** Per-category absolute amount per month — the longitudinal view. */
export function byCategoryOverTime(txns: Transaction[], categories: Category[], kind: 'expense' | 'income' = 'expense'): CategorySeries {
  const months = monthRange(txns);
  const mIndex = new Map(months.map((m, i) => [m, i]));
  const cat = new Map(categories.map(c => [c.id, c]));
  const UNCAT = '__uncategorized__';
  const rows = new Map<string, { categoryId: string; name: string; color: string; amounts: number[] }>();
  for (const t of txns) {
    if (kind === 'expense' && t.amount >= 0) continue;
    if (kind === 'income' && t.amount < 0) continue;
    const i = mIndex.get(monthOf(t.date));
    if (i == null) continue;
    const id = t.categoryId || UNCAT;
    let row = rows.get(id);
    if (!row) {
      const meta = cat.get(id);
      row = { categoryId: id, name: meta?.name || 'Uncategorised', color: meta?.color || '#9aa0a6', amounts: months.map(() => 0) };
      rows.set(id, row);
    }
    row.amounts[i]! += Math.abs(t.amount);
  }
  const series = [...rows.values()].sort((a, b) =>
    b.amounts.reduce((s, n) => s + n, 0) - a.amounts.reduce((s, n) => s + n, 0));
  return { months, series };
}
