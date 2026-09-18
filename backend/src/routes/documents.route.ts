import { Router } from "express";
import { getGeneratedFile } from "../generators/fileRegistry";
import { buildDocumentPreview } from "../generators/previewDocument";

export const documentsRouter = Router();

function sendFile(res: import("express").Response, file: NonNullable<ReturnType<typeof getGeneratedFile>>, disposition: "attachment" | "inline") {
  const asciiName = file.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
  );
  res.send(file.buffer);
}

documentsRouter.get("/:id/download", (req, res) => {
  const file = getGeneratedFile(req.params.id);
  if (!file) {
    res.status(404).json({ error: "File not found." });
    return;
  }
  sendFile(res, file, "attachment");
});

documentsRouter.get("/:id/inline", (req, res) => {
  const file = getGeneratedFile(req.params.id);
  if (!file) {
    res.status(404).json({ error: "File not found." });
    return;
  }
  sendFile(res, file, "inline");
});

documentsRouter.get("/:id/preview", async (req, res) => {
  const file = getGeneratedFile(req.params.id);
  if (!file) {
    res.status(404).json({ error: "File not found." });
    return;
  }
  try {
    const preview = await buildDocumentPreview(file.fileName, file.mimeType, file.buffer);
    res.json(preview);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
