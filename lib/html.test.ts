import { describe, it, expect } from "vitest";
import {
  stripHtmlToText,
  createExcerpt,
  calculateReadingStats,
  sanitizeHtml,
} from "./html";

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

  describe("sanitizeHtml", () => {
    it("returns empty string for empty or non-string input", () => {
      expect(sanitizeHtml("")).toBe("");
      expect(sanitizeHtml(null as never)).toBe("");
      expect(sanitizeHtml(undefined as never)).toBe("");
    });

    it("strips script tags and their inner content", () => {
      expect(sanitizeHtml('<script>alert("xss")</script>Hello')).toBe("Hello");
      expect(sanitizeHtml('<script src="https://evil.com/xss.js"></script>Hello')).toBe("Hello");
      expect(sanitizeHtml('Hello<script type="text/javascript">console.log(1)</script>World')).toBe(
        "HelloWorld",
      );
    });

    it("defeats nested script tag bypass attempts", () => {
      expect(sanitizeHtml('<script><script>alert(1)</script></script>World')).toBe("World");
      expect(sanitizeHtml('<script type="text/javascript"><script>alert(1)</script></script>World')).toBe(
        "World",
      );
    });

    it("strips iframe, style, form, and object tags and their content", () => {
      expect(sanitizeHtml('<iframe src="https://evil.com"></iframe>Safe')).toBe("Safe");
      expect(sanitizeHtml("<style>body { display: none; }</style>Content")).toBe("Content");
      expect(sanitizeHtml('<form action="/steal"><input name="pass" /></form>Text')).toBe("Text");
      expect(sanitizeHtml('<object data="evil.swf"></object>Text')).toBe("Text");
    });

    it("strips img tags and event handlers", () => {
      expect(sanitizeHtml('<img src="x" onerror="alert(1)" />Safe text')).toBe("Safe text");
      expect(sanitizeHtml('<img src=x onerror=alert(1)>Safe text')).toBe("Safe text");
    });

    it("strips event handlers from allowed tags", () => {
      expect(sanitizeHtml('<p onclick="alert(1)">Clickable</p>')).toBe("<p>Clickable</p>");
      expect(sanitizeHtml('<b onmouseover="steal()">Important</b>')).toBe("<b>Important</b>");
      expect(sanitizeHtml('<span onfocus="hack()">Note</span>')).toBe("<span>Note</span>");
    });

    it("neutralizes javascript:, data:, and vbscript: URIs in links", () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">Click here</a>')).toBe(
        "<a>Click here</a>",
      );
      expect(sanitizeHtml('<a href="javascript:void(0)">Link</a>')).toBe("<a>Link</a>");
      expect(sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">Link</a>')).toBe(
        "<a>Link</a>",
      );
      expect(sanitizeHtml('<a href="vbscript:msgbox(1)">Link</a>')).toBe("<a>Link</a>");
      // Entity encoded
      expect(sanitizeHtml('<a href="jav&#x09;ascript:alert(1)">Link</a>')).toBe("<a>Link</a>");
    });

    it("preserves safe links with http, https, mailto, and relative targets", () => {
      expect(sanitizeHtml('<a href="https://example.com">Website</a>')).toBe(
        '<a href="https://example.com">Website</a>',
      );
      expect(sanitizeHtml('<a href="http://example.com">Insecure</a>')).toBe(
        '<a href="http://example.com">Insecure</a>',
      );
      expect(sanitizeHtml('<a href="mailto:test@example.com">Email</a>')).toBe(
        '<a href="mailto:test@example.com">Email</a>',
      );
      expect(sanitizeHtml('<a href="/notes">Internal</a>')).toBe(
        '<a href="/notes">Internal</a>',
      );
      expect(
        sanitizeHtml('<a href="https://example.com" target="_blank">External</a>'),
      ).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">External</a>');
    });

    it("preserves safe inline styles and strips dangerous CSS", () => {
      expect(
        sanitizeHtml('<span style="color: #94a3b8; background-color: transparent">Styled</span>'),
      ).toBe('<span style="color: #94a3b8; background-color: transparent">Styled</span>');

      expect(
        sanitizeHtml(
          '<span style="color: red; background-image: url(javascript:alert(1))">Sneaky</span>',
        ),
      ).toBe('<span style="color: red">Sneaky</span>');

      expect(
        sanitizeHtml('<span style="color: expression(alert(1))">Expression</span>'),
      ).toBe("<span>Expression</span>");
    });

    it("preserves standard WYSIWYG tags and formatting", () => {
      const wysiwygInput = [
        "<h1>Heading 1</h1>",
        "<h2>Heading 2</h2>",
        "<h3>Heading 3</h3>",
        "<p>Paragraph with <b>bold</b>, <i>italic</i>, <u>underline</u>, and <s>strikethrough</s>.</p>",
        "<blockquote>A wise quote</blockquote>",
        "<ul><li>Bullet 1</li><li>Bullet 2</li></ul>",
        "<ol><li>Number 1</li><li>Number 2</li></ol>",
        "<code>console.log('hi');</code>",
        "<pre>multi line code</pre>",
        "<hr />",
        "<br />",
        '<font color="#f87171">Red text</font>',
      ].join("");

      expect(sanitizeHtml(wysiwygInput)).toBe(wysiwygInput);
    });

    it("preserves table markup", () => {
      const table =
        '<table><thead><tr><th align="left">Header</th></tr></thead><tbody><tr><td colspan="2">Cell</td></tr></tbody></table>';
      expect(sanitizeHtml(table)).toBe(table);
    });

    it("strips HTML comments", () => {
      expect(sanitizeHtml("<!-- sensitive comment --><p>Clean</p>")).toBe("<p>Clean</p>");
    });
  });
});

