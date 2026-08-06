import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const STORAGE_DIR = path.join(__dirname, "..", "..", "storage");
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const db = new Database(path.join(STORAGE_DIR, "db.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL REFERENCES documents(id),
    doc_name TEXT NOT NULL,
    text TEXT NOT NULL,
    embedding BLOB NOT NULL
  );
`);

export interface DocumentRecord {
  id: string;
  name: string;
  uploadedAt: number;
}

interface ChunkRow {
  id: string;
  doc_id: string;
  doc_name: string;
  text: string;
  embedding: Buffer;
}

interface LoadedChunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  embedding: Float32Array;
}

// Loaded into memory once at startup, then kept in sync on every insert — the search
// itself is a plain linear scan over this array (see retriever.ts), no external index.
let cache: LoadedChunk[] = loadAllFromDb();

function loadAllFromDb(): LoadedChunk[] {
  const rows = db.prepare("SELECT id, doc_id, doc_name, text, embedding FROM chunks").all() as ChunkRow[];
  return rows.map((row) => ({
    id: row.id,
    docId: row.doc_id,
    docName: row.doc_name,
    text: row.text,
    embedding: bufferToFloat32Array(row.embedding),
  }));
}

function float32ArrayToBuffer(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

function bufferToFloat32Array(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / Float32Array.BYTES_PER_ELEMENT);
}

export function insertDocument(doc: DocumentRecord): void {
  db.prepare("INSERT INTO documents (id, name, uploaded_at) VALUES (?, ?, ?)").run(
    doc.id,
    doc.name,
    doc.uploadedAt,
  );
}

export function insertChunks(
  chunks: Array<{ id: string; docId: string; docName: string; text: string; embedding: Float32Array }>,
): void {
  const insert = db.prepare(
    "INSERT INTO chunks (id, doc_id, doc_name, text, embedding) VALUES (?, ?, ?, ?, ?)",
  );
  const insertMany = db.transaction((rows: typeof chunks) => {
    for (const row of rows) {
      insert.run(row.id, row.docId, row.docName, row.text, float32ArrayToBuffer(row.embedding));
      cache.push({ id: row.id, docId: row.docId, docName: row.docName, text: row.text, embedding: row.embedding });
    }
  });
  insertMany(chunks);
}

export function listDocuments(): DocumentRecord[] {
  const rows = db.prepare("SELECT id, name, uploaded_at as uploadedAt FROM documents ORDER BY uploaded_at DESC").all();
  return rows as DocumentRecord[];
}

export function getAllChunks(): LoadedChunk[] {
  return cache;
}
