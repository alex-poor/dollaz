// csv.ts — small, dependency-free RFC4180-ish CSV parser.
// Handles quoted fields, embedded commas/newlines, escaped quotes (""),
// CRLF/LF line endings, and auto-detects the delimiter (',' ';' or tab).

export interface ParsedCsv {
  delimiter: string;
  /** Every row, including the header row if present. Ragged rows are kept as-is. */
  rows: string[][];
}

function detectDelimiter(text: string): string {
  // Inspect the first non-empty line; pick the delimiter with the highest count.
  const firstLine = text.slice(0, 4000).split(/\r?\n/).find(l => l.trim().length > 0) || '';
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

export function parseCsv(text: string, delimiterOverride?: string): ParsedCsv {
  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delimiter = delimiterOverride || detectDelimiter(text);

  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => {
    pushField();
    // Skip rows that are entirely empty (e.g. blank trailing lines).
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === delimiter) { pushField(); i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { pushRow(); i++; continue; }
    field += ch; i++;
  }
  // Flush trailing field/row (file not ending in newline).
  if (field.length > 0 || row.length > 0) pushRow();

  return { delimiter, rows };
}

/** A stable signature for a header row, used to recognise a known bank layout. */
export function headerSignature(header: string[]): string {
  return header.map(h => h.trim().toLowerCase()).join('|');
}

/** Heuristic: does the first row look like a header (mostly non-numeric labels)? */
export function looksLikeHeader(firstRow: string[]): boolean {
  if (!firstRow.length) return false;
  const numeric = firstRow.filter(c => c.trim() !== '' && !isNaN(Number(c.replace(/[$,]/g, '')))).length;
  return numeric < Math.max(1, Math.ceil(firstRow.length / 2));
}
