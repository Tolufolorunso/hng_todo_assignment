import { describe, it, expect } from "vitest";
import {
  isEditableElement,
  isCommandPaletteShortcut,
  isQuickCaptureShortcut,
  processSequenceKey,
  createInitialSequenceState,
} from "./shortcuts";

describe("Shortcuts Helper Module", () => {
  describe("isEditableElement", () => {
    it("returns false for null or non-object targets", () => {
      expect(isEditableElement(null)).toBe(false);
      expect(isEditableElement(undefined as unknown as EventTarget)).toBe(false);
    });

    it("returns true for input, textarea, and select elements", () => {
      const input = { tagName: "INPUT" } as unknown as EventTarget;
      const textarea = { tagName: "TEXTAREA" } as unknown as EventTarget;
      const select = { tagName: "SELECT" } as unknown as EventTarget;
      const div = { tagName: "DIV" } as unknown as EventTarget;

      expect(isEditableElement(input)).toBe(true);
      expect(isEditableElement(textarea)).toBe(true);
      expect(isEditableElement(select)).toBe(true);
      expect(isEditableElement(div)).toBe(false);
    });

    it("returns true for contenteditable elements", () => {
      const div = {
        tagName: "DIV",
        isContentEditable: true,
      } as unknown as EventTarget;
      expect(isEditableElement(div)).toBe(true);
    });

    it("returns true for role=textbox elements", () => {
      const div = {
        tagName: "DIV",
        getAttribute: (attr: string) => (attr === "role" ? "textbox" : null),
      } as unknown as EventTarget;
      expect(isEditableElement(div)).toBe(true);
    });
  });

  describe("Shortcut detection predicates", () => {
    it("detects Cmd+K or Ctrl+K for command palette", () => {
      expect(isCommandPaletteShortcut({ key: "k", metaKey: true })).toBe(true);
      expect(isCommandPaletteShortcut({ key: "K", ctrlKey: true })).toBe(true);
      expect(isCommandPaletteShortcut({ key: "k" })).toBe(false);
      expect(isCommandPaletteShortcut({ key: "p", metaKey: true })).toBe(false);
    });

    it("detects Alt+C for quick capture", () => {
      expect(isQuickCaptureShortcut({ key: "c", altKey: true })).toBe(true);
      expect(isQuickCaptureShortcut({ key: "C", altKey: true })).toBe(true);
      expect(isQuickCaptureShortcut({ key: "c" })).toBe(false);
      expect(isQuickCaptureShortcut({ key: "v", altKey: true })).toBe(false);
    });
  });

  describe("processSequenceKey", () => {
    it("initiates sequence on 'g' or 'G'", () => {
      const initial = createInitialSequenceState();
      const res1 = processSequenceKey(initial, "g", 1000);
      expect(res1.nextState.pendingPrefix).toBe("g");
      expect(res1.nextState.timestamp).toBe(1000);
      expect(res1.destination).toBeNull();

      const res2 = processSequenceKey(initial, "G", 1000);
      expect(res2.nextState.pendingPrefix).toBe("g");
      expect(res2.destination).toBeNull();
    });

    it("resolves destination when valid second key is pressed in time", () => {
      const state = { pendingPrefix: "g", timestamp: 1000 };

      expect(processSequenceKey(state, "t", 1500).destination).toBe("/");
      expect(processSequenceKey(state, "f", 1500).destination).toBe("/followups");
      expect(processSequenceKey(state, "n", 1500).destination).toBe("/notes");
      expect(processSequenceKey(state, "i", 1500).destination).toBe("/inbox");
      expect(processSequenceKey(state, "p", 1500).destination).toBe("/plan");
      expect(processSequenceKey(state, "c", 1500).destination).toBe("/calendar");
      expect(processSequenceKey(state, "a", 1500).destination).toBe("/analytics");
      expect(processSequenceKey(state, "m", 1500).destination).toBe("more");

      // Verify state resets after destination matched
      const res = processSequenceKey(state, "t", 1500);
      expect(res.nextState.pendingPrefix).toBeNull();
    });

    it("expires sequence when second key is pressed after timeout", () => {
      const state = { pendingPrefix: "g", timestamp: 1000 };
      const res = processSequenceKey(state, "t", 2500, 1000); // 1500ms elapsed
      expect(res.destination).toBeNull();
      expect(res.nextState.pendingPrefix).toBeNull();
    });

    it("resets sequence when unknown key is pressed", () => {
      const state = { pendingPrefix: "g", timestamp: 1000 };
      const res = processSequenceKey(state, "x", 1200);
      expect(res.destination).toBeNull();
      expect(res.nextState.pendingPrefix).toBeNull();
    });
  });
});
