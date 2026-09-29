"use client";

import { useEffect, useState } from "react";

// navigator.onLine is browser-only, so the server and first client render a
// stable "online" state and the effect reconciles after mount. This avoids a
// hydration mismatch.
export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <span
      role="status"
      className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-faint" aria-hidden="true" />
      Offline, changes saved locally
    </span>
  );
}
