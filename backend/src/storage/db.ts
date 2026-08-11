import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export const STORAGE_DIR = path.join(__dirname, "..", "..", "storage");
export const FILES_DIR = path.join(STORAGE_DIR, "files");

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

export const db = new Database(path.join(STORAGE_DIR, "db.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/** Adds a column to an existing table if it isn't already there — `CREATE TABLE IF NOT
 *  EXISTS` only applies to brand-new databases, so evolving a table that may already have
 *  real rows in it (e.g. adding project_id to a table that predates Projects) needs this. */
export function addColumnIfMissing(table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
