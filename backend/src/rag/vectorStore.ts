import { db } from "../storage/db";

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,
    full_text TEXT NOT NULL,
    file_path TEXT
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
  fullText: string;
  filePath: string | null;
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

export function insertDocument(doc: {
  id: string;
  name: string;
  uploadedAt: number;
  fullText: string;
  filePath: string | null;
}): void {
  db.prepare(
    "INSERT INTO documents (id, name, uploaded_at, full_text, file_path) VALUES (?, ?, ?, ?, ?)",
  ).run(doc.id, doc.name, doc.uploadedAt, doc.fullText, doc.filePath);
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

export function listDocuments(): Array<Omit<DocumentRecord, "fullText" | "filePath">> {
  const rows = db
    .prepare("SELECT id, name, uploaded_at as uploadedAt FROM documents ORDER BY uploaded_at DESC")
    .all();
  return rows as Array<Omit<DocumentRecord, "fullText" | "filePath">>;
}

/** Case-insensitive substring match on document name — good enough for a personal-scale library. */
export function findDocumentByName(name: string): DocumentRecord | undefined {
  const rows = db.prepare("SELECT id, name, uploaded_at as uploadedAt, full_text as fullText, file_path as filePath FROM documents").all() as DocumentRecord[];
  const lower = name.toLowerCase();
  return (
    rows.find((r) => r.name.toLowerCase() === lower) ?? rows.find((r) => r.name.toLowerCase().includes(lower))
  );
}

export function getAllChunks(): LoadedChunk[] {
  return cache;
}
