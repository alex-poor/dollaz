// ofx.ts — parse OFX / QFX bank statements into canonical transactions.
// OFX comes in two flavours: legacy SGML (leaf tags often unclosed, e.g.
// "<TRNAMT>-12.50\n") and OFX 2.x XML (properly closed). A tag-value regex that
// reads up to the next '<' or line-end handles both.
import type { Transaction } from './types.js';
import { normalizeDescription } from './normalize.js';

function newId(): string { return 't-' + Math.random().toString(36).slice(2, 10); }

/** Read the first value of <TAG> within `block` (SGML-unclosed or XML-closed). */
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'));
  return m ? m[1]!.trim() : '';
}

/** OFX DTPOSTED is YYYYMMDD[HHMMSS][.xxx][tz]. Take the leading date. */
function ofxDate(v: string): string | null {
  const m = v.match(/^\s*(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

interface ParseResult { transactions: Transaction[]; skipped: number; }

export function parseOfx(text: string, importId: string): ParseResult {
  // Account id (if present) applies to all transactions in the file.
  const account = tag(text, 'ACCTID');
  const transactions: Transaction[] = [];
  let skipped = 0;

  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const block = m[1]!;
    const date = ofxDate(tag(block, 'DTPOSTED'));
    const amtRaw = tag(block, 'TRNAMT');
    const amount = amtRaw === '' ? NaN : Number(amtRaw.replace(/,/g, ''));
    if (!date || isNaN(amount)) { skipped++; continue; }
    const name = tag(block, 'NAME');
    const memo = tag(block, 'MEMO');
    const raw = [name, memo && memo !== name ? memo : ''].filter(Boolean).join(' ').trim() || tag(block, 'TRNTYPE');
    const fitid = tag(block, 'FITID');
    transactions.push({
      id: newId(),
      date,
      amount,
      raw,
      description: normalizeDescription(raw),
      account,
      categoryId: null,
      importId,
      ...(fitid ? { fitid } : {}),
    });
  }
  return { transactions, skipped };
}
