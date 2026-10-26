export type ShortcutDestination =
  | "/"
  | "/followups"
  | "/notes"
  | "/inbox"
  | "/plan"
  | "/calendar"
  | "/analytics";

export interface SequenceState {
  pendingPrefix: string | null;
  timestamp: number;
}

export function createInitialSequenceState(): SequenceState {
  return {
    pendingPrefix: null,
    timestamp: 0,
  };
}

export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") {
    return false;
  }

  const el = target as Partial<{
    tagName: string;
    isContentEditable: boolean;
    getAttribute: (attr: string) => string | null;
  }>;

  if (typeof el.tagName === "string") {
    const tagName = el.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") {
      return true;
    }
  }

  if (Boolean(el.isContentEditable)) {
    return true;
  }

  if (typeof el.getAttribute === "function" && el.getAttribute("role") === "textbox") {
    return true;
  }

  return false;
}

export function isCommandPaletteShortcut(e: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
}): boolean {
  return (Boolean(e.metaKey) || Boolean(e.ctrlKey)) && (e.key === "k" || e.key === "K");
}

export function isQuickCaptureShortcut(e: {
  key: string;
  altKey?: boolean;
}): boolean {
  return Boolean(e.altKey) && (e.key === "c" || e.key === "C");
}

const DESTINATION_MAP: Record<string, ShortcutDestination> = {
  t: "/",
  f: "/followups",
  n: "/notes",
  i: "/inbox",
  p: "/plan",
  c: "/calendar",
  a: "/analytics",
};

export function processSequenceKey(
  state: SequenceState,
  key: string,
  now: number = Date.now(),
  timeoutMs: number = 1000
): { nextState: SequenceState; destination: ShortcutDestination | null } {
  const normalized = key.toLowerCase();

  // If pending prefix "g" was pressed within timeout
  if (state.pendingPrefix === "g" && now - state.timestamp <= timeoutMs) {
    const destination = DESTINATION_MAP[normalized] || null;
    return {
      nextState: createInitialSequenceState(),
      destination,
    };
  }

  // Initiating sequence with 'g'
  if (normalized === "g") {
    return {
      nextState: {
        pendingPrefix: "g",
        timestamp: now,
      },
      destination: null,
    };
  }

  return {
    nextState: createInitialSequenceState(),
    destination: null,
  };
}
