import { describe, it, expect } from "vitest";
import { PRIMARY_TABS } from "./Navigator.js";

describe("Mobile Primary Navigation Structure", () => {
  it("contains strictly four primary navigation tabs", () => {
    expect(PRIMARY_TABS).toHaveLength(4);
  });

  it("defines the exact required primary destinations in order", () => {
    const ids = PRIMARY_TABS.map((t) => t.id);
    expect(ids).toEqual(["tasks", "followups", "notes", "more"]);
  });

  it("provides accessible labels and icons for all primary tabs", () => {
    for (const tab of PRIMARY_TABS) {
      expect(tab.label.length).toBeGreaterThan(0);
      expect(tab.icon.length).toBeGreaterThan(0);
    }
  });

  it("does not include secondary tools in the bottom tab bar", () => {
    const ids = PRIMARY_TABS.map((t) => t.id);
    expect(ids).not.toContain("plan");
    expect(ids).not.toContain("inbox");
    expect(ids).not.toContain("calendar");
    expect(ids).not.toContain("analytics");
    expect(ids).not.toContain("search");
    expect(ids).not.toContain("backup");
    expect(ids).not.toContain("account");
  });
});
