// qif.ts — parse QIF (Quicken Interchange Format) into canonical transactions.
// QIF is line-based: one letter code per line, records terminated by a '^' line.
//   D=date  T/U=amount  P=payee  M=memo  N=number/cheque  L=category  A=address
// There is no unique id and the date format is bank-dependent, so dedupe falls
// back to the date+amount+description hash and the date format may need setting.
import type { DateFormat, Transaction } from './types.js';
import { normalizeDescription, parseAmount, parseDate } from './normalize.js';

function newId(): string { return 't-' + Math.random().toString(36).slice(2, 10); }

interface ParseResult { transactions: Transaction[]; skipped: number; }

export function parseQif(text: string, importId: string, dateFormat: DateFormat = 'auto'): ParseResult {
  const transactions: Transaction[] = [];
  let skipped = 0;
  let cur: { D?: string; T?: string; P?: string; M?: string } = {};

  const flush = () => {
    if (cur.D == null && cur.T == null && cur.P == null) { cur = {}; return; }
    const date = cur.D != null ? parseDate(cur.D, dateFormat) : null;
    const amount = cur.T != null ? parseAmount(cur.T) : null;
    if (!date || amount == null) { skipped++; cur = {}; return; }
    const raw = [cur.P || '', cur.M && cur.M !== cur.P ? cur.M : ''].filter(Boolean).join(' ').trim();
    transactions.push({
      id: newId(), date, amount, raw,
      description: normalizeDescription(raw),
      account: '', categoryId: null, importId,
    });
    cur = {};
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, '');
    if (line === '') continue;
    if (line.startsWith('!')) continue;       // header (e.g. !Type:Bank)
    if (line[0] === '^') { flush(); continue; }
    const code = line[0];
    const val = line.slice(1).trim();
    if (code === 'D') cur.D = val;
    else if (code === 'T' || code === 'U') cur.T = val;   // U mirrors T in some exports
    else if (code === 'P') cur.P = val;
    else if (code === 'M') cur.M = val;
  }
  flush(); // final record may not be '^'-terminated
  return { transactions, skipped };
}
