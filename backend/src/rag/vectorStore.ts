import fs from "node:fs";
import { db, addColumnIfMissing } from "../storage/db";

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
// NULL = the global/regular-chat document library (today's only library, and what every
// pre-existing row already implicitly means); a project's documents get its id here and
// are invisible outside that project.
addColumnIfMissing("documents", "project_id", "TEXT");

export interface DocumentRecord {
  id: string;
  name: string;
  uploadedAt: number;
  fullText: string;
  filePath: string | null;
  projectId: string | null;
}

interface ChunkRow {
  id: string;
  doc_id: string;
  doc_name: string;
  text: string;
  embedding: Buffer;
  project_id: string | null;
}

interface LoadedChunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  embedding: Float32Array;
  docProjectId: string | null;
}

// Loaded into memory once at startup, then kept in sync on every insert — the search
// itself is a plain linear scan over this array (see retriever.ts), no external index.
let cache: LoadedChunk[] = loadAllFromDb();

function loadAllFromDb(): LoadedChunk[] {
  const rows = db
    .prepare(
      "SELECT c.id, c.doc_id, c.doc_name, c.text, c.embedding, d.project_id " +
        "FROM chunks c JOIN documents d ON c.doc_id = d.id",
    )
    .all() as ChunkRow[];
  return rows.map((row) => ({
    id: row.id,
    docId: row.doc_id,
    docName: row.doc_name,
    text: row.text,
    embedding: bufferToFloat32Array(row.embedding),
    docProjectId: row.project_id,
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
  projectId?: string;
}): void {
  db.prepare(
    "INSERT INTO documents (id, name, uploaded_at, full_text, file_path, project_id) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(doc.id, doc.name, doc.uploadedAt, doc.fullText, doc.filePath, doc.projectId ?? null);
}

export function insertChunks(
  chunks: Array<{ id: string; docId: string; docName: string; text: string; embedding: Float32Array }>,
  projectId?: string,
): void {
  const insert = db.prepare(
    "INSERT INTO chunks (id, doc_id, doc_name, text, embedding) VALUES (?, ?, ?, ?, ?)",
  );
  const insertMany = db.transaction((rows: typeof chunks) => {
    for (const row of rows) {
      insert.run(row.id, row.docId, row.docName, row.text, float32ArrayToBuffer(row.embedding));
      cache.push({
        id: row.id,
        docId: row.docId,
        docName: row.docName,
        text: row.text,
        embedding: row.embedding,
        docProjectId: projectId ?? null,
      });
    }
  });
  insertMany(chunks);
}

export function listDocuments(projectId?: string): Array<Omit<DocumentRecord, "fullText" | "filePath">> {
  const rows = db
    .prepare(
      "SELECT id, name, uploaded_at as uploadedAt, project_id as projectId FROM documents " +
        "WHERE project_id IS ? ORDER BY uploaded_at DESC",
    )
    .all(projectId ?? null);
  return rows as Array<Omit<DocumentRecord, "fullText" | "filePath">>;
}

/** Case-insensitive substring match on document name, scoped to the same library
 *  (global vs a specific project) — good enough for a personal/small-team-scale library. */
export function findDocumentByName(name: string, projectId?: string): DocumentRecord | undefined {
  const rows = db
    .prepare(
      "SELECT id, name, uploaded_at as uploadedAt, full_text as fullText, file_path as filePath, " +
        "project_id as projectId FROM documents WHERE project_id IS ?",
    )
    .all(projectId ?? null) as DocumentRecord[];
  const lower = name.toLowerCase();
  return (
    rows.find((r) => r.name.toLowerCase() === lower) ?? rows.find((r) => r.name.toLowerCase().includes(lower))
  );
}

export function getAllChunks(): LoadedChunk[] {
  return cache;
}

/** Wipes all uploaded documents/chunks in the global (non-project) library — both the
 *  SQLite rows and the original files on disk, and the in-memory search cache (easy to
 *  miss: leaving it stale would keep returning "deleted" chunks from search until the
 *  next server restart). Deliberately scoped to project_id IS NULL: this backs the
 *  Settings "Clear all data" button, and one participant's personal reset must never wipe
 *  a shared project's documents. */
export function clearAll(): void {
  const rows = db.prepare("SELECT file_path as filePath FROM documents WHERE project_id IS NULL").all() as Array<{
    filePath: string | null;
  }>;
  for (const row of rows) {
    if (row.filePath && fs.existsSync(row.filePath)) fs.unlinkSync(row.filePath);
  }

  db.exec("DELETE FROM chunks WHERE doc_id IN (SELECT id FROM documents WHERE project_id IS NULL);");
  db.exec("DELETE FROM documents WHERE project_id IS NULL;");
  cache = cache.filter((c) => c.docProjectId !== null);
}
