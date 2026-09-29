import Link from "next/link";

interface AppHeaderProps {
  active: "tasks" | "notes";
}

const linkBase =
  "rounded-control px-2.5 py-1.5 text-sm font-medium transition-colors";

export default function AppHeader({ active }: AppHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-6">
        <Link
          href="/"
          aria-label="Home"
          className="grid h-5 w-5 place-items-center rounded-md bg-accent text-accent-ink"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </Link>

        <nav aria-label="Main" className="flex gap-1">
          <Link
            href="/"
            aria-current={active === "tasks" ? "page" : undefined}
            className={`${linkBase} ${
              active === "tasks"
                ? "bg-surface-muted text-text"
                : "text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            Tasks
          </Link>
          <Link
            href="/notes"
            aria-current={active === "notes" ? "page" : undefined}
            className={`${linkBase} ${
              active === "notes"
                ? "bg-surface-muted text-text"
                : "text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            Notes
          </Link>
        </nav>
      </div>
    </header>
  );
}
