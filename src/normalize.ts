// normalize.ts — clean messy bank descriptions, and parse amounts/dates.
import type { DateFormat } from './types.js';

/** Tokens that are pure noise in bank descriptions and should be stripped
 *  before we try to identify a merchant. */
const NOISE = [
  /\bVALUE DATE\b.*$/i,
  /\bCARD\s*\d+\b/i,
  /\bXX+\d+\b/i,                 // masked card numbers e.g. XXXX1234
  /\bAUS?\b/gi,                  // AU / AUS country tags
  /\bNZ\b/g,
  /\bEFTPOS\b/gi,
  /\bVISA(?: PURCHASE)?\b/gi,
  /\bDEBIT CARD PURCHASE\b/gi,
  /\bPURCHASE\b/gi,
  /\bPAYMENT( TO| FROM)?\b/gi,
  /\bDIRECT (DEBIT|CREDIT)\b/gi,
  /\bRECEIPT\b/gi,
];

/** Normalise a raw description into an uppercase, whitespace-collapsed string
 *  suitable for substring rule-matching and for display. */
export function normalizeDescription(raw: string): string {
  let s = (raw || '').toUpperCase();
  s = s.replace(/[#*]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** A shorter, human label proposed as the merchant for an unmapped group.
 *  Strips trailing reference numbers, dates, locations and known noise. */
export function suggestMerchant(raw: string): string {
  let s = normalizeDescription(raw);
  for (const re of NOISE) s = s.replace(re, ' ');
  // Drop trailing long digit runs (reference / receipt numbers).
  s = s.replace(/\b\d{4,}\b/g, ' ');
  // Drop inline date-like tokens (dd/mm, dd/mm/yy).
  s = s.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  // Keep the first few meaningful words — usually the merchant name.
  const words = s.split(' ').filter(Boolean);
  const label = words.slice(0, 4).join(' ');
  return label || normalizeDescription(raw) || raw.trim();
}

/** The substring pattern proposed as a new rule for a merchant group.
 *  Uses the first 1–3 words of the suggested merchant. */
export function suggestPattern(raw: string): string {
  const merchant = suggestMerchant(raw);
  const words = merchant.split(' ').filter(Boolean);
  return words.slice(0, 3).join(' ');
}

/** Parse a money string like "$1,234.56", "(45.00)", "-12.30", "1.234,56". */
export function parseAmount(value: string): number | null {
  if (value == null) return null;
  let s = String(value).trim();
  if (s === '') return null;
  let negative = false;
  // Accounting parentheses denote negatives.
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  s = s.replace(/[^\d.,\-]/g, ''); // drop currency symbols, spaces, letters
  if (s.startsWith('-')) { negative = true; }
  s = s.replace(/-/g, '');
  if (s === '') return null;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    // Both present: the right-most separator is the decimal point; the other
    // groups thousands. Handles both "1,234.56" and "1.234,56".
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Only commas: 2 trailing digits → decimal comma (EU); otherwise thousands.
    const after = s.length - lastComma - 1;
    s = after === 2 && (s.match(/,/g) || []).length === 1
      ? s.replace(',', '.')
      : s.replace(/,/g, '');
  }
  // Only dots (or none): leave as-is — JS Number treats '.' as the decimal point.

  const num = Number(s);
  if (isNaN(num)) return null;
  return negative ? -num : num;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string { return n < 10 ? '0' + n : String(n); }

/** Parse a date string into ISO yyyy-mm-dd, honouring the chosen format for
 *  ambiguous numeric dates. Returns null if unparseable. */
export function parseDate(value: string, format: DateFormat = 'auto'): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === '') return null;

  // ISO yyyy-mm-dd (optionally with time) — unambiguous.
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2]!)}-${pad(+m[3]!)}`;

  // dd Mon yyyy / Mon dd yyyy (named month).
  m = s.match(/(\d{1,2})[ -]([A-Za-z]{3,})[ -](\d{2,4})/);
  if (m && MONTHS[m[2]!.slice(0, 3).toLowerCase()]) {
    const mo = MONTHS[m[2]!.slice(0, 3).toLowerCase()]!;
    let yr = +m[3]!; if (yr < 100) yr += 2000;
    return `${yr}-${pad(mo)}-${pad(+m[1]!)}`;
  }

  // Numeric d/m/y or m/d/y with separators / - .
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let a = +m[1]!, b = +m[2]!, yr = +m[3]!;
    if (yr < 100) yr += 2000;
    let day: number, mon: number;
    if (format === 'MDY') { mon = a; day = b; }
    else if (format === 'YMD') { /* unreachable here */ mon = b; day = a; }
    else if (format === 'DMY') { day = a; mon = b; }
    else { // auto: disambiguate by value
      if (a > 12 && b <= 12) { day = a; mon = b; }
      else if (b > 12 && a <= 12) { mon = a; day = b; }
      else { day = a; mon = b; } // default to day-first
    }
    if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
    return `${yr}-${pad(mon)}-${pad(day)}`;
  }
  return null;
}
