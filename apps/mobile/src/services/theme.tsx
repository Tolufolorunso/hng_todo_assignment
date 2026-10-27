import React, { createContext, useContext, useState, useEffect } from "react";
import type { ThemeMode, ThemeColors } from "../types/theme";
import { DARK_THEME, LIGHT_THEME } from "../types/theme";

export interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  isTablet: boolean;
}

const defaultContextValue: ThemeContextValue = {
  mode: "dark",
  colors: DARK_THEME,
  toggleTheme: () => {},
  setMode: () => {},
  isTablet: false,
};

export const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = "dark" }: ThemeProviderProps): React.JSX.Element {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setIsTablet(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const colors = mode === "dark" ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, setMode, isTablet }}>
      {children}
    </ThemeContext.Provider>
  );
}
