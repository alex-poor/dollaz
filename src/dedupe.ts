// dedupe.ts — keep re-imports of overlapping date ranges from duplicating rows.
import type { Transaction } from './types.js';

type Ident = Pick<Transaction, 'date' | 'amount' | 'raw' | 'account' | 'fitid'>;

const acctOf = (t: Ident): string => (t.account || '').trim().toUpperCase();
const fitOf = (t: Ident): string => (t.fitid || '').trim();

/** Composite identity for rows without a bank id: day + amount + raw + account. */
function compositeKey(t: Ident): string {
  return [t.date, t.amount.toFixed(2), (t.raw || '').trim().toUpperCase(), acctOf(t)].join('::');
}

/** Identity of a transaction for dedupe purposes. When the bank supplied a
 *  unique id (OFX FITID) we trust it; otherwise same day + amount + raw
 *  description + account is treated as the same transaction. */
export function txnKey(t: Ident): string {
  const fit = fitOf(t);
  if (fit) return 'FIT::' + acctOf(t) + '::' + fit;
  return compositeKey(t);
}

/** Two accounts are compatible for FITID matching when they're identical, or
 *  when either side is blank. Some banks omit the OFX ACCTID on export, so the
 *  same statement can arrive once with an account and once without; treating a
 *  blank account as a wildcard lets those reconcile instead of duplicating the
 *  whole statement. Distinct non-blank accounts never match on FITID alone. */
function acctCompatible(a: string, b: string): boolean {
  return a === b || !a || !b;
}

export interface DedupeResult {
  fresh: Transaction[];     // incoming rows not already present
  duplicates: number;       // how many incoming rows were dropped
}

/** Return only incoming transactions not already present in `existing` (and not
 *  duplicated within the incoming batch itself). A FITID identifies a
 *  transaction regardless of a missing/blank account; rows without a FITID fall
 *  back to the composite day+amount+description+account key. */
export function dedupe(existing: Transaction[], incoming: Transaction[]): DedupeResult {
  const byFitid = new Map<string, Set<string>>();  // fitid -> accounts seen with it
  const composite = new Set<string>();
  const index = (t: Ident): void => {
    const fit = fitOf(t);
    if (fit) {
      let accts = byFitid.get(fit);
      if (!accts) { accts = new Set(); byFitid.set(fit, accts); }
      accts.add(acctOf(t));
    } else {
      composite.add(compositeKey(t));
    }
  };
  const isDup = (t: Ident): boolean => {
    const fit = fitOf(t);
    if (fit) {
      const accts = byFitid.get(fit);
      if (!accts) return false;
      const a = acctOf(t);
      for (const b of accts) if (acctCompatible(a, b)) return true;
      return false;
    }
    return composite.has(compositeKey(t));
  };

  existing.forEach(index);
  const fresh: Transaction[] = [];
  let duplicates = 0;
  for (const t of incoming) {
    if (isDup(t)) { duplicates++; continue; }
    index(t);
    fresh.push(t);
  }
  return { fresh, duplicates };
}
