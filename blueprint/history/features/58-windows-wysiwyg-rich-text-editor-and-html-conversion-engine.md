# Feature: Windows WYSIWYG rich-text editor and HTML conversion engine

**From build-plan:** feature 58  
**Build attempt:** 1  
**Status:** verified  
**Branch:** feature/windows-wysiwyg-rich-text-editor-and-html-conversion-engine  

---

## Goal

Implement a reusable, accessible WPF `WysiwygEditorControl` and bidirectional `taskflow-html-v1` conversion engine for the Windows desktop application (`apps/windows/TaskFlow`), providing full visual and functional parity with the Next.js web rich-text editor (`WysiwygEditor.tsx`), including inline styles, headings, lists, quotes, text alignment, 8 text colors, 7 background highlights, 24 quick symbols, undo/redo, live metrics, and a read-only formatted text renderer.

---

## Design reference

- **Web WYSIWYG Editor Reference:** [`apps/web/components/notes/WysiwygEditor.tsx`](file:///c:/Users/oreofe/Desktop/Agentic AI/taskflow/apps/web/components/notes/WysiwygEditor.tsx)
- **HTML Sanitization & Metrics Reference:** [`apps/web/lib/html.ts`](file:///c:/Users/oreofe/Desktop/Agentic AI/taskflow/apps/web/lib/html.ts)
- **Text Colors (8):**
  - Default: `inherit` / `TextPrimary`
  - Slate: `#94A3B8`
  - Indigo: `#818CF8`
  - Blue: `#38BDF8`
  - Emerald: `#34D399`
  - Amber: `#FBBF24`
  - Rose: `#FB7185`
  - Red: `#F87171`
- **Highlight Colors (7):**
  - None: `transparent`
  - Yellow: `#FACC15` (`rgba(250, 204, 21, 0.35)`)
  - Green: `#4ADE80` (`rgba(74, 222, 128, 0.35)`)
  - Cyan: `#38BDF8` (`rgba(56, 189, 248, 0.35)`)
  - Purple: `#A855F7` (`rgba(168, 85, 247, 0.35)`)
  - Pink: `#F472B6` (`rgba(244, 114, 182, 0.35)`)
  - Orange: `#FB923C` (`rgba(251, 146, 60, 0.35)`)
- **Quick Symbols (24):**
  - Check (✔), Cross (✕), Warning (⚠️), Star (★), Lightning (⚡), Idea (💡), Pin (📌), Target (🎯), Fire (🔥), Rocket (🚀), Sparkles (✨), Calendar (📅), Timer (⏱️), Hourglass (⏳), Arrow right (➔), Chevron right (➤), Bullet (•), Diamond (❖), Equal (≈), Not equal (≠), Plus minus (±), Infinity (∞), Section (§), Copyright (©)

---

## In scope

- Create bidirectional `HtmlFlowDocumentEngine` under `apps/windows/TaskFlow/Common/`:
  - `FlowDocumentToHtml(FlowDocument doc)`: serializes WPF documents to clean, sanitized `taskflow-html-v1` HTML (`<p>`, `<h1>`..`<h3>`, `<blockquote>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<u>`, `<s>`, `<sub>`, `<sup>`, `<span style="color:...; background-color:...">`, `<br>`).
  - `HtmlToFlowDocument(string html)`: parses `taskflow-html-v1` HTML strings into native WPF `FlowDocument` with corresponding typography, colors, and lists.
  - Safe tag filtering: strips `<script>`, `<iframe>`, `<style>`, and event handlers.
  - Entity decoding: decodes `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, and numeric entities.
- Create `HtmlMetricsHelper` under `apps/windows/TaskFlow/Common/`:
  - `StripHtmlToText(string html)`: extracts plain text.
  - `CalculateReadingStats(string html)`: returns `{ Words, ReadingTimeMinutes }`.
  - `CreateExcerpt(string html, int maxLength = 120)`: creates plain text preview excerpts.
- Create `WysiwygEditorControl` under `apps/windows/TaskFlow/Controls/`:
  - Ribbon Toolbar with active formatting indicators:
    - Inline styles: Bold, Italic, Underline, Strikethrough, Superscript, Subscript.
    - Block format selector: Paragraph, Heading 1, Heading 2, Heading 3.
    - Lists: Bullet list, Numbered list.
    - Blockquote toggle.
    - Text alignment: Left, Center, Right, Justify.
    - Color picker popups: 8 text colors and 7 background highlight colors.
    - Symbol picker popup: 24 quick Unicode symbols.
    - History: Undo and Redo buttons.
  - Content area:
    - Embedded WPF `RichTextBox` with seamless dark surface background, cursor caret brush, and placeholder watermark overlay when empty.
  - Status footer:
    - Live word count and character count displays.
  - DependencyProperties:
    - `HtmlText` (TwoWay bindable string property).
    - `Placeholder` (watermark string).
    - `IsReadOnly` (read-only mode).
    - `MinEditorHeight` (minimum content height).
- Create `FormattedTextRendererControl` under `apps/windows/TaskFlow/Controls/`:
  - Lightweight presenter for rendering formatted HTML in task cards and note lists without raw HTML tags.
- Unit and UI automation tests under `apps/windows/TaskFlow.Tests/`:
  - `HtmlFlowDocumentEngineTests.cs` verifying round-trip conversion, tag mapping, entity decoding, XSS stripping, and metrics calculation.
  - `WysiwygEditorControlTests.cs` verifying control instantiation, two-way DP synchronization, and read-only presentation.

---

## Out of scope

- Rebuilding the Task Modal dialog and updating `TasksView` cards (scheduled for Feature 59).
- Rebuilding the Note Reader document view and updating `NotesView` (scheduled for Feature 60).
- Modifying Web (`apps/web`) or Mobile (`apps/mobile`) applications.
- Database schema changes or backend API route changes.

---

## Build loop

- `workflow.stepReview`: feature
- `workflow.checkpointCommits`: disabled
- Each build step must leave `dotnet test apps/windows/TaskFlow.sln` passing.
- Final step must pass `npm run verify`.

---

## Build steps

- [x] 1. **Implement Bidirectional HtmlFlowDocumentEngine and Metrics Utilities**
  - Create `apps/windows/TaskFlow/Common/HtmlFlowDocumentEngine.cs` with `FlowDocumentToHtml` and `HtmlToFlowDocument`.
  - Support headings (H1-H3), paragraphs, lists (bullet, decimal), blockquotes, text alignment, inline formatting (bold, italic, underline, strikethrough, sub/sup), colors, highlights, and entity decoding.
  - Create `apps/windows/TaskFlow/Common/HtmlMetricsHelper.cs` with `StripHtmlToText`, `CalculateReadingStats`, and `CreateExcerpt`.
  - Done when: unit tests verify accurate round-trip conversion, entity handling, and plain text metric extraction.

- [x] 2. **Build WysiwygEditorControl with Ribbon Toolbar and Popups**
  - Create `apps/windows/TaskFlow/Controls/WysiwygEditorControl.xaml` and `WysiwygEditorControl.xaml.cs`.
  - Implement full ribbon toolbar: inline styles (B, I, U, S, Sub, Sup), block dropdown (P, H1-H3), lists (bullet, numbered), quote, alignment (left, center, right, justify), undo, and redo.
  - Implement text color popup (8 colors), highlight popup (7 colors), and symbol picker popup (24 symbols).
  - Implement two-way bindable `HtmlText` DependencyProperty, placeholder watermark, and footer with word/char counters.
  - Done when: unit tests confirm `WysiwygEditorControl` instantiates on STA thread, accepts HTML input, and updates `HtmlText` upon document changes.

- [x] 3. **Implement FormattedTextRendererControl for Read-Only Presentation**
  - Create `apps/windows/TaskFlow/Controls/FormattedTextRendererControl.xaml` and `FormattedTextRendererControl.xaml.cs`.
  - Provide a clean, borderless read-only viewer for rendering `taskflow-html-v1` HTML in cards, excerpts, and detail headers without raw markup.
  - Done when: unit tests verify that `FormattedTextRendererControl` renders formatted documents cleanly from HTML input strings.

- [x] 4. **Add Comprehensive Test Coverage and Execute Verify Gate**
  - Create `apps/windows/TaskFlow.Tests/WysiwygEditorTests.cs` covering all conversion permutations, formatting round-trips, security sanitization, and control lifecycle.
  - Run `dotnet test apps/windows/TaskFlow.sln` and full `npm run verify`.
  - Done when: `npm run verify` exits with code 0 (zero boundary violations, clean lint, and all tests passing across Windows, Web, and Mobile).

---

## Files / areas

- `apps/windows/TaskFlow/Common/HtmlFlowDocumentEngine.cs` (new)
- `apps/windows/TaskFlow/Common/HtmlMetricsHelper.cs` (new)
- `apps/windows/TaskFlow/Controls/WysiwygEditorControl.xaml` & `.cs` (new)
- `apps/windows/TaskFlow/Controls/FormattedTextRendererControl.xaml` & `.cs` (new)
- `apps/windows/TaskFlow.Tests/WysiwygEditorTests.cs` (new)

---

## Data / contracts

- `taskflow-html-v1` format:
  - Allowed tags: `<p>`, `<h1>`, `<h2>`, `<h3>`, `<blockquote>`, `<ul>`, `<ol>`, `<li>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<s>`, `<del>`, `<sub>`, `<sup>`, `<span>`, `<br>`.
  - Allowed style attributes: `color: <hex>`, `background-color: <hex>`, `text-align: left|center|right|justify`.
  - Plain text metrics: 200 words per minute reading pace.

---

## Testing

- `dotnet test apps/windows/TaskFlow.sln`: executes all unit tests including new conversion and editor tests.
- `npm run verify`: runs boundary check, mobile suite, web suite, production build, and windows suite.

---

## Notes for the AI

- Use standard WPF `System.Windows.Documents` types (`FlowDocument`, `Paragraph`, `List`, `ListItem`, `Run`, `Span`, `Bold`, `Italic`, `Underline`).
- When parsing HTML, do not require third-party heavy dependencies; use a clean, robust recursive descent or regex/token parser that strictly enforces the `taskflow-html-v1` tagset.
- When serializing to HTML, avoid XML declaration headers or WPF BAML wrappers; produce standard HTML matching the web client.
- Ensure all brushes use `DynamicResource` tokens where appropriate so editor themes automatically shift with the desktop theme.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9144,"specSha256":"f459fb093c2232cb4ba34e8568f42d0b391968cfe5c1c7e306cd3a2ee37bd5af","branch":"refs/heads/feature/windows-wysiwyg-rich-text-editor-and-html-conversion-engine","head":"dc0becdfc6674674e498b93ab63925880bcc5a37","baseRef":"refs/heads/main","baseCommit":"dc0becdfc6674674e498b93ab63925880bcc5a37","sourceTree":"e387df176e0aeba889cb4448dcfee030f3b20479","absentOptional":[]} -->
