import { env } from "../config/env";

/** True when a LangSmith key is present. The SDK reads LANGSMITH_* from process.env. */
export const langsmithEnabled = Boolean(env.LANGSMITH_API_KEY);

if (langsmithEnabled) {
  process.env.LANGSMITH_API_KEY = env.LANGSMITH_API_KEY;
  process.env.LANGSMITH_TRACING = env.LANGSMITH_TRACING === "false" ? "false" : "true";
  process.env.LANGSMITH_PROJECT = env.LANGSMITH_PROJECT ?? "multimodal-chatbot";
  if (env.LANGSMITH_ENDPOINT) process.env.LANGSMITH_ENDPOINT = env.LANGSMITH_ENDPOINT;
}
