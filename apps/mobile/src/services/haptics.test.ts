import { describe, it, expect, beforeEach, vi } from "vitest";
import { hapticFeedback } from "./haptics.js";
import { hapticLog, clearHapticLog } from "../test/haptics-mock.js";
import * as Haptics from "expo-haptics";

describe("Mobile Haptic Feedback Service", () => {
  beforeEach(() => {
    clearHapticLog();
  });

  it("triggers light impact feedback", async () => {
    await hapticFeedback.light();
    expect(hapticLog).toContain("impact:light");
  });

  it("triggers medium impact feedback for task completion", async () => {
    await hapticFeedback.medium();
    expect(hapticLog).toContain("impact:medium");
  });

  it("triggers heavy impact feedback for prominent actions", async () => {
    await hapticFeedback.heavy();
    expect(hapticLog).toContain("impact:heavy");
  });

  it("triggers selection feedback for tabs and filters", async () => {
    await hapticFeedback.selection();
    expect(hapticLog).toContain("selection");
  });

  it("triggers notification feedback for success, warning, and error", async () => {
    await hapticFeedback.success();
    await hapticFeedback.warning();
    await hapticFeedback.error();

    expect(hapticLog).toContain("notification:success");
    expect(hapticLog).toContain("notification:warning");
    expect(hapticLog).toContain("notification:error");
  });

  it("safely catches and swallows errors on unsupported platforms", async () => {
    const spy = vi.spyOn(Haptics, "impactAsync").mockRejectedValueOnce(new Error("Haptics unavailable"));
    await expect(hapticFeedback.light()).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
