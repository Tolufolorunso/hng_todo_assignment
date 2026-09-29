"use client";

import Link from "next/link";

interface MobileNavBarProps {
  active: "tasks" | "notes" | "calendar" | "analytics";
}

const MOBILE_NAV_ITEMS = [
  {
    key: "tasks",
    href: "/",
    label: "Tasks",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  {
    key: "notes",
    href: "/notes",
    label: "Notes",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    key: "calendar",
    href: "/calendar",
    label: "Calendar",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: "analytics",
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
];

export default function MobileNavBar({ active }: MobileNavBarProps) {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-bg/95 backdrop-blur-lg transition-colors sm:hidden print:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-3 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-all active:scale-95 ${
                isActive
                  ? "bg-accent/10 font-semibold text-accent shadow-xs ring-1 ring-accent/20"
                  : "text-muted hover:bg-surface/50 hover:text-text"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center transition-transform ${
                  isActive ? "scale-105" : ""
                }`}
              >
                {item.icon}
              </div>
              <span className="text-[11px] leading-tight tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
