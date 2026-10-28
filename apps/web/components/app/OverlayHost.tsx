"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface OverlayHostProps {
  children: ReactNode;
}

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * OverlayHost provides a body-level portal for viewport-relative dialogs,
 * sheets, and modals, ensuring they escape any parent CSS containing blocks
 * created by header backdrop filters or sticky positioning in Chromium.
 */
export default function OverlayHost({ children }: OverlayHostProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isMounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}
