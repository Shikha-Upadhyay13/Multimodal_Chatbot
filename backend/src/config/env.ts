import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required — get a free key at console.groq.com"),
  PORT: z.coerce.number().default(3001),
});

export const env = envSchema.parse(process.env);
