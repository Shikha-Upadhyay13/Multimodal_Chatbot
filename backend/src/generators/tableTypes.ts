export interface TableSpec {
  caption?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export function normalizeCells(rows: Array<Array<string | number | null | undefined>> | undefined): string[][] {
  return (rows ?? []).map((row) => (Array.isArray(row) ? row : [row]).map((cell) => (cell == null ? "" : String(cell))));
}
