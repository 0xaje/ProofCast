import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Theme = "light" | "dark";
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeContextType {
  /** The actively rendered theme: either "light" (Day) or "dark" (Night) */
  theme: Theme;
  /** The user's preferred mode: "light", "dark", or "system" (auto) */
  mode: ThemeMode;
  /** Set the mode explicitly ("light", "dark", or "system") */
  setMode: (mode: ThemeMode) => void;
  /** Directly set resolved theme */
  setTheme: (theme: Theme) => void;
  /** Quick 1-click toggle between Day (light) and Night (dark) */
  toggleTheme: () => void;
  /** Helper flag indicating whether automatic system mode is active */
  isSystem: boolean;
}

const STORAGE_KEY = "proofcast-theme-mode";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({
  children,
  defaultMode = "dark",
}: ThemeProviderProps) {
  // Read stored preference or fall back to defaultMode
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    }
    return defaultMode;
  });

  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  // Listen to OS system color scheme changes if mode is "system"
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Compute resolved theme
  const resolvedTheme: Theme = useMemo(() => {
    if (mode === "system") {
      return systemTheme;
    }
    return mode;
  }, [mode, systemTheme]);

  // Synchronize with documentElement DOM classes and data attributes
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme;

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light", "theme-light");
    } else {
      root.classList.add("light", "theme-light");
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // safe storage fallback
    }
  };

  const setTheme = (newTheme: Theme) => {
    setMode(newTheme);
  };

  const toggleTheme = () => {
    // If currently dark, switch to light (Day); if currently light, switch to dark (Night)
    setMode(resolvedTheme === "dark" ? "light" : "dark");
  };

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: resolvedTheme,
      mode,
      setMode,
      setTheme,
      toggleTheme,
      isSystem: mode === "system",
    }),
    [resolvedTheme, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
