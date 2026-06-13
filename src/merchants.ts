// merchants.ts — group spending by merchant/payee. A transaction's merchant is
// the pattern of the rule that categorised it (e.g. "COUNTDOWN"); unmapped rows
// fall back to a cleaned merchant guess. Expenses only; transfers excluded.
import type { Rule, Transaction } from './types.js';
import { matchRule } from './categorize.js';
import { suggestMerchant } from './normalize.js';

export interface MerchantRow {
  key: string;             // merchant identity (matched rule pattern, or guessed)
  label: string;
  categoryId: string | null; // category it maps to, if any
  mapped: boolean;         // did a rule match it
  total: number;           // absolute spend
  count: number;
  last: string;            // most recent date
  series: number[];        // monthly spend aligned to `months` (empty if none given)
}

/** Ranked merchant spend. Pass `months` (e.g. YMS) to also get a per-merchant
 *  monthly series for trend sparklines. */
export function merchantSummary(txns: Transaction[], rules: Rule[], months?: string[]): MerchantRow[] {
  const mIndex = months ? Object.fromEntries(months.map((m, i) => [m, i])) : null;
  const map = new Map<string, MerchantRow>();
  for (const t of txns) {
    if (t.transfer || t.amount >= 0) continue;
    const rule = matchRule(t.raw || t.description, rules);
    const key = rule ? rule.pattern.toUpperCase() : suggestMerchant(t.raw || t.description);
    let row = map.get(key);
    if (!row) {
      row = { key, label: key, categoryId: rule ? rule.categoryId : null, mapped: !!rule, total: 0, count: 0, last: '', series: months ? months.map(() => 0) : [] };
      map.set(key, row);
    }
    row.total += -t.amount;
    row.count++;
    if (t.date > row.last) row.last = t.date;
    if (mIndex) { const i = mIndex[t.date.slice(0, 7)]; if (i != null) row.series[i]! += -t.amount; }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
