import { describe, it, expect } from "vitest";
import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  QUICK_ACTION_ITEMS,
  COMMAND_PALETTE_ITEMS,
  isPrimaryActive,
  resolveBadgeCount,
  matchCommand,
} from "./navigation";

describe("Navigation Module", () => {
  describe("Primary Navigation Items", () => {
    it("defines exactly four primary navigation items", () => {
      expect(PRIMARY_NAV_ITEMS).toHaveLength(4);
      expect(PRIMARY_NAV_ITEMS.map((item) => item.key)).toEqual([
        "tasks",
        "followups",
        "notes",
        "more",
      ]);
    });

    it("assigns appropriate badges and shortcuts to primary items", () => {
      const followups = PRIMARY_NAV_ITEMS.find((item) => item.key === "followups");
      const more = PRIMARY_NAV_ITEMS.find((item) => item.key === "more");
      const tasks = PRIMARY_NAV_ITEMS.find((item) => item.key === "tasks");
      const notes = PRIMARY_NAV_ITEMS.find((item) => item.key === "notes");

      expect(followups?.badgeKey).toBe("followups");
      expect(more?.badgeKey).toBe("inbox");
      expect(tasks?.badgeKey).toBeUndefined();
      expect(notes?.badgeKey).toBeUndefined();

      expect(tasks?.shortcut).toBe("G T");
      expect(followups?.shortcut).toBe("G F");
      expect(notes?.shortcut).toBe("G N");
      expect(more?.shortcut).toBe("G M");
    });
  });

  describe("Secondary and Quick Action Items", () => {
    it("defines the expected secondary navigation tools with shortcuts", () => {
      const keys = SECONDARY_NAV_ITEMS.map((item) => item.key);
      expect(keys).toEqual(["inbox", "plan", "calendar", "analytics"]);

      for (const item of SECONDARY_NAV_ITEMS) {
        expect(item.label).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.href).toBeTruthy();
        expect(item.shortcut).toMatch(/^G [A-Z]$/);
      }
    });

    it("defines the expected quick action utilities", () => {
      const keys = QUICK_ACTION_ITEMS.map((item) => item.key);
      expect(keys).toEqual(["capture", "backup", "account", "about"]);

      for (const item of QUICK_ACTION_ITEMS) {
        expect(item.label).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.action).toBeTruthy();
      }

      const capture = QUICK_ACTION_ITEMS.find((item) => item.key === "capture");
      expect(capture?.shortcut).toBe("Alt+C");
    });
  });

  describe("Command Palette Items and Matcher", () => {
    it("defines comprehensive navigation and action commands", () => {
      expect(COMMAND_PALETTE_ITEMS.length).toBeGreaterThanOrEqual(10);

      const navCommands = COMMAND_PALETTE_ITEMS.filter((c) => c.category === "navigation");
      const actionCommands = COMMAND_PALETTE_ITEMS.filter((c) => c.category === "actions");
      const settingCommands = COMMAND_PALETTE_ITEMS.filter((c) => c.category === "settings");

      expect(navCommands.length).toBe(7);
      expect(actionCommands.length).toBe(2);
      expect(settingCommands.length).toBe(3);
    });

    it("matches commands by title, description, shortcut, or keywords", () => {
      const tasksCommand = COMMAND_PALETTE_ITEMS.find((c) => c.id === "nav-tasks")!;
      const captureCommand = COMMAND_PALETTE_ITEMS.find((c) => c.id === "action-capture")!;

      expect(matchCommand(tasksCommand, "")).toBe(true);
      expect(matchCommand(tasksCommand, "Tasks")).toBe(true);
      expect(matchCommand(tasksCommand, "backlog")).toBe(true);
      expect(matchCommand(tasksCommand, "G T")).toBe(true);
      expect(matchCommand(tasksCommand, "gt")).toBe(true);
      expect(matchCommand(tasksCommand, "nonexistent")).toBe(false);

      expect(matchCommand(captureCommand, "quick")).toBe(true);
      expect(matchCommand(captureCommand, "Alt+C")).toBe(true);
      expect(matchCommand(captureCommand, "alt+c")).toBe(true);
    });
  });

  describe("isPrimaryActive", () => {
    it("activates tasks for root or empty route", () => {
      expect(isPrimaryActive("tasks", "")).toBe(true);
      expect(isPrimaryActive("tasks", "/")).toBe(true);
      expect(isPrimaryActive("tasks", "tasks")).toBe(true);
      expect(isPrimaryActive("followups", "/")).toBe(false);
    });

    it("activates followups for followups route", () => {
      expect(isPrimaryActive("followups", "followups")).toBe(true);
      expect(isPrimaryActive("followups", "/followups")).toBe(true);
      expect(isPrimaryActive("tasks", "followups")).toBe(false);
    });

    it("activates notes for notes and note subroutes", () => {
      expect(isPrimaryActive("notes", "notes")).toBe(true);
      expect(isPrimaryActive("notes", "/notes")).toBe(true);
      expect(isPrimaryActive("notes", "notes/note_123")).toBe(true);
      expect(isPrimaryActive("more", "notes")).toBe(false);
    });

    it("activates more for secondary tools and modals", () => {
      expect(isPrimaryActive("more", "inbox")).toBe(true);
      expect(isPrimaryActive("more", "/plan")).toBe(true);
      expect(isPrimaryActive("more", "calendar")).toBe(true);
      expect(isPrimaryActive("more", "analytics")).toBe(true);
      expect(isPrimaryActive("more", "privacy")).toBe(true);
      expect(isPrimaryActive("more", "more")).toBe(true);

      expect(isPrimaryActive("tasks", "inbox")).toBe(false);
      expect(isPrimaryActive("followups", "plan")).toBe(false);
    });
  });

  describe("resolveBadgeCount", () => {
    it("returns zero when badgeKey is undefined", () => {
      expect(
        resolveBadgeCount(undefined, { dueFollowUps: 5, pendingCaptures: 3 })
      ).toBe(0);
    });

    it("resolves followups badge count", () => {
      expect(
        resolveBadgeCount("followups", { dueFollowUps: 7, pendingCaptures: 2 })
      ).toBe(7);
      expect(
        resolveBadgeCount("followups", { dueFollowUps: 0, pendingCaptures: 2 })
      ).toBe(0);
      expect(resolveBadgeCount("followups", {})).toBe(0);
    });

    it("resolves inbox badge count", () => {
      expect(
        resolveBadgeCount("inbox", { dueFollowUps: 2, pendingCaptures: 4 })
      ).toBe(4);
      expect(
        resolveBadgeCount("inbox", { dueFollowUps: 2, pendingCaptures: 0 })
      ).toBe(0);
      expect(resolveBadgeCount("inbox", {})).toBe(0);
    });
  });
});
