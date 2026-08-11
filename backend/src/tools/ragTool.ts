import type { ToolDefinition } from "./index";
import { retrieveRelevantChunks } from "../rag/retriever";

export const searchDocumentsTool: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "search_documents",
      description:
        "Search the user's uploaded documents (PDF, Word, Excel, PowerPoint, images) for content relevant " +
        "to a query. Use this whenever the user asks something that might be answered by a file they uploaded.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for in the uploaded documents." },
        },
        required: ["query"],
      },
    },
  },
  run: async (args, context) => {
    const query = String((args as { query: string }).query ?? "");
    if (!query) return "Error: a query is required.";

    const matches = await retrieveRelevantChunks(query, context.projectId);
    if (matches.length === 0) {
      return "No uploaded documents found (or none matched this query). Tell the user no relevant document content was found.";
    }

    return matches
      .map((m, i) => `[${i + 1}] From "${m.docName}" (relevance ${m.score.toFixed(2)}):\n${m.text}`)
      .join("\n\n");
  },
};
