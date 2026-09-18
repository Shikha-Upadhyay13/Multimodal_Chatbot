import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { env } from "./config/env";
import { langsmithEnabled } from "./observability/langsmith";
import { chatRouter } from "./routes/chat.route";
import { uploadRouter } from "./routes/upload.route";
import { documentsRouter } from "./routes/documents.route";
import { voiceRouter } from "./routes/voice.route";
import { resetRouter } from "./routes/reset.route";
import { projectsRouter } from "./routes/projects.route";
import { warmUpEmbedder } from "./rag/embedder";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/reset", resetRouter);
app.use("/api/projects", projectsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Combined deploy serves the Vite build. Locally that folder is absent — skip it
// so opening the API port does not 500 on a missing frontend/dist/index.html.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
const frontendIndex = path.join(frontendDist, "index.html");
if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(frontendIndex);
  });
}

async function start() {
  console.log("Warming up local embedding model (first run downloads ~90MB)...");
  await warmUpEmbedder();
  console.log("Embedding model ready.");

  app.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
    if (langsmithEnabled) {
      console.log(`LangSmith tracing on (project: ${process.env.LANGSMITH_PROJECT})`);
    }
  });
}

start();
