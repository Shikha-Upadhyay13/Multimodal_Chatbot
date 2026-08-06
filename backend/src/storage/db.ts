import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export const STORAGE_DIR = path.join(__dirname, "..", "..", "storage");
export const FILES_DIR = path.join(STORAGE_DIR, "files");

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });

export const db = new Database(path.join(STORAGE_DIR, "db.sqlite"));
db.pragma("journal_mode = WAL");
