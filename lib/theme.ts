export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "taskflow_theme";
export const THEME_CHANGE_EVENT = "taskflow-theme-change";

/**
 * Retrieves the currently saved theme from localStorage.
 * Defaults to "dark" when no valid value is stored.
 */
export function getSavedTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light") {
      return "light";
    }
    return "dark";
  } catch {
    return "dark";
  }
}

/**
 * Applies the theme attributes and classes to the root documentElement.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
  }
}

/**
 * Persists the chosen theme to localStorage, updates the document,
 * and notifies active listeners.
 */
export function setStoredTheme(theme: Theme): void {
  applyTheme(theme);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, { detail: theme })
    );
  } catch {
    // Storage access may fail in restricted browser modes
  }
}

/**
 * Toggles between "dark" and "light" themes.
 */
export function toggleTheme(currentTheme: Theme): Theme {
  return currentTheme === "dark" ? "light" : "dark";
}
