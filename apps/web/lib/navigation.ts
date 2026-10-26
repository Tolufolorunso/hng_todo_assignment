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
  badgeKey?: "followups" | "inbox";
}

export interface SecondaryNavItem {
  key: SecondaryNavKey;
  label: string;
  description: string;
  href?: string;
  action?: "backup" | "account" | "capture" | "about";
  badgeKey?: "followups" | "inbox";
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    key: "tasks",
    label: "Tasks",
    href: "/",
  },
  {
    key: "followups",
    label: "Follow Ups",
    href: "/followups",
    badgeKey: "followups",
  },
  {
    key: "notes",
    label: "Notes",
    href: "/notes",
  },
  {
    key: "more",
    label: "More",
    href: "#more",
    badgeKey: "inbox",
  },
];

export const SECONDARY_NAV_ITEMS: SecondaryNavItem[] = [
  {
    key: "inbox",
    label: "Inbox",
    description: "Fast offline capture and triage",
    href: "/inbox",
    badgeKey: "inbox",
  },
  {
    key: "plan",
    label: "Plan My Day",
    description: "Capacity-aware daily planning",
    href: "/plan",
  },
  {
    key: "calendar",
    label: "Calendar",
    description: "Monthly schedule and due dates",
    href: "/calendar",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Completion trends and productivity insights",
    href: "/analytics",
  },
];

export const QUICK_ACTION_ITEMS: SecondaryNavItem[] = [
  {
    key: "capture",
    label: "Quick Capture",
    description: "Instant note or task capture (Alt+C)",
    action: "capture",
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
