import { groq, MODELS } from "./groqClient";

/**
 * A short, stateless completion — deliberately bypasses agentLoop.ts/messageStore.ts
 * entirely (no tools, no streaming, no conversation history) since generating a title
 * from one exchange has nothing to do with the agentic loop.
 */
export async function generateTitle(userText: string, assistantText: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODELS.chat,
    max_tokens: 200,
    // gpt-oss-120b is a reasoning model — its hidden reasoning tokens count against
    // max_tokens, so a low cap (e.g. 20) can get cut off mid-thought before it ever
    // emits the actual title, leaving `content` empty. "low" effort keeps that
    // reasoning overhead small for a task this trivial.
    reasoning_effort: "low",
    messages: [
      {
        role: "system",
        content:
          "You generate chat titles. Reply with EXACTLY ONE short title, 3-6 words, on a single " +
          "line. No alternatives, no explanation, no quotes, no trailing punctuation, no 'Title:' prefix.",
      },
      { role: "user", content: `User: ${userText}\nAssistant: ${assistantText}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  // Defensive parse: even asked for one line, take just the first non-empty line and
  // cap the word count, in case the model still rambles.
  const firstLine = raw.split("\n").find((line) => line.trim().length > 0) ?? "";
  const title = firstLine.trim().replace(/^["']|["']$/g, "").split(/\s+/).slice(0, 6).join(" ");
  return title;
}
