// dedupe.ts — keep re-imports of overlapping date ranges from duplicating rows.
import type { Transaction } from './types.js';

/** Identity of a transaction for dedupe purposes: same day, same amount, same
 *  raw description and account is treated as the same transaction. */
export function txnKey(t: Pick<Transaction, 'date' | 'amount' | 'raw' | 'account'>): string {
  return [t.date, t.amount.toFixed(2), (t.raw || '').trim().toUpperCase(), (t.account || '').trim().toUpperCase()].join('::');
}

export interface DedupeResult {
  fresh: Transaction[];     // incoming rows not already present
  duplicates: number;       // how many incoming rows were dropped
}

/** Return only incoming transactions whose key isn't already present in
 *  `existing` (and aren't duplicated within the incoming batch itself). */
export function dedupe(existing: Transaction[], incoming: Transaction[]): DedupeResult {
  const seen = new Set(existing.map(txnKey));
  const fresh: Transaction[] = [];
  let duplicates = 0;
  for (const t of incoming) {
    const k = txnKey(t);
    if (seen.has(k)) { duplicates++; continue; }
    seen.add(k);
    fresh.push(t);
  }
  return { fresh, duplicates };
}
