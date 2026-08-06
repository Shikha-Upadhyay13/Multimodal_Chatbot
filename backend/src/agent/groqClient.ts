import Groq from "groq-sdk";
import { env } from "../config/env";

export const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export const MODELS = {
  chat: "openai/gpt-oss-120b",
  vision: "llama-4-scout-17b-16e-instruct",
  whisper: "whisper-large-v3-turbo",
} as const;
