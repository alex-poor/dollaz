// transfers.ts — detect internal transfers (incl. credit-card payments) between
// two imported accounts, so they can be excluded from income/expense totals.
// A transfer is an outflow in one account matched by an equal-and-opposite
// inflow in a *different* account within a few days.
import type { Transaction } from './types.js';

export interface TransferPair { outId: string; inId: string; amount: number; days: number; }

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
}
const cents = (n: number) => Math.round(Math.abs(n) * 100);

export interface DetectOpts { windowDays?: number; }

/** Greedily pair each outflow with the nearest unused equal-and-opposite inflow
 *  in a different account within `windowDays`. Requires both rows to carry an
 *  account label (empty-account rows can't be proven internal). */
export function detectTransfers(txns: Transaction[], opts: DetectOpts = {}): TransferPair[] {
  const windowDays = opts.windowDays ?? 4;
  const used = new Set<string>();
  const pairs: TransferPair[] = [];

  // Index inflows by cent-amount for quick lookup.
  const inflowsByAmt = new Map<number, Transaction[]>();
  for (const t of txns) {
    if (t.amount > 0 && t.account) {
      const k = cents(t.amount);
      (inflowsByAmt.get(k) || inflowsByAmt.set(k, []).get(k)!).push(t);
    }
  }

  const outflows = txns.filter(t => t.amount < 0 && t.account).sort((a, b) => a.date.localeCompare(b.date));
  for (const out of outflows) {
    if (used.has(out.id)) continue;
    const candidates = inflowsByAmt.get(cents(out.amount)) || [];
    let best: Transaction | null = null, bestDiff = Infinity;
    for (const c of candidates) {
      if (used.has(c.id) || c.account === out.account) continue;
      const dd = Math.abs(dayDiff(out.date, c.date));
      if (dd <= windowDays && dd < bestDiff) { best = c; bestDiff = dd; }
    }
    if (best) { used.add(out.id); used.add(best.id); pairs.push({ outId: out.id, inId: best.id, amount: Math.abs(out.amount), days: bestDiff }); }
  }
  return pairs;
}

/** Flat set of transaction ids that are part of a detected transfer pair. */
export function transferIds(pairs: TransferPair[]): Set<string> {
  const s = new Set<string>();
  for (const p of pairs) { s.add(p.outId); s.add(p.inId); }
  return s;
}

/** Mark detected transfers with `transfer: true` (leaving everything else as-is). */
export function markTransfers(txns: Transaction[], opts?: DetectOpts): { transactions: Transaction[]; count: number } {
  const ids = transferIds(detectTransfers(txns, opts));
  if (!ids.size) return { transactions: txns, count: 0 };
  return { transactions: txns.map(t => ids.has(t.id) ? { ...t, transfer: true } : t), count: ids.size };
}
