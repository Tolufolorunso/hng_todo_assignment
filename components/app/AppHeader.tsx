import Link from "next/link";
import OfflineIndicator from "@/components/app/OfflineIndicator";

interface AppHeaderProps {
  active: "tasks" | "notes" | "calendar" | "analytics";
}

const NAV_ITEMS = [
  {
    key: "tasks",
    href: "/",
    label: "Tasks",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
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
        width="14"
        height="14"
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
        width="14"
        height="14"
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
        width="14"
        height="14"
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

export default function AppHeader({ active }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-text outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="TaskFlow home"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover text-accent-ink shadow-sm transition-transform group-hover:scale-105">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <span className="text-base font-semibold tracking-tight text-text">
            Task<span className="text-accent">Flow</span>
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav
          aria-label="Main"
          className="flex items-center gap-1 rounded-xl border border-border bg-surface-muted/80 p-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border border-border/60 bg-surface text-text shadow-sm"
                    : "text-muted hover:bg-surface/50 hover:text-text"
                }`}
              >
                <span className={isActive ? "text-accent" : "text-faint"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Header Right Utilities */}
        <div className="flex items-center gap-3">
          <OfflineIndicator />
        </div>
      </div>
    </header>
  );
}
