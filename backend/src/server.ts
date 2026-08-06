import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { chatRouter } from "./routes/chat.route";
import { uploadRouter } from "./routes/upload.route";
import { warmUpEmbedder } from "./rag/embedder";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRouter);
app.use("/api/upload", uploadRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
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
