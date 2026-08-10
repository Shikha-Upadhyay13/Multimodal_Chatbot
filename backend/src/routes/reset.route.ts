import { Router } from "express";
import { clearAll } from "../rag/vectorStore";
import { clearAllGeneratedFiles } from "../generators/fileRegistry";

export const resetRouter = Router();

resetRouter.post("/", (_req, res) => {
  clearAll();
  clearAllGeneratedFiles();
  res.json({ status: "ok" });
});
