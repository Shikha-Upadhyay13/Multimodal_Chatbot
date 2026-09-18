import type { ToolDefinition } from "./index";
import { geminiEnabled, geminiGenerateImage } from "../agent/geminiClient";
import { saveAndDescribe } from "./docGenTools/shared";

function fileNameFromPrompt(prompt: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "image"}.png`;
}

export const generateImageTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "generate_image",
      description:
        "Generate an image from a text description using Gemini. Use when the user asks to draw, generate, or create a picture.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "What the image should show." },
          fileName: { type: "string", description: "Optional file name ending in .png." },
        },
        required: ["prompt"],
      },
    },
  },
  run: async (args, context) => {
    if (!geminiEnabled) {
      return "Error: GEMINI_API_KEY is not set, so image generation is unavailable.";
    }
    const { prompt, fileName } = args as { prompt?: string; fileName?: string };
    const description = String(prompt ?? "").trim();
    if (!description) return "Error: prompt is required.";
    const image = await geminiGenerateImage(description);
    const name = fileName?.endsWith(".png") ? fileName : fileNameFromPrompt(description);
    const result = saveAndDescribe(name, image.mimeType, image.buffer, context.projectId);
    const id = result.match(/\/api\/documents\/([0-9a-fA-F-]{36})\//)?.[1];
    return id ? `${result}\nMarkdown image: ![${name}](/api/documents/${id}/inline)` : result;
  },
};
