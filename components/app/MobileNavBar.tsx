"use client";

import Link from "next/link";

interface MobileNavBarProps {
  active?: "tasks" | "notes" | "calendar" | "analytics" | "privacy" | "followups" | "plan" | "inbox";
  dueCount?: number;
  inboxCount?: number;
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
    key: "inbox",
    href: "/inbox",
    label: "Inbox",
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
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
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
    key: "followups",
    href: "/followups",
    label: "Follow Ups",
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
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    ),
  },
  {
    key: "plan",
    href: "/plan",
    label: "Plan",
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
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
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

export default function MobileNavBar({ active, dueCount, inboxCount }: MobileNavBarProps) {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-bg/95 backdrop-blur-lg transition-colors sm:hidden print:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          const hasBadge =
            (item.key === "followups" && Boolean(dueCount && dueCount > 0)) ||
            (item.key === "inbox" && Boolean(inboxCount && inboxCount > 0));
          const count = item.key === "followups" ? dueCount : inboxCount;
          const badgeBg = item.key === "followups" ? "bg-rose-500" : "bg-accent";

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
                className={`relative flex h-6 w-6 items-center justify-center transition-transform ${
                  isActive ? "scale-105" : ""
                }`}
              >
                {item.icon}
                {hasBadge && (
                  <span
                    className={`absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full ${badgeBg} px-1 text-[9px] font-bold text-white shadow-xs`}
                  >
                    {(count ?? 0) > 9 ? "9+" : count}
                  </span>
                )}
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


