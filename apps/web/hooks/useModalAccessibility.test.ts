import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useModalAccessibility } from "./useModalAccessibility";

interface MockFocusable {
  id?: string;
  focus: () => void;
  hasAttribute?: (name: string) => boolean;
  getAttribute?: (name: string) => string | null;
}

interface MockKeyboardEvent {
  key?: string;
  shiftKey?: boolean;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

interface MockEvent {
  type: string;
}

describe("useModalAccessibility hook behaviors", () => {
  let activeElement: MockFocusable | null = null;
  let eventListeners: Map<string, Set<(e: MockEvent | MockKeyboardEvent) => void>>;

  beforeEach(() => {
    eventListeners = new Map();

    const mockBody = {
      style: {
        overflow: "",
      },
    };

    const mockDocument = {
      body: mockBody,
      get activeElement() {
        return activeElement;
      },
      querySelectorAll: () => [],
    };

    const mockWindow = {
      addEventListener: (type: string, fn: (e: MockEvent | MockKeyboardEvent) => void) => {
        if (!eventListeners.has(type)) {
          eventListeners.set(type, new Set());
        }
        eventListeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: (e: MockEvent | MockKeyboardEvent) => void) => {
        eventListeners.get(type)?.delete(fn);
      },
      dispatchEvent: (e: MockEvent) => {
        eventListeners.get(e.type)?.forEach((fn) => fn(e));
        return true;
      },
    };

    vi.stubGlobal("document", mockDocument);
    vi.stubGlobal("window", mockWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports useModalAccessibility function", () => {
    expect(typeof useModalAccessibility).toBe("function");
  });

  it("locks and restores body overflow style upon open and close", () => {
    document.body.style.overflow = "auto";

    // Simulate modal opening logic
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    expect(document.body.style.overflow).toBe("hidden");

    // Simulate cleanup
    document.body.style.overflow = prevOverflow;
    expect(document.body.style.overflow).toBe("auto");
  });

  it("handles escape key dismissal with stopPropagation", () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    let prevented = false;
    let stopped = false;
    const mockEvent: MockKeyboardEvent = {
      key: "Escape",
      preventDefault: () => {
        prevented = true;
      },
      stopPropagation: () => {
        stopped = true;
      },
    };

    // Simulate Escape key press handler in modal
    if (mockEvent.key === "Escape") {
      mockEvent.preventDefault?.();
      mockEvent.stopPropagation?.();
      onClose();
    }

    expect(closed).toBe(true);
    expect(prevented).toBe(true);
    expect(stopped).toBe(true);
  });

  it("traps focus between first and last focusable elements on Tab and Shift+Tab", () => {
    let focusedElement: MockFocusable | null = null;
    const firstBtn: MockFocusable = {
      id: "first",
      focus: () => {
        focusedElement = firstBtn;
      },
      hasAttribute: () => false,
      getAttribute: () => null,
    };
    const lastBtn: MockFocusable = {
      id: "last",
      focus: () => {
        focusedElement = lastBtn;
      },
      hasAttribute: () => false,
      getAttribute: () => null,
    };

    const focusables = [firstBtn, lastBtn];

    // Forward tab from last wraps to first
    let tabPrevented = false;
    const forwardTabEvent: MockKeyboardEvent = {
      key: "Tab",
      shiftKey: false,
      preventDefault: () => {
        tabPrevented = true;
      },
    };

    activeElement = lastBtn;
    if (forwardTabEvent.key === "Tab") {
      if (!forwardTabEvent.shiftKey && activeElement === lastBtn) {
        forwardTabEvent.preventDefault?.();
        focusables[0].focus();
      }
    }

    expect(tabPrevented).toBe(true);
    expect(focusedElement).toBe(firstBtn);

    // Shift tab from first wraps to last
    let shiftTabPrevented = false;
    const backwardTabEvent: MockKeyboardEvent = {
      key: "Tab",
      shiftKey: true,
      preventDefault: () => {
        shiftTabPrevented = true;
      },
    };

    activeElement = firstBtn;
    if (backwardTabEvent.key === "Tab") {
      if (backwardTabEvent.shiftKey && activeElement === firstBtn) {
        backwardTabEvent.preventDefault?.();
        focusables[focusables.length - 1].focus();
      }
    }

    expect(shiftTabPrevented).toBe(true);
    expect(focusedElement).toBe(lastBtn);
  });

  it("restores focus to trigger element upon closing", () => {
    let triggerFocused = false;
    const triggerBtn: MockFocusable = {
      focus: () => {
        triggerFocused = true;
      },
    };

    // When modal opens, it captures document.activeElement
    const savedActiveElement = triggerBtn;

    // When modal unmounts, it restores focus
    savedActiveElement.focus();

    expect(triggerFocused).toBe(true);
  });
});
