import { Router } from "express";
import { getGeneratedFile } from "../generators/fileRegistry";

export const documentsRouter = Router();

documentsRouter.get("/:id/download", (req, res) => {
  const file = getGeneratedFile(req.params.id);
  if (!file) {
    res.status(404).json({ error: "File not found." });
    return;
  }

  const asciiName = file.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
  );
  res.send(file.buffer);
});
