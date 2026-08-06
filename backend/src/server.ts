import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { chatRouter } from "./routes/chat.route";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/chat", chatRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});
