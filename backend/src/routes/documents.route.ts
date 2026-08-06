import { Router } from "express";
import { getGeneratedFile } from "../generators/fileRegistry";

export const documentsRouter = Router();

documentsRouter.get("/:id/download", (req, res) => {
  const file = getGeneratedFile(req.params.id);
  if (!file) {
    res.status(404).json({ error: "File not found." });
    return;
  }

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.fileName)}"`);
  res.send(file.buffer);
});
