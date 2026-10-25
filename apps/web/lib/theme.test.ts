import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSavedTheme,
  applyTheme,
  setStoredTheme,
  toggleTheme,
  THEME_STORAGE_KEY,
  THEME_CHANGE_EVENT,
} from "./theme";

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

describe("Theme utilities", () => {
  let mockStorage: MockStorage;
  let classListSet: Set<string>;
  let attributesMap: Map<string, string>;
  let styleObj: { colorScheme: string };
  let eventListeners: Map<string, Set<(event: Event) => void>>;

  beforeEach(() => {
    mockStorage = new MockStorage();
    classListSet = new Set<string>();
    attributesMap = new Map<string, string>();
    styleObj = { colorScheme: "" };
    eventListeners = new Map<string, Set<(event: Event) => void>>();

    const mockRoot = {
      classList: {
        add: (cls: string) => classListSet.add(cls),
        remove: (cls: string) => classListSet.delete(cls),
        contains: (cls: string) => classListSet.has(cls),
      },
      setAttribute: (attr: string, val: string) => attributesMap.set(attr, val),
      getAttribute: (attr: string) => attributesMap.get(attr) ?? null,
      removeAttribute: (attr: string) => attributesMap.delete(attr),
      style: styleObj,
    };

    const mockWindow = {
      localStorage: mockStorage,
      addEventListener: (type: string, listener: (event: Event) => void) => {
        if (!eventListeners.has(type)) {
          eventListeners.set(type, new Set());
        }
        eventListeners.get(type)!.add(listener);
      },
      removeEventListener: (type: string, listener: (event: Event) => void) => {
        eventListeners.get(type)?.delete(listener);
      },
      dispatchEvent: (event: Event) => {
        const listeners = eventListeners.get(event.type);
        if (listeners) {
          listeners.forEach((fn) => fn(event));
        }
        return true;
      },
    };

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("document", { documentElement: mockRoot });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getSavedTheme", () => {
    it("defaults to dark when localStorage is empty", () => {
      expect(getSavedTheme()).toBe("dark");
    });

    it("returns light when localStorage contains light", () => {
      mockStorage.setItem(THEME_STORAGE_KEY, "light");
      expect(getSavedTheme()).toBe("light");
    });

    it("falls back to dark for any invalid or unhandled value", () => {
      mockStorage.setItem(THEME_STORAGE_KEY, "neon-blue");
      expect(getSavedTheme()).toBe("dark");
    });
  });

  describe("applyTheme", () => {
    it("applies dark classes and attributes correctly", () => {
      classListSet.add("light");
      attributesMap.set("data-theme", "light");

      applyTheme("dark");

      expect(classListSet.has("dark")).toBe(true);
      expect(classListSet.has("light")).toBe(false);
      expect(attributesMap.get("data-theme")).toBe("dark");
      expect(styleObj.colorScheme).toBe("dark");
    });

    it("applies light classes and attributes correctly", () => {
      classListSet.add("dark");
      attributesMap.set("data-theme", "dark");

      applyTheme("light");

      expect(classListSet.has("light")).toBe(true);
      expect(classListSet.has("dark")).toBe(false);
      expect(attributesMap.get("data-theme")).toBe("light");
      expect(styleObj.colorScheme).toBe("light");
    });
  });

  describe("setStoredTheme", () => {
    it("updates localStorage, applies DOM changes, and fires change event", () => {
      const listener = vi.fn();
      window.addEventListener(THEME_CHANGE_EVENT, listener);

      setStoredTheme("light");

      expect(mockStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
      expect(attributesMap.get("data-theme")).toBe("light");
      expect(listener).toHaveBeenCalledTimes(1);

      window.removeEventListener(THEME_CHANGE_EVENT, listener);
    });
  });

  describe("toggleTheme", () => {
    it("toggles dark to light and light to dark", () => {
      expect(toggleTheme("dark")).toBe("light");
      expect(toggleTheme("light")).toBe("dark");
    });
  });
});
