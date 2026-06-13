// ofx.ts — parse OFX / QFX bank statements into canonical transactions, and
// extract per-account metadata (id, type, statement balance) so accounts can be
// auto-created and their balances tracked from each import.
// OFX comes in two flavours: legacy SGML (leaf tags often unclosed, e.g.
// "<TRNAMT>-12.50\n") and OFX 2.x XML (properly closed). A tag-value regex that
// reads up to the next '<' or line-end handles both.
import type { AccountKind, Transaction } from './types.js';
import { normalizeDescription } from './normalize.js';

function newId(): string { return 't-' + Math.random().toString(36).slice(2, 10); }

/** Read the first value of <TAG> within `block` (SGML-unclosed or XML-closed). */
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'));
  return m ? m[1]!.trim() : '';
}

/** OFX DTPOSTED/DTASOF is YYYYMMDD[HHMMSS][.xxx][tz]. Take the leading date. */
function ofxDate(v: string): string | null {
  const m = v.match(/^\s*(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function num(v: string): number | null {
  if (v === '') return null;
  const n = Number(v.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

/** The LEDGERBAL balance (BALAMT/DTASOF) — read after the <LEDGERBAL> marker so
 *  we don't pick up AVAILBAL's BALAMT. */
function ledgerBalance(block: string): { balance: number | null; date: string | null } {
  const i = block.search(/<LEDGERBAL>/i);
  const sub = i >= 0 ? block.slice(i) : block;
  return { balance: num(tag(sub, 'BALAMT')), date: ofxDate(tag(sub, 'DTASOF')) };
}

function kindForType(acctType: string, isCC: boolean): AccountKind {
  if (isCC) return 'credit';
  const t = acctType.toUpperCase();
  if (t === 'CREDITLINE') return 'credit';
  if (t === 'SAVINGS' || t === 'MONEYMRKT' || t === 'CD') return 'saving';
  return 'spending';
}

export interface OfxAccount {
  id: string;            // ACCTID (also used as the transaction account label)
  kind: AccountKind;
  type: string;          // raw ACCTTYPE / 'CREDITLINE'
  balance: number | null;
  balanceDate: string | null;
}
export interface OfxResult { transactions: Transaction[]; skipped: number; accounts: OfxAccount[]; }

function parseTxns(block: string, account: string, importId: string): { transactions: Transaction[]; skipped: number } {
  const transactions: Transaction[] = [];
  let skipped = 0;
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const b = m[1]!;
    const date = ofxDate(tag(b, 'DTPOSTED'));
    const amount = num(tag(b, 'TRNAMT'));
    if (!date || amount == null) { skipped++; continue; }
    const name = tag(b, 'NAME'), memo = tag(b, 'MEMO');
    const raw = [name, memo && memo !== name ? memo : ''].filter(Boolean).join(' ').trim() || tag(b, 'TRNTYPE');
    const fitid = tag(b, 'FITID');
    transactions.push({ id: newId(), date, amount, raw, description: normalizeDescription(raw), account, categoryId: null, importId, ...(fitid ? { fitid } : {}) });
  }
  return { transactions, skipped };
}

export function parseOfx(text: string, importId: string): OfxResult {
  const transactions: Transaction[] = [];
  const accounts: OfxAccount[] = [];
  let skipped = 0;

  // Each bank/credit statement block carries its own account + balance.
  const blockRe = /<(STMTRS|CCSTMTRS)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let found = false;
  while ((m = blockRe.exec(text)) !== null) {
    found = true;
    const isCC = m[1]!.toUpperCase() === 'CCSTMTRS';
    const block = m[2]!;
    const id = tag(block, 'ACCTID');
    const type = isCC ? 'CREDITLINE' : tag(block, 'ACCTTYPE');
    const { balance, date } = ledgerBalance(block);
    if (id) accounts.push({ id, kind: kindForType(type, isCC), type, balance, balanceDate: date });
    const res = parseTxns(block, id, importId);
    transactions.push(...res.transactions);
    skipped += res.skipped;
  }

  if (!found) {
    // Fallback: no recognisable statement block — parse the whole document.
    const id = tag(text, 'ACCTID');
    const { balance, date } = ledgerBalance(text);
    if (id) accounts.push({ id, kind: 'spending', type: '', balance, balanceDate: date });
    const res = parseTxns(text, id, importId);
    transactions.push(...res.transactions);
    skipped += res.skipped;
  }
  return { transactions, skipped, accounts };
}
