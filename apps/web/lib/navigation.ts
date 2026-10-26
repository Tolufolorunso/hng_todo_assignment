export type PrimaryNavKey = "tasks" | "followups" | "notes" | "more";

export type SecondaryNavKey =
  | "inbox"
  | "plan"
  | "calendar"
  | "analytics"
  | "backup"
  | "account"
  | "capture"
  | "about";

export interface PrimaryNavItem {
  key: PrimaryNavKey;
  label: string;
  href: string;
  shortcut?: string;
  badgeKey?: "followups" | "inbox";
}

export interface SecondaryNavItem {
  key: SecondaryNavKey;
  label: string;
  description: string;
  href?: string;
  action?: "backup" | "account" | "capture" | "about";
  shortcut?: string;
  badgeKey?: "followups" | "inbox";
}

export interface NavCommand {
  id: string;
  title: string;
  description: string;
  category: "navigation" | "actions" | "settings";
  href?: string;
  action?: "capture" | "backup" | "account" | "about" | "theme";
  shortcut?: string;
  badgeKey?: "followups" | "inbox";
  keywords?: string[];
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    key: "tasks",
    label: "Tasks",
    href: "/",
    shortcut: "G T",
  },
  {
    key: "followups",
    label: "Follow Ups",
    href: "/followups",
    shortcut: "G F",
    badgeKey: "followups",
  },
  {
    key: "notes",
    label: "Notes",
    href: "/notes",
    shortcut: "G N",
  },
  {
    key: "more",
    label: "More",
    href: "#more",
    shortcut: "G M",
    badgeKey: "inbox",
  },
];

export const SECONDARY_NAV_ITEMS: SecondaryNavItem[] = [
  {
    key: "inbox",
    label: "Inbox",
    description: "Fast offline capture and triage",
    href: "/inbox",
    shortcut: "G I",
    badgeKey: "inbox",
  },
  {
    key: "plan",
    label: "Plan My Day",
    description: "Capacity-aware daily planning",
    href: "/plan",
    shortcut: "G P",
  },
  {
    key: "calendar",
    label: "Calendar",
    description: "Monthly schedule and due dates",
    href: "/calendar",
    shortcut: "G C",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Completion trends and productivity insights",
    href: "/analytics",
    shortcut: "G A",
  },
];

export const QUICK_ACTION_ITEMS: SecondaryNavItem[] = [
  {
    key: "capture",
    label: "Quick Capture",
    description: "Instant note or task capture (Alt+C)",
    action: "capture",
    shortcut: "Alt+C",
  },
  {
    key: "backup",
    label: "Backup and Restore",
    description: "Export or import JSON database snapshots",
    action: "backup",
  },
  {
    key: "account",
    label: "Account and Sync",
    description: "Manage sessions, OTP auth, and cloud sync",
    action: "account",
  },
  {
    key: "about",
    label: "About Developer",
    description: "HNG showcase, portfolio, and developer profile",
    action: "about",
  },
];

export const COMMAND_PALETTE_ITEMS: NavCommand[] = [
  // Navigation commands
  {
    id: "nav-tasks",
    title: "Go to Tasks",
    description: "View and organize your daily task backlog",
    category: "navigation",
    href: "/",
    shortcut: "G T",
    keywords: ["todo", "backlog", "list", "tasks", "home"],
  },
  {
    id: "nav-followups",
    title: "Go to Follow Ups",
    description: "Commitments, contacts, and communication actions",
    category: "navigation",
    href: "/followups",
    shortcut: "G F",
    badgeKey: "followups",
    keywords: ["commitments", "reminders", "crm", "contacts", "followups"],
  },
  {
    id: "nav-notes",
    title: "Go to Notes",
    description: "Rich-text documentation and actionable notes",
    category: "navigation",
    href: "/notes",
    shortcut: "G N",
    keywords: ["scratchpad", "markdown", "editor", "docs", "notes"],
  },
  {
    id: "nav-inbox",
    title: "Go to Inbox",
    description: "Triage captured links, thoughts, and tasks",
    category: "navigation",
    href: "/inbox",
    shortcut: "G I",
    badgeKey: "inbox",
    keywords: ["capture", "triage", "inbox", "incoming"],
  },
  {
    id: "nav-plan",
    title: "Go to Plan My Day",
    description: "Capacity-guided realistic daily scheduling",
    category: "navigation",
    href: "/plan",
    shortcut: "G P",
    keywords: ["schedule", "capacity", "day plan", "focus"],
  },
  {
    id: "nav-calendar",
    title: "Go to Calendar",
    description: "Monthly view with scheduled deadlines and commitments",
    category: "navigation",
    href: "/calendar",
    shortcut: "G C",
    keywords: ["dates", "deadlines", "month", "schedule"],
  },
  {
    id: "nav-analytics",
    title: "Go to Analytics",
    description: "Personal velocity and completion insights",
    category: "navigation",
    href: "/analytics",
    shortcut: "G A",
    keywords: ["metrics", "stats", "velocity", "insights", "charts"],
  },

  // Actions
  {
    id: "action-capture",
    title: "Quick Capture",
    description: "Capture an idea, link, or note instantly",
    category: "actions",
    action: "capture",
    shortcut: "Alt+C",
    keywords: ["new", "quick", "save", "jot", "capture"],
  },
  {
    id: "action-backup",
    title: "Backup and Restore",
    description: "Export or import local JSON data snapshot",
    category: "actions",
    action: "backup",
    keywords: ["export", "import", "download", "json", "restore"],
  },
  {
    id: "action-account",
    title: "Account and Sync",
    description: "Manage sessions, cloud backup, and devices",
    category: "settings",
    action: "account",
    keywords: ["profile", "login", "otp", "cloud", "sync", "auth"],
  },
  {
    id: "action-theme",
    title: "Toggle Theme",
    description: "Switch between dark and light workspace presentation",
    category: "settings",
    action: "theme",
    keywords: ["dark mode", "light mode", "appearance", "color", "theme"],
  },
  {
    id: "action-about",
    title: "About Developer",
    description: "Developer profile, HNG internship, and portfolio",
    category: "settings",
    action: "about",
    keywords: ["info", "showcase", "hng", "developer", "about"],
  },
];

export function isPrimaryActive(
  itemKey: PrimaryNavKey,
  activeRoute?: string
): boolean {
  if (!activeRoute) return itemKey === "tasks";

  const normalized = activeRoute.toLowerCase().replace(/^\/+/, "");

  switch (itemKey) {
    case "tasks":
      return normalized === "" || normalized === "tasks";
    case "followups":
      return normalized === "followups";
    case "notes":
      return normalized === "notes" || normalized.startsWith("notes/");
    case "more":
      return (
        normalized === "inbox" ||
        normalized === "plan" ||
        normalized === "calendar" ||
        normalized === "analytics" ||
        normalized === "privacy" ||
        normalized === "more"
      );
    default:
      return false;
  }
}

export function resolveBadgeCount(
  badgeKey: "followups" | "inbox" | undefined,
  counts: { dueFollowUps?: number; pendingCaptures?: number }
): number {
  if (!badgeKey) return 0;
  if (badgeKey === "followups") {
    return Math.max(0, counts.dueFollowUps ?? 0);
  }
  if (badgeKey === "inbox") {
    return Math.max(0, counts.pendingCaptures ?? 0);
  }
  return 0;
}

export function matchCommand(command: NavCommand, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  if (command.title.toLowerCase().includes(normalizedQuery)) return true;
  if (command.description.toLowerCase().includes(normalizedQuery)) return true;
  if (command.shortcut && command.shortcut.toLowerCase().replace(/\s+/g, "").includes(normalizedQuery.replace(/\s+/g, ""))) return true;

  if (command.keywords && command.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))) {
    return true;
  }

  return false;
}
