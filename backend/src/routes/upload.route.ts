import { Router } from "express";
import multer from "multer";
import { ingestFile } from "../rag/ingest";
import { listDocuments } from "../rag/vectorStore";
import { UnsupportedFileTypeError } from "../parsers";

export const uploadRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

uploadRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded (expected multipart field 'file')." });
    return;
  }

  try {
    const result = await ingestFile(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (err) {
    if (err instanceof UnsupportedFileTypeError) {
      res.status(415).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

uploadRouter.get("/", (_req, res) => {
  res.json(listDocuments());
});
