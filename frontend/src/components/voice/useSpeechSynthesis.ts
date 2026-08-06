import { useCallback } from "react";

/** Strips markdown syntax so it doesn't get read aloud literally (asterisks, raw URLs, etc). */
function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function useSpeechSynthesis() {
  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const clean = stripMarkdownForSpeech(text);
    if (!clean) return;

    window.speechSynthesis.cancel(); // stop anything already being read
    const utterance = new SpeechSynthesisUtterance(clean);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
