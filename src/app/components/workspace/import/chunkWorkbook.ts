import type { ParsedSheet } from './parseWorkbook';

const MAX_CHARS_PER_SHEET = 48_000;

function rowsToDelimitedText(rows: ParsedSheet['rows']): string {
  return rows
    .map(row =>
      row
        .map(c => {
          if (c === null || c === '') return '';
          const s = String(c).replace(/\r?\n/g, ' ').replace(/\t/g, ' ');
          return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join('\t'),
    )
    .join('\n');
}

export interface SheetChunk {
  sheetName: string;
  text: string;
  truncated: boolean;
}

/** One text blob per included sheet (v1); truncate very large sheets. */
export function buildSheetChunks(sheets: ParsedSheet[], includeNames: Set<string>): SheetChunk[] {
  const out: SheetChunk[] = [];
  for (const sh of sheets) {
    if (!includeNames.has(sh.name)) continue;
    if (sh.rowCount === 0) continue;
    let text = `Sheet: ${sh.name}\n${rowsToDelimitedText(sh.rows)}`;
    let truncated = false;
    if (text.length > MAX_CHARS_PER_SHEET) {
      text = text.slice(0, MAX_CHARS_PER_SHEET) + '\n\n[…truncated for model context…]';
      truncated = true;
    }
    out.push({ sheetName: sh.name, text, truncated });
  }
  return out;
}
