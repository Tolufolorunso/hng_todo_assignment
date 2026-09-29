# Feature: Microsoft Word-style WYSIWYG rich text notes editor

**From build-plan:** feature 18
**Build attempt:** 1
**Branch:** feature/microsoft-word-style-wysiwyg-rich-text-notes-editor
**Status:** verified

## Goal

Upgrade the notes editor from a plain markdown textarea into a familiar,
desktop-grade Microsoft Word-style WYSIWYG rich text editor with a formatting
ribbon (Bold, Italic, Underline, Strikethrough, Text Alignment, Text Highlight
Color, Text Color, Font Size, Headings/Styles, Bullet & Numbered Lists, Icon/Symbol
inserter, and Superscript/Subscript), persisting clean formatted HTML in
IndexedDB and displaying tag-free excerpts in the notes list.

## In scope

- Create `lib/html.ts` and `lib/html.test.ts`:
  - `stripHtmlToText(html: string): string` stripping markup and decoding entities.
  - `createExcerpt(html: string, maxLength?: number): string` generating clean,
    readable card summaries.
  - Update `filterNotes` in `lib/notes.ts` to search against stripped plain text.
  - Increase `NOTE_BODY_MAX_LENGTH` in `lib/validation.ts` to 50,000 characters to
    accommodate formatted HTML markup.
- Build `components/notes/WysiwygEditor.tsx`:
  - Word-style ribbon toolbar with organized tool groups:
    - Headings / Styles dropdown: Normal text, Heading 1, Heading 2, Heading 3,
      Quote block.
    - Font Size selector: Small (12px), Normal (14px), Medium (16px), Large (18px),
      Extra Large (22px).
    - Character formatting: Bold (**B**), Italic (*I*), Underline (<u>U</u>),
      Strikethrough (~~S~~), Superscript (X²), Subscript (X₂).
    - Colors: Text color palette and highlight background color palette.
    - Paragraph alignment: Align Left, Align Center, Align Right, Justify.
    - Lists: Bulleted list, Numbered list.
    - Symbol & Icon Inserter: Popover picker with productivity symbols and icons
      (✔, ★, ⚡, 💡, 📌, 🔥, 🎯, 🚀, ✨, 📅, ⏱️, etc.).
    - Clear formatting & Undo/Redo controls.
  - Contenteditable editing canvas styled with comfortable typography, line height,
    and placeholder behavior when empty.
  - Bidirectional synchronization between editor DOM and string state.
- Update `components/notes/NoteEditor.tsx`:
  - Replace the plain `<textarea>` with `<WysiwygEditor />`.
  - Pass through validation errors, disabled states, and save handlers.
- Update `components/notes/NoteList.tsx`:
  - Extract and display clean plain text previews without HTML tags on note cards.

## Out of scope

- Markdown parsing or syntax highlighting (the user explicitly requested Word-style
  WYSIWYG rather than markdown).
- Media file uploads or image attachments (notes remain lightweight HTML documents).

## Build loop

- Step review: `feature` (review after all steps complete).
- Checkpoint commits: `disabled`.

## Build steps

- [x] 1. **HTML excerpt helpers and validation update** - create `lib/html.ts`
  with `stripHtmlToText` and `createExcerpt`, add unit tests in `lib/html.test.ts`,
  update `filterNotes` in `lib/notes.ts`, and expand `NOTE_BODY_MAX_LENGTH` to 50,000
  in `lib/validation.ts`.
  Done when: `npm run test` passes with full coverage over HTML stripping, entity
  decoding, and note filtering.
- [x] 2. **Microsoft Word-style WYSIWYG editor component** - build
  `components/notes/WysiwygEditor.tsx` with formatting ribbon toolbar (bold,
  italic, underline, strikethrough, alignment, colors, font sizes, headings,
  lists, symbol/icon inserter, super/subscript) and contenteditable canvas.
  Done when: formatting commands apply smoothly to selected text and HTML
  is generated accurately.
- [x] 3. **NoteEditor and NoteList integration** - replace the plain textarea
  in `components/notes/NoteEditor.tsx` with `<WysiwygEditor />` and update
  `components/notes/NoteList.tsx` to display tag-stripped excerpts.
  Done when: notes can be created and formatted with the ribbon, saved to
  IndexedDB, reloaded with formatting preserved, and listed with clean previews.
- [x] 4. **Verification and build gate** - run test suite, linter, and production
  build.
  Done when: `npm run test`, `npm run lint`, and `npm run build` all exit 0.

## Files / areas

- `lib/html.ts` (new)
- `lib/html.test.ts` (new)
- `lib/validation.ts`
- `lib/notes.ts`
- `components/notes/WysiwygEditor.tsx` (new)
- `components/notes/NoteEditor.tsx`
- `components/notes/NoteList.tsx`

## Data / contracts

- `Note.body`: stores clean HTML markup (e.g. `<p>Hello <b>world</b></p>`)
- `NOTE_BODY_MAX_LENGTH`: 50,000 characters
- Supported toolbar actions:
  - Formatting: `bold`, `italic`, `underline`, `strikeThrough`, `superscript`, `subscript`
  - Block: `h1`, `h2`, `h3`, `p`, `blockquote`
  - Alignment: `justifyLeft`, `justifyCenter`, `justifyRight`, `justifyFull`
  - Lists: `insertUnorderedList`, `insertOrderedList`
  - Colors: `foreColor`, `hiliteColor`
  - Symbols: `insertText`

## Testing

- Unit tests in `lib/html.test.ts` verifying:
  - HTML tag removal (`<b>test</b>` -> `test`).
  - Entity decoding (`&amp;` -> `&`, `&lt;` -> `<`, etc.).
  - Excerpt generation and length truncation.
  - Multi-line / nested tag handling.
- Full verification via `npm run test`, `npm run lint`, and `npm run build`.

## Notes for the AI

- Use native browser `contentEditable` and `document.execCommand` / DOM Selection
  APIs without external heavy editor dependencies to keep bundle size minimal.
- Ensure all toolbar buttons have accessible `aria-label` and `title` attributes.
- Ensure zero em dashes in code, comments, or copy.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5525,"specSha256":"34c8b0111fb6a9f2afe8e14b65e67b9b1bc70941d74372520e1205ca8f567a68","branch":"refs/heads/feature/microsoft-word-style-wysiwyg-rich-text-notes-editor","head":"f8566dbe489e6075bc20aa50bc2620d39a3c6456","baseRef":"refs/heads/main","baseCommit":"f8566dbe489e6075bc20aa50bc2620d39a3c6456","sourceTree":"ef8159b5ee3e738d65b19095ae4152151308d107","absentOptional":[]} -->
