import { describe, it, expect } from "vitest";
import { stripHtmlToText, createExcerpt } from "./html";

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
});
