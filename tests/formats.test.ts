import { describe, it, expect } from 'vitest';
import { parseOfx, parseQif, detectFormat, dedupe, applyRules, type Rule } from '../src/index.js';

const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>AUD
<BANKACCTFROM><BANKID>062000<ACCTID>12345678<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260602120000[+10:EST]
<TRNAMT>-155.60
<FITID>2026060201
<NAME>WOOLWORTHS 1234 SYDNEY
<MEMO>PURCHASE
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260601
<TRNAMT>4200.00
<FITID>2026060101
<NAME>SALARY ACME PTY LTD
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

const OFX_XML = `<?xml version="1.0"?>
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260605</DTPOSTED><TRNAMT>-41.20</TRNAMT><FITID>x9</FITID><NAME>UBER EATS</NAME></STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

const QIF = `!Type:Bank
D02/06/2026
T-155.60
PWOOLWORTHS 1234 SYDNEY
MPURCHASE
^
D01/06/2026
T4200.00
PSALARY ACME PTY LTD
^`;

describe('detectFormat', () => {
  it('sniffs by extension and content', () => {
    expect(detectFormat('export.ofx', '')).toBe('ofx');
    expect(detectFormat('x.txt', OFX_SGML)).toBe('ofx');
    expect(detectFormat('export.qif', '')).toBe('qif');
    expect(detectFormat('x.txt', QIF)).toBe('qif');
    expect(detectFormat('export.csv', 'Date,Amount\n1,2')).toBe('csv');
  });
});

describe('parseOfx', () => {
  it('parses SGML (unclosed tags), account, fitid, signed amounts', () => {
    const { transactions, skipped } = parseOfx(OFX_SGML, 'imp');
    expect(skipped).toBe(0);
    expect(transactions.length).toBe(2);
    const wool = transactions[0]!;
    expect(wool.date).toBe('2026-06-02');
    expect(wool.amount).toBe(-155.6);
    expect(wool.account).toBe('12345678');
    expect(wool.fitid).toBe('2026060201');
    expect(wool.raw).toContain('WOOLWORTHS');
    expect(transactions[1]!.amount).toBe(4200);
  });
  it('parses XML (closed tags)', () => {
    const { transactions } = parseOfx(OFX_XML, 'imp');
    expect(transactions.length).toBe(1);
    expect(transactions[0]!.amount).toBe(-41.2);
    expect(transactions[0]!.date).toBe('2026-06-05');
  });
  it('FITID makes re-import dedupe exact even if descriptions differ', () => {
    const first = parseOfx(OFX_SGML, 'imp1').transactions;
    const second = parseOfx(OFX_SGML, 'imp2').transactions;
    const res = dedupe(first, second);
    expect(res.fresh.length).toBe(0);
    expect(res.duplicates).toBe(2);
  });
});

describe('parseQif', () => {
  it('parses records terminated by ^ and the trailing one', () => {
    const { transactions, skipped } = parseQif(QIF, 'imp', 'DMY');
    expect(skipped).toBe(0);
    expect(transactions.length).toBe(2);
    expect(transactions[0]!.date).toBe('2026-06-02');
    expect(transactions[0]!.amount).toBe(-155.6);
    expect(transactions[0]!.raw).toContain('WOOLWORTHS');
  });
  it('feeds the normal categorisation pipeline', () => {
    const rules: Rule[] = [{ id: 'r', pattern: 'WOOLWORTHS', categoryId: 'c-groceries', createdAt: 0 }];
    const cat = applyRules(parseQif(QIF, 'imp', 'DMY').transactions, rules);
    expect(cat.find(t => t.raw.includes('WOOLWORTHS'))!.categoryId).toBe('c-groceries');
  });
});
