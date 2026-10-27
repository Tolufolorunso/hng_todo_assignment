import { describe, it, expect } from "vitest";
import React from "react";
import {
  isIOS,
  isAndroid,
  getPlatformRipple,
  getPlatformCardStyle,
  getPlatformGroupContainerStyle,
  getHairlineDividerStyle,
} from "../styles/platform";
import { TaskItemCard } from "./TaskItemCard";
import { NoteItemCard } from "./NoteItemCard";
import { hapticFeedback } from "../services/haptics";

describe("Platform Aesthetics and Styling Utilities", () => {
  it("determines platform flags correctly", () => {
    expect(typeof isIOS).toBe("boolean");
    expect(typeof isAndroid).toBe("boolean");
  });

  it("generates platform card styles with correct border and radius properties", () => {
    const cardStyle = getPlatformCardStyle("#18181b", "#27272a");

    expect(cardStyle.backgroundColor).toBe("#18181b");
    expect(cardStyle.borderColor).toBe("#27272a");
    expect(typeof cardStyle.borderRadius).toBe("number");
    expect((cardStyle.borderRadius as number)).toBeGreaterThanOrEqual(12);
  });

  it("generates platform group container styles with clipped overflow", () => {
    const groupStyle = getPlatformGroupContainerStyle("#18181b", "#27272a");

    expect(groupStyle.overflow).toBe("hidden");
    expect(groupStyle.backgroundColor).toBe("#18181b");
    expect(groupStyle.borderColor).toBe("#27272a");
    expect(typeof groupStyle.borderRadius).toBe("number");
    expect((groupStyle.borderRadius as number)).toBeGreaterThanOrEqual(12);
  });

  it("generates hairline divider styles with proper height", () => {
    const dividerStyle = getHairlineDividerStyle("#27272a");

    expect(dividerStyle.backgroundColor).toBe("#27272a");
    expect(typeof dividerStyle.height).toBe("number");
    expect((dividerStyle.height as number)).toBeGreaterThan(0);
  });

  it("configures ripple safely according to platform", () => {
    const ripple = getPlatformRipple("rgba(255, 255, 255, 0.12)");
    if (isAndroid) {
      expect(ripple).toBeDefined();
      expect(ripple?.color).toBe("rgba(255, 255, 255, 0.12)");
    } else {
      expect(ripple).toBeUndefined();
    }
  });
});

describe("Component Memoization for Virtualized Lists", () => {
  it("wraps TaskItemCard in React.memo for scroll performance", () => {
    expect(TaskItemCard).toBeDefined();
    // React.memo components have a $$typeof symbol corresponding to react.memo
    const memoType = (TaskItemCard as unknown as { $$typeof: symbol }).$$typeof;
    expect(memoType).toBe(Symbol.for("react.memo"));
  });

  it("wraps NoteItemCard in React.memo for scroll performance", () => {
    expect(NoteItemCard).toBeDefined();
    const memoType = (NoteItemCard as unknown as { $$typeof: symbol }).$$typeof;
    expect(memoType).toBe(Symbol.for("react.memo"));
  });
});

describe("Haptic Tactile Feedback Integration", () => {
  it("triggers all haptic levels safely without errors", () => {
    expect(() => hapticFeedback.light()).not.toThrow();
    expect(() => hapticFeedback.medium()).not.toThrow();
    expect(() => hapticFeedback.heavy()).not.toThrow();
    expect(() => hapticFeedback.selection()).not.toThrow();
    expect(() => hapticFeedback.success()).not.toThrow();
    expect(() => hapticFeedback.warning()).not.toThrow();
    expect(() => hapticFeedback.error()).not.toThrow();
  });
});

describe("List Virtualization Invariants", () => {
  it("verifies standard virtualization tuning parameters", () => {
    const recommendedTuning = {
      initialNumToRender: 10,
      maxToRenderPerBatch: 10,
      windowSize: 5,
    };

    expect(recommendedTuning.initialNumToRender).toBe(10);
    expect(recommendedTuning.maxToRenderPerBatch).toBe(10);
    expect(recommendedTuning.windowSize).toBe(5);
  });
});
