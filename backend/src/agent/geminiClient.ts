import { env } from "../config/env";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export const geminiEnabled = Boolean(env.GEMINI_API_KEY);

async function geminiPost(path: string, body: unknown): Promise<Record<string, unknown>> {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(`${GEMINI_BASE}/${path}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = data.error as { message?: string } | undefined;
    throw new Error(err?.message || `Gemini request failed (${res.status})`);
  }
  return data;
}

export async function geminiGroundedSearch(query: string): Promise<string> {
  const data = await geminiPost("models/gemini-2.0-flash:generateContent", {
    contents: [{ parts: [{ text: `Answer using current web results. Be concise.\n\n${query}` }] }],
    tools: [{ google_search: {} }],
  });
  const candidates = (data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> }; groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }>) ?? [];
  const first = candidates[0];
  const text = first?.content?.parts?.map((p) => p.text ?? "").join("\n").trim() ?? "";
  const sources = (first?.groundingMetadata?.groundingChunks ?? [])
    .map((chunk) => chunk.web)
    .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
    .slice(0, 6)
    .map((web) => `- ${web.title || web.uri} (${web.uri})`);
  if (!text && !sources.length) return "";
  return [text, sources.length ? `Sources:\n${sources.join("\n")}` : ""].filter(Boolean).join("\n\n");
}

export async function geminiGenerateImage(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const data = await geminiPost("models/gemini-2.5-flash-image:generateContent", {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  });
  const parts =
    ((data.candidates as Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>) ??
      [])[0]?.content?.parts ?? [];
  const image = parts.find((part) => part.inlineData?.data);
  if (!image?.inlineData?.data) {
    throw new Error("Gemini did not return an image.");
  }
  return {
    buffer: Buffer.from(image.inlineData.data, "base64"),
    mimeType: image.inlineData.mimeType || "image/png",
  };
}
