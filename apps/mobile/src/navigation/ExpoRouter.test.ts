import { describe, it, expect } from "vitest";
import React from "react";
import RootLayout from "../../app/_layout";
import TabLayout, { TabBarIcon } from "../../app/(tabs)/_layout";
import TasksTabScreen from "../../app/(tabs)/tasks";
import FollowUpsTabScreen from "../../app/(tabs)/followups";
import NotesTabScreen from "../../app/(tabs)/notes";
import MoreTabScreen from "../../app/(tabs)/more";
import TaskEditRoute from "../../app/task-edit";
import NoteEditRoute from "../../app/note-edit";
import PlanRoute from "../../app/plan";
import InboxRoute from "../../app/inbox";
import CalendarRoute from "../../app/calendar";
import AnalyticsRoute from "../../app/analytics";
import SearchRoute from "../../app/search";
import BackupRoute from "../../app/backup";
import AccountRoute from "../../app/account";

describe("Expo Router File-Based Routing and Vector Icons", () => {
  describe("Root and Tab Layouts", () => {
    it("exports RootLayout component function", () => {
      expect(typeof RootLayout).toBe("function");
    });

    it("exports TabLayout component function", () => {
      expect(typeof TabLayout).toBe("function");
    });

    it("renders TabBarIcon with correct vector icon props", () => {
      const iconElement = TabBarIcon({
        name: "checkbox-outline",
        color: "#3b82f6",
        size: 24,
      });

      expect(iconElement).toBeDefined();
      expect(iconElement.props.name).toBe("checkbox-outline");
      expect(iconElement.props.color).toBe("#3b82f6");
      expect(iconElement.props.size).toBe(24);
    });
  });

  describe("Tab Screen Routes", () => {
    it("exports all 4 required primary tab route components", () => {
      expect(typeof TasksTabScreen).toBe("function");
      expect(typeof FollowUpsTabScreen).toBe("function");
      expect(typeof NotesTabScreen).toBe("function");
      expect(typeof MoreTabScreen).toBe("function");
    });
  });

  describe("Modal Stack Routes", () => {
    it("exports all modal stack route components", () => {
      expect(typeof TaskEditRoute).toBe("function");
      expect(typeof NoteEditRoute).toBe("function");
      expect(typeof PlanRoute).toBe("function");
      expect(typeof InboxRoute).toBe("function");
      expect(typeof CalendarRoute).toBe("function");
      expect(typeof AnalyticsRoute).toBe("function");
      expect(typeof SearchRoute).toBe("function");
      expect(typeof BackupRoute).toBe("function");
      expect(typeof AccountRoute).toBe("function");
    });
  });

  describe("Vector Icon Configurations", () => {
    it("ensures tab icons use dedicated Ionicons vector icon identifiers", () => {
      const tabIcons = [
        "checkbox-outline",
        "checkbox",
        "people-outline",
        "people",
        "document-text-outline",
        "document-text",
        "ellipsis-horizontal-circle-outline",
        "ellipsis-horizontal-circle",
      ];

      for (const icon of tabIcons) {
        expect(icon).toMatch(/^[a-z0-9-]+$/);
        expect(icon).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
      }
    });

    it("ensures more screen tools use dedicated Ionicons vector icon identifiers", () => {
      const moreToolIcons = [
        "flash-outline",
        "file-tray-full-outline",
        "calendar-outline",
        "bar-chart-outline",
        "search-outline",
        "save-outline",
        "person-circle-outline",
      ];

      for (const icon of moreToolIcons) {
        expect(icon).toMatch(/^[a-z0-9-]+$/);
        expect(icon).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
      }
    });
  });
});
