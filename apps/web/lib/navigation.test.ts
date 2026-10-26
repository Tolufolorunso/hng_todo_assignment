import { describe, it, expect } from "vitest";
import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  QUICK_ACTION_ITEMS,
  isPrimaryActive,
  resolveBadgeCount,
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

    it("assigns appropriate badges to followups and more", () => {
      const followups = PRIMARY_NAV_ITEMS.find((item) => item.key === "followups");
      const more = PRIMARY_NAV_ITEMS.find((item) => item.key === "more");
      const tasks = PRIMARY_NAV_ITEMS.find((item) => item.key === "tasks");
      const notes = PRIMARY_NAV_ITEMS.find((item) => item.key === "notes");

      expect(followups?.badgeKey).toBe("followups");
      expect(more?.badgeKey).toBe("inbox");
      expect(tasks?.badgeKey).toBeUndefined();
      expect(notes?.badgeKey).toBeUndefined();
    });
  });

  describe("Secondary and Quick Action Items", () => {
    it("defines the expected secondary navigation tools", () => {
      const keys = SECONDARY_NAV_ITEMS.map((item) => item.key);
      expect(keys).toEqual(["inbox", "plan", "calendar", "analytics"]);

      for (const item of SECONDARY_NAV_ITEMS) {
        expect(item.label).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.href).toBeTruthy();
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
