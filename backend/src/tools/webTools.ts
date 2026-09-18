import { geminiEnabled, geminiGroundedSearch } from "../agent/geminiClient";
import type { ToolDefinition } from "./index";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_TEXT = 8_000;

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || host === "::1") return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
}

function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("only http and https URLs are allowed");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("that host is not allowed");
  }
  return url;
}

async function fetchText(url: string): Promise<string> {
  const parsed = assertPublicHttpUrl(url);
  const res = await fetch(parsed, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "PersonalChatbot/1.0 (web lookup)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${parsed.hostname}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!/text|json|xml|html|markdown/i.test(contentType) && contentType) {
    throw new Error(`unsupported content type: ${contentType}`);
  }
  return res.text();
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

async function duckDuckGoInstant(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const data = JSON.parse(await fetchText(url)) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    Answer?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
  };
  const lines: string[] = [];
  if (data.Heading) lines.push(`Title: ${data.Heading}`);
  if (data.Answer) lines.push(`Answer: ${data.Answer}`);
  if (data.AbstractText) lines.push(data.AbstractText);
  if (data.AbstractURL) lines.push(`Source: ${data.AbstractURL}`);
  const related = (data.RelatedTopics ?? []).flatMap((topic) => topic.Topics ?? [topic]);
  for (const item of related.slice(0, 6)) {
    if (item.Text) lines.push(`- ${item.Text}${item.FirstURL ? ` (${item.FirstURL})` : ""}`);
  }
  return lines.join("\n").trim();
}

async function duckDuckGoHtml(query: string): Promise<string> {
  const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  const results: string[] = [];
  const linkRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) && results.length < 6) {
    const href = decodeEntities(match[1]);
    const title = htmlToText(match[2]);
    if (title && href.startsWith("http")) results.push(`${results.length + 1}. ${title}\n   ${href}`);
  }
  return results.join("\n");
}

async function wikipediaSearch(query: string): Promise<string> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
  const data = JSON.parse(await fetchText(url)) as [string, string[], string[], string[]];
  const titles = data[1] ?? [];
  const urls = data[3] ?? [];
  if (!titles.length) return "";
  return titles.map((title, i) => `${i + 1}. ${title}\n   ${urls[i] ?? ""}`).join("\n");
}

const webSearch: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the public web for current facts, news, people, products, or anything not in uploaded documents. Use this when the user asks about the world, not about files they uploaded.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
        },
        required: ["query"],
      },
    },
  },
  run: async (args) => {
    const query = String((args as { query?: string }).query ?? "").trim();
    if (!query) return "Error: query is required.";
    if (geminiEnabled) {
      try {
        const grounded = await geminiGroundedSearch(query);
        if (grounded) return grounded.slice(0, MAX_TEXT);
      } catch {
        /* fall back to public search */
      }
    }
    const parts: string[] = [];
    try {
      const instant = await duckDuckGoInstant(query);
      if (instant) parts.push(instant);
    } catch {
      /* try the other sources */
    }
    try {
      const html = await duckDuckGoHtml(query);
      if (html) parts.push(html);
    } catch {
      /* try wikipedia */
    }
    if (!parts.length) {
      const wiki = await wikipediaSearch(query);
      if (wiki) parts.push(`Wikipedia matches:\n${wiki}`);
    }
    if (!parts.length) return "No web results. Try a more specific query, or fetch a URL directly.";
    return parts.join("\n\n").slice(0, MAX_TEXT);
  },
};

const fetchUrl: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "Download a public web page or article and return its readable text. Use after web_search when you need the full page, or when the user pastes a link.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "http or https URL." },
        },
        required: ["url"],
      },
    },
  },
  run: async (args) => {
    const url = String((args as { url?: string }).url ?? "").trim();
    if (!url) return "Error: url is required.";
    const html = await fetchText(url);
    const text = htmlToText(html);
    if (!text) return `Fetched ${url} but it had no readable text.`;
    return `URL: ${url}\n\n${text}`;
  },
};

export const webTools: ToolDefinition[] = [webSearch, fetchUrl];
