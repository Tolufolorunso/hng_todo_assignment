"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  isEditableElement,
  isCommandPaletteShortcut,
  isQuickCaptureShortcut,
  processSequenceKey,
  createInitialSequenceState,
  type SequenceState,
} from "@/lib/shortcuts";

interface UseGlobalShortcutsOptions {
  onToggleCommandPalette?: () => void;
  onOpenQuickCapture?: () => void;
  onToggleMore?: () => void;
  enabled?: boolean;
}

export function useGlobalShortcuts({
  onToggleCommandPalette,
  onOpenQuickCapture,
  onToggleMore,
  enabled = true,
}: UseGlobalShortcutsOptions = {}) {
  const router = useRouter();
  const sequenceRef = useRef<SequenceState>(createInitialSequenceState());

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // 1. Command Palette toggle (Cmd+K / Ctrl+K)
      if (isCommandPaletteShortcut(e)) {
        e.preventDefault();
        onToggleCommandPalette?.();
        return;
      }

      // 2. If user is in an input, textarea, or contenteditable element, ignore sequence shortcuts
      if (isEditableElement(e.target)) {
        return;
      }

      // 3. Quick Capture (Alt+C)
      if (isQuickCaptureShortcut(e)) {
        e.preventDefault();
        onOpenQuickCapture?.();
        return;
      }

      // 4. Ignore sequence if modifier keys are pressed
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const { nextState, destination } = processSequenceKey(
        sequenceRef.current,
        e.key,
        Date.now()
      );
      sequenceRef.current = nextState;

      if (destination) {
        e.preventDefault();
        if (destination === "more") {
          onToggleMore?.();
        } else {
          router.push(destination);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onToggleCommandPalette, onOpenQuickCapture, onToggleMore, router]);
}
