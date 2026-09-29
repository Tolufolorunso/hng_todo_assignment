import { describe, it, expect } from "vitest";
import { stripHtmlToText, createExcerpt, calculateReadingStats } from "./html";

describe("HTML helpers", () => {
  describe("stripHtmlToText", () => {
    it("returns empty string for empty input", () => {
      expect(stripHtmlToText("")).toBe("");
    });

    it("strips simple formatting tags", () => {
      expect(stripHtmlToText("<p>Hello <b>world</b>, this is <i>italic</i>.</p>")).toBe(
        "Hello world, this is italic."
      );
    });

    it("decodes HTML entities correctly", () => {
      const input = "Tom &amp; Jerry &lt;3 cheese &quot;always&quot; &#39;forever&#39;&nbsp;!";
      expect(stripHtmlToText(input)).toBe("Tom & Jerry <3 cheese \"always\" 'forever' !");
    });

    it("handles lists and block breaks", () => {
      const input = `
        <h1>Meeting Notes</h1>
        <p>Key takeaways:</p>
        <ul>
          <li>First item</li>
          <li>Second item</li>
        </ul>
      `;
      expect(stripHtmlToText(input)).toBe(
        "Meeting Notes Key takeaways: First item Second item"
      );
    });

    it("handles nested formatting and spans", () => {
      const input = '<p><span style="color: red;">Warning:</span> <strong>System</strong> offline.</p>';
      expect(stripHtmlToText(input)).toBe("Warning: System offline.");
    });
  });

  describe("createExcerpt", () => {
    it("returns full text when shorter than maxLength", () => {
      const input = "<p>Short note.</p>";
      expect(createExcerpt(input, 50)).toBe("Short note.");
    });

    it("truncates text and appends ellipsis when longer than maxLength", () => {
      const input = "<p>This is a longer paragraph that definitely exceeds twenty characters.</p>";
      const excerpt = createExcerpt(input, 20);
      expect(excerpt.endsWith("...")).toBe(true);
      expect(excerpt.length).toBeLessThanOrEqual(23);
    });
  });

  describe("calculateReadingStats", () => {
    it("returns 0 words and 0 minutes for empty or whitespace-only content", () => {
      expect(calculateReadingStats("")).toEqual({ words: 0, readingTimeMinutes: 0 });
      expect(calculateReadingStats("<p>   </p>")).toEqual({ words: 0, readingTimeMinutes: 0 });
    });

    it("calculates exact word count and minimum 1 minute reading time for short content", () => {
      const input = "<p>Quick brown fox jumps over the lazy dog.</p>";
      expect(calculateReadingStats(input)).toEqual({ words: 8, readingTimeMinutes: 1 });
    });

    it("handles complex HTML elements, headings, lists, and quotes", () => {
      const input = `
        <h2>Project Architecture</h2>
        <p>This document explains our multi-tier design pattern and state machine.</p>
        <ul>
          <li>Persistent local storage</li>
          <li>Fast client-side indexing</li>
          <li>Offline capability with PWA</li>
        </ul>
      `;
      const stats = calculateReadingStats(input);
      expect(stats.words).toBe(22);
      expect(stats.readingTimeMinutes).toBe(1);
    });

    it("calculates multi-minute reading time for documents longer than 200 words", () => {
      // 450 words should be Math.ceil(450 / 200) = 3 minutes
      const text = Array(450).fill("word").join(" ");
      const html = `<p>${text}</p>`;
      const stats = calculateReadingStats(html);
      expect(stats.words).toBe(450);
      expect(stats.readingTimeMinutes).toBe(3);
    });
  });
});

