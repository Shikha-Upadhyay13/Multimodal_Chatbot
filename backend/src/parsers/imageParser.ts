import path from "node:path";
import { createWorker, type Worker } from "tesseract.js";

const CACHE_DIR = path.join(__dirname, "..", "..", "storage");

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) workerPromise = createWorker("eng", 1, { cachePath: CACHE_DIR });
  return workerPromise;
}

/** Extracts literal text from an image via OCR, for indexing into the RAG store. */
export async function parseImage(buffer: Buffer): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  return data.text;
}
