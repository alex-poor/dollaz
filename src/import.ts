// import.ts — turn a parsed CSV + a column mapping into canonical transactions.
import type { ColumnMapping, Transaction } from './types.js';
import { parseCsv, headerSignature, looksLikeHeader } from './csv.js';
import { parseAmount, parseDate, normalizeDescription } from './normalize.js';

export interface PreparedCsv {
  headers: string[];        // column labels (synthesised "Column 1.." if no header)
  rows: string[][];         // data rows (header excluded)
  signature: string;        // for matching a remembered ImportFormat
  hasHeader: boolean;
}

/** Parse raw CSV text and split header from data rows. */
export function prepareCsv(text: string, hasHeaderHint?: boolean): PreparedCsv {
  const { rows } = parseCsv(text);
  if (rows.length === 0) return { headers: [], rows: [], signature: '', hasHeader: false };
  const hasHeader = hasHeaderHint ?? looksLikeHeader(rows[0]!);
  if (hasHeader) {
    const headers = rows[0]!.map(h => h.trim());
    return { headers, rows: rows.slice(1), signature: headerSignature(headers), hasHeader: true };
  }
  const width = Math.max(...rows.map(r => r.length));
  const headers = Array.from({ length: width }, (_, i) => `Column ${i + 1}`);
  return { headers, rows, signature: 'noheader|' + width, hasHeader: false };
}

export interface BuildResult {
  transactions: Transaction[];
  skipped: number;          // rows that couldn't be parsed (bad date/amount)
}

function id(): string { return 't-' + Math.random().toString(36).slice(2, 10); }

/** Resolve a transaction's signed amount from the mapping. */
function resolveAmount(cell: (col: string | null) => string, m: ColumnMapping): number | null {
  if (m.amount) {
    const a = parseAmount(cell(m.amount));
    if (a == null) return null;
    return m.flipSign ? -a : a;
  }
  // Debit/credit pair: debit is an outflow (negative), credit an inflow.
  const debit = m.debit ? parseAmount(cell(m.debit)) : null;
  const credit = m.credit ? parseAmount(cell(m.credit)) : null;
  if (debit != null && debit !== 0) return -Math.abs(debit);
  if (credit != null && credit !== 0) return Math.abs(credit);
  return null;
}

/** Build canonical transactions from prepared rows under a mapping. */
export function buildTransactions(prepared: PreparedCsv, mapping: ColumnMapping, importId: string): BuildResult {
  const colIndex = new Map<string, number>();
  prepared.headers.forEach((h, i) => colIndex.set(h, i));
  const cell = (row: string[]) => (col: string | null): string =>
    col != null && colIndex.has(col) ? (row[colIndex.get(col)!] ?? '') : '';

  const transactions: Transaction[] = [];
  let skipped = 0;
  for (const row of prepared.rows) {
    const get = cell(row);
    const date = mapping.date ? parseDate(get(mapping.date), mapping.dateFormat) : null;
    const amount = resolveAmount(get, mapping);
    const raw = mapping.description ? get(mapping.description) : '';
    if (!date || amount == null) { skipped++; continue; }
    transactions.push({
      id: id(),
      date,
      amount,
      raw,
      description: normalizeDescription(raw),
      account: mapping.account ? get(mapping.account).trim() : '',
      categoryId: null,
      importId,
    });
  }
  return { transactions, skipped };
}

/** A best-guess column mapping for an unrecognised file, by header-name
 *  keyword matching. The user reviews/edits this before committing. */
export function guessMapping(headers: string[]): ColumnMapping {
  const find = (...keys: string[]): string | null => {
    for (const h of headers) {
      const low = h.toLowerCase();
      if (keys.some(k => low.includes(k))) return h;
    }
    return null;
  };
  const amount = find('amount', 'value');
  const debit = find('debit', 'withdrawal', 'paid out', 'money out');
  const credit = find('credit', 'deposit', 'paid in', 'money in');
  return {
    date: find('date', 'posted', 'transaction date'),
    description: find('description', 'narrative', 'details', 'payee', 'memo', 'reference', 'particulars'),
    amount: debit || credit ? null : amount,
    debit: debit || null,
    credit: credit || null,
    account: find('account'),
    flipSign: false,
    dateFormat: 'auto',
    hasHeader: true,
  };
}
