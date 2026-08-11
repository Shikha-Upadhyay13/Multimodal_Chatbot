import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { db, FILES_DIR, addColumnIfMissing } from "../storage/db";

db.exec(`
  CREATE TABLE IF NOT EXISTS generated_files (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
// Same convention as documents.project_id: NULL = global/regular-chat library.
addColumnIfMissing("generated_files", "project_id", "TEXT");

export interface GeneratedFile {
  id: string;
  fileName: string;
  mimeType: string;
}

/** Saves a generated document to disk and registers it for later download. */
export function saveGeneratedFile(fileName: string, mimeType: string, buffer: Buffer, projectId?: string): GeneratedFile {
  const id = randomUUID();
  fs.writeFileSync(path.join(FILES_DIR, id), buffer);
  db.prepare(
    "INSERT INTO generated_files (id, file_name, mime_type, created_at, project_id) VALUES (?, ?, ?, ?, ?)",
  ).run(id, fileName, mimeType, Date.now(), projectId ?? null);
  return { id, fileName, mimeType };
}

/** Case-insensitive substring match, scoped to the same library, same convention as
 *  vectorStore.findDocumentByName. */
export function findGeneratedFileByName(name: string, projectId?: string): (GeneratedFile & { buffer: Buffer }) | undefined {
  const rows = db
    .prepare(
      "SELECT id, file_name as fileName, mime_type as mimeType FROM generated_files " +
        "WHERE project_id IS ? ORDER BY created_at DESC",
    )
    .all(projectId ?? null) as GeneratedFile[];
  const lower = name.toLowerCase();
  const match =
    rows.find((r) => r.fileName.toLowerCase() === lower) ??
    rows.find((r) => r.fileName.toLowerCase().includes(lower));
  return match ? getGeneratedFile(match.id) : undefined;
}

export function getGeneratedFile(id: string): (GeneratedFile & { buffer: Buffer }) | undefined {
  const row = db
    .prepare("SELECT id, file_name as fileName, mime_type as mimeType FROM generated_files WHERE id = ?")
    .get(id) as GeneratedFile | undefined;
  if (!row) return undefined;

  const filePath = path.join(FILES_DIR, id);
  if (!fs.existsSync(filePath)) return undefined;

  return { ...row, buffer: fs.readFileSync(filePath) };
}

/** Wipes every generated document in the global (non-project) library — both the
 *  registry rows and the files on disk. Deliberately scoped to project_id IS NULL, same
 *  reasoning as vectorStore.clearAll(). */
export function clearAllGeneratedFiles(): void {
  const rows = db.prepare("SELECT id FROM generated_files WHERE project_id IS NULL").all() as Array<{ id: string }>;
  for (const row of rows) {
    const filePath = path.join(FILES_DIR, row.id);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.exec("DELETE FROM generated_files WHERE project_id IS NULL;");
}
