export const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:3001").replace(/\/$/, "");

export function resolveApiUrl(href: string): string {
  if (href.startsWith("/api/")) return `${API_BASE}${href}`;
  return href;
}

export function isDocumentDownload(href: string): boolean {
  return /\/api\/documents\/[^/]+\/download(?:\?|$)/.test(href);
}

const DOWNLOAD_PATH = /\/api\/documents\/[0-9a-fA-F-]{36}\/download/g;

/** Turn a bare /api/documents/.../download path into a markdown link if it isn't one already. */
export function linkifyDocumentUrls(text: string): string {
  return text.replace(
    /(?<!\]\()(\/api\/documents\/[0-9a-fA-F-]{36}\/download)/g,
    "[Download document]($1)",
  );
}

export function documentDownloadUrls(text: string): string[] {
  return [...text.matchAll(DOWNLOAD_PATH)].map((m) => m[0]);
}
