"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export const THEME_STORAGE_KEY = "imasport-theme";

/**
 * Applies the stored theme to <html> before the first paint.
 *
 * Injected as a blocking inline script in the root layout. Without it the
 * document renders with the server's default theme and only switches once
 * React hydrates, which shows as a flash of the wrong theme — and reading
 * localStorage in an effect to fix that is what caused it in the first place.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialised from the DOM, which `themeInitScript` has already corrected,
  // so state starts right rather than being patched up in an effect.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage disabled (private browsing): the theme still applies for
      // this page, it just will not be remembered.
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
