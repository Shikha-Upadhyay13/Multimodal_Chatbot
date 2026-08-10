import express from "express";
import cors from "cors";
import path from "node:path";
import { env } from "./config/env";
import { chatRouter } from "./routes/chat.route";
import { uploadRouter } from "./routes/upload.route";
import { documentsRouter } from "./routes/documents.route";
import { voiceRouter } from "./routes/voice.route";
import { resetRouter } from "./routes/reset.route";
import { warmUpEmbedder } from "./rag/embedder";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/reset", resetRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve the built frontend so the whole app runs as a single deployed service.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
app.use(express.static(frontendDist));
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

async function start() {
  console.log("Warming up local embedding model (first run downloads ~90MB)...");
  await warmUpEmbedder();
  console.log("Embedding model ready.");

  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}

start();
