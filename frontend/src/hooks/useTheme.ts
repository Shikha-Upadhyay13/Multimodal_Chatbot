import { useCallback, useState } from "react";
import { loadSettings, saveSettings, type Theme } from "../utils/settingsStore";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => loadSettings().theme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      saveSettings({ ...loadSettings(), theme: next });
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
