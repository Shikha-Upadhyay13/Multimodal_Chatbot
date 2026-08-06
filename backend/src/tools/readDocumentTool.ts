import type { ToolDefinition } from "./index";
import { findDocumentByName, listDocuments } from "../rag/vectorStore";

export const readDocumentTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "read_document",
      description:
        "Read the full extracted text of one previously uploaded document by name. Use this (instead of " +
        "search_documents) when you need the whole document — e.g. to summarize it or to revise it before " +
        "regenerating it as a new Word/PowerPoint file — rather than just the most relevant snippets.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The uploaded document's file name (exact or partial)." },
        },
        required: ["name"],
      },
    },
  },
  run: async (args) => {
    const name = String((args as { name: string }).name ?? "");
    const doc = findDocumentByName(name);
    if (!doc) {
      const available = listDocuments().map((d) => d.name);
      return available.length
        ? `No uploaded document matches "${name}". Available documents: ${available.join(", ")}`
        : `No uploaded document matches "${name}". No documents have been uploaded yet.`;
    }
    return `Full text of "${doc.name}":\n\n${doc.fullText}`;
  },
};
