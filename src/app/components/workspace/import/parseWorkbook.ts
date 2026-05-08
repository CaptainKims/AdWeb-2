import * as XLSX from 'xlsx';
import { formatLocalYmd } from './dateLocal';

export interface ParsedSheet {
  name: string;
  /** Raw cell grid; empty rows may be trimmed at end only. */
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  colCount: number;
}

export interface ParsedWorkbook {
  sheets: ParsedSheet[];
}

function cellToPrimitive(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return formatLocalYmd(v);
  return String(v);
}

export async function parseWorkbookFile(file: File): Promise<ParsedWorkbook> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheets: ParsedSheet[] = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const rows: (string | number | boolean | null)[][] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: (string | number | boolean | null)[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        row.push(cell ? cellToPrimitive(cell.v) : null);
      }
      rows.push(row);
    }

    // Trim trailing completely empty rows
    while (rows.length > 0 && rows[rows.length - 1].every(c => c === null || c === '')) {
      rows.pop();
    }

    const colCount = rows.length > 0 ? rows[0].length : 0;
    sheets.push({
      name,
      rows,
      rowCount: rows.length,
      colCount,
    });
  }

  return { sheets };
}
