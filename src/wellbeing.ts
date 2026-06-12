// wellbeing.ts — a 0–100 financial-wellbeing ("Augury") score plus a synthetic
// net-worth trajectory, derived from real transactions + current balances.
import type { Transaction } from './types.js';
import { monthlyTotals } from './analyze.js';

export interface Signal { label: string; ok: boolean; }
export interface Wellbeing {
  score: number;          // 0..100
  savingsRate: number;    // last month net / income (0..1, may be <0)
  bufferMonths: number;   // liquid balance / avg recent monthly expense
  uncatFraction: number;  // share of expense that is uncategorised (0..1)
  signals: Signal[];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Wellbeing combines three components, each clamped to a sensible target:
 *  - savings rate (target 20% of income kept)
 *  - emergency buffer (target 6 months of expenses in liquid balance)
 *  - share of spend that's been categorised (cleaner ledger = higher)
 */
export function wellbeing(txns: Transaction[], liquidBalance: number): Wellbeing {
  const months = monthlyTotals(txns);
  const recent = months.slice(-3);
  const avgExpense = recent.length ? recent.reduce((s, m) => s + m.expense, 0) / recent.length : 0;
  const last = months[months.length - 1];
  const savingsRate = last && last.income > 0 ? last.net / last.income : 0;
  const bufferMonths = avgExpense > 0 ? liquidBalance / avgExpense : (liquidBalance > 0 ? 6 : 0);

  let exp = 0, uncatExp = 0;
  for (const t of txns) {
    if (t.amount < 0) { exp += -t.amount; if (!t.categoryId) uncatExp += -t.amount; }
  }
  const uncatFraction = exp > 0 ? uncatExp / exp : 0;

  const score = Math.round(100 * (
    0.40 * clamp01(savingsRate / 0.2) +
    0.35 * clamp01(bufferMonths / 6) +
    0.25 * (1 - clamp01(uncatFraction))
  ));

  const signals: Signal[] = [
    { label: 'Less devoured than gathered', ok: savingsRate > 0 },
    { label: "A refuge from ruin laid by", ok: bufferMonths >= 3 },
    { label: 'No part of thy outflow left nameless', ok: uncatFraction < 0.05 },
  ];
  return { score, savingsRate, bufferMonths, uncatFraction, signals };
}

export interface NetWorthPoint { ym: string; value: number; }

/** A net-worth line per month: cumulative monthly net, shifted so the final
 *  point equals the present total of all account balances. */
export function netWorthSeries(txns: Transaction[], currentTotal: number): NetWorthPoint[] {
  const months = monthlyTotals(txns);
  if (!months.length) return [];
  const cum: number[] = [];
  let run = 0;
  for (const m of months) { run += m.net; cum.push(run); }
  const shift = currentTotal - cum[cum.length - 1]!;
  return months.map((m, i) => ({ ym: m.month, value: Math.round(cum[i]! + shift) }));
}
