// categorize.ts — apply retained rules to transactions and surface what's
// still unmapped so the UI can complete the mapping.
import type { Rule, Transaction, UnmappedGroup } from './types.js';
import { normalizeDescription, suggestMerchant, suggestPattern } from './normalize.js';

/** First rule whose (normalised) pattern is a substring of the transaction's
 *  normalised description. Longer patterns win ties so specific rules beat
 *  generic ones (e.g. "WOOLWORTHS METRO" over "WOOLWORTHS"). */
export function matchRule(description: string, rules: Rule[]): Rule | null {
  const desc = normalizeDescription(description);
  let best: Rule | null = null;
  for (const r of rules) {
    const p = (r.pattern || '').toUpperCase();
    if (p && desc.includes(p)) {
      if (!best || p.length > best.pattern.length) best = { ...r, pattern: p };
    }
  }
  return best ? rules.find(r => r.id === best!.id) || null : null;
}

/** Assign categoryId to every transaction that matches a rule and has no
 *  category yet. Existing manual categorisations are preserved unless `force`. */
export function applyRules(txns: Transaction[], rules: Rule[], force = false): Transaction[] {
  return txns.map(t => {
    if (t.categoryId && !force) return t;
    const rule = matchRule(t.raw || t.description, rules);
    return rule ? { ...t, categoryId: rule.categoryId } : t;
  });
}

/** Group still-uncategorised transactions by suggested merchant, biggest spend
 *  first, so the user can map each group with a single rule. */
export function groupUnmapped(txns: Transaction[]): UnmappedGroup[] {
  const groups = new Map<string, UnmappedGroup>();
  for (const t of txns) {
    if (t.categoryId) continue;
    const merchant = suggestMerchant(t.raw || t.description);
    const key = merchant.toUpperCase();
    let g = groups.get(key);
    if (!g) {
      g = {
        merchant,
        pattern: suggestPattern(t.raw || t.description),
        count: 0,
        total: 0,
        sampleRaw: t.raw || t.description,
        txnIds: [],
      };
      groups.set(key, g);
    }
    g.count++;
    g.total += t.amount;
    g.txnIds.push(t.id);
  }
  return [...groups.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

/** How many transactions still have no category. */
export function unmappedCount(txns: Transaction[]): number {
  return txns.reduce((n, t) => n + (t.categoryId ? 0 : 1), 0);
}
