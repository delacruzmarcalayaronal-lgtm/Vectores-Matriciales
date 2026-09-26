export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCSV(rows: Array<Record<string, unknown>>, headers?: string[]): string {
  if (rows.length === 0) return '';
  const cols = headers ?? Object.keys(rows[0]);
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map(c => csvCell(row[c])).join(','));
  }
  return lines.join('\n');
}

export function parseCSV(text: string): Array<Record<string, string>> {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',' || ch === ';' || ch === '\t') {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells.map(c => c.trim());
  };

  const headers = splitLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
}

export function jsonOf(rows: unknown): string {
  return JSON.stringify(rows, null, 2);
}
