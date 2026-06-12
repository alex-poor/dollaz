// detect.ts — sniff a dropped file's format so the importer can route it.
export type FileFormat = 'csv' | 'ofx' | 'qif';

export function detectFormat(filename: string, text: string): FileFormat {
  const name = (filename || '').toLowerCase();
  const head = text.slice(0, 2000);
  if (name.endsWith('.ofx') || name.endsWith('.qfx') || /<OFX>/i.test(head) || /OFXHEADER/i.test(head)) return 'ofx';
  if (name.endsWith('.qif') || /^\s*!Type:/i.test(head)) return 'qif';
  return 'csv';
}
