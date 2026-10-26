export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  danger: string;
  success: string;
  tabBarBackground: string;
  tabBarBorder: string;
}

export const DARK_THEME: ThemeColors = {
  background: "#09090b",
  surface: "#18181b",
  surfaceBorder: "#27272a",
  textPrimary: "#f4f4f5",
  textSecondary: "#e4e4e7",
  textMuted: "#a1a1aa",
  accent: "#3b82f6",
  accentHover: "#2563eb",
  danger: "#ef4444",
  success: "#10b981",
  tabBarBackground: "#18181b",
  tabBarBorder: "#27272a",
};

export const LIGHT_THEME: ThemeColors = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceBorder: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  accent: "#2563eb",
  accentHover: "#1d4ed8",
  danger: "#dc2626",
  success: "#059669",
  tabBarBackground: "#ffffff",
  tabBarBorder: "#e2e8f0",
};
