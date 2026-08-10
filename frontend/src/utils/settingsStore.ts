export type Theme = "dark" | "light";

export interface Settings {
  theme: Theme;
  profileName: string;
  autoSpeakVoiceReplies: boolean;
}

const SETTINGS_KEY = "chatbot:settings";

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  profileName: "You",
  autoSpeakVoiceReplies: true,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to persist settings to localStorage:", err);
  }
}

/** Reads just the theme, synchronously and cheaply — used at app boot (see main.tsx)
 *  before React has mounted, so the correct theme attribute is set pre-paint. */
export function loadThemeSync(): Theme {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS.theme;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return parsed.theme === "light" ? "light" : "dark";
  } catch {
    return DEFAULT_SETTINGS.theme;
  }
}
