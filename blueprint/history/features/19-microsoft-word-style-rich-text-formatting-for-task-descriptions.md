# Feature: Microsoft Word-style rich text formatting for task descriptions

**From build-plan:** feature 19
**Build attempt:** 1
**Branch:** feature/microsoft-word-style-rich-text-formatting-for-task-descriptions
**Status:** verified

## Goal

Bring the desktop-grade Microsoft Word-style WYSIWYG rich text formatting
ribbon to task descriptions in both creation and editing modes, expanding
description limits, rendering styled HTML in task item views, and searching
across tag-stripped plain text.

## In scope

- Update `lib/validation.ts` and `lib/validation.test.ts`:
  - Expand `DESCRIPTION_MAX_LENGTH` from 2,000 to 20,000 characters to comfortably
    accommodate formatted HTML markup.
  - Ensure `validateTaskInput` and `validateTaskPatch` accept rich HTML descriptions
    within the expanded limit.
- Update `lib/tasks.ts` and `lib/tasks.test.ts`:
  - Enhance `searchTasks` to search across tag-stripped plain text alongside HTML
    content using `stripHtmlToText` from `lib/html.ts`.
- Update `components/tasks/TaskEditForm.tsx`:
  - Replace the plain `<textarea>` for task descriptions with `<WysiwygEditor />`.
  - Pass through validation errors, disabled states, and save handlers.
- Update `components/tasks/TaskForm.tsx`:
  - Add an expandable "Add formatted details" toggle that reveals `<WysiwygEditor />`
    with the formatting ribbon for task descriptions during task creation.
  - Maintain fast single-line quick-add workflow when details are not needed.
- Update `components/tasks/TaskItem.tsx`:
  - Render rich HTML formatted task descriptions with clean prose typography
    (bold, italic, underline, lists, headings, highlights, blockquotes, symbols).
  - Support expand/collapse for long descriptions, keeping task cards compact while
    allowing full rich viewing.
  - Maintain 100% backward compatibility with existing plain-text tasks in IndexedDB.

## Out of scope

- Database schema migration (IndexedDB stores `description: string`, which holds HTML
  with zero migration needed).
- Media file or image attachments.

## Build loop

- Step review: `feature` (review after all steps complete).
- Checkpoint commits: `disabled`.

## Build steps

- [x] 1. **Validation and task search update** - expand `DESCRIPTION_MAX_LENGTH` to
  20,000 in `lib/validation.ts`, update `searchTasks` in `lib/tasks.ts` to search
  plain text alongside HTML via `stripHtmlToText`, and add unit tests in
  `lib/validation.test.ts` and `lib/tasks.test.ts`.
  Done when: `npm run test` passes with full coverage over expanded task description
  length limits and tag-stripped task search.
- [x] 2. **TaskEditForm and TaskForm WYSIWYG editor integration** - replace the plain
  textarea in `components/tasks/TaskEditForm.tsx` with `<WysiwygEditor />`, and add an
  expandable rich description field to `components/tasks/TaskForm.tsx`.
  Done when: task descriptions can be formatted with the ribbon during both creation
  and editing, saving clean HTML.
- [x] 3. **TaskItem rich HTML rendering and prose typography** - update
  `components/tasks/TaskItem.tsx` to render formatted HTML descriptions with
  proper prose styling (lists, bold, italic, headings, highlights) and clean
  expand/collapse handling.
  Done when: tasks with rich text descriptions render properly formatted content
  in the task list without raw HTML tags escaping.
- [x] 4. **Verification and build gate** - run test suite, linter, and production
  build.
  Done when: `npm run test`, `npm run lint`, and `npm run build` all exit 0.

## Files / areas

- `lib/validation.ts`
- `lib/validation.test.ts`
- `lib/tasks.ts`
- `lib/tasks.test.ts`
- `components/tasks/TaskEditForm.tsx`
- `components/tasks/TaskForm.tsx`
- `components/tasks/TaskItem.tsx`

## Data / contracts

- `Task.description`: stores formatted HTML markup (e.g. `<p>Review <b>Q3 goals</b></p>`)
- `DESCRIPTION_MAX_LENGTH`: 20,000 characters
- Existing plain text descriptions render transparently without breaking
- Search matches query terms against tag-stripped plain text

## Testing

- Unit tests in `lib/validation.test.ts`:
  - Task description boundary testing up to 20,000 characters.
  - Acceptance of valid HTML markup in task descriptions.
- Unit tests in `lib/tasks.test.ts`:
  - Search matching words inside HTML tags (`<p>keyword</p>` matched by `keyword`).
  - Search ignoring HTML tag names (e.g. searching "span" does not match `<span>hello</span>`).
- Full verification via `npm run test`, `npm run lint`, and `npm run build`.

## Notes for the AI

- Reuse `<WysiwygEditor />` from `components/notes/WysiwygEditor.tsx`.
- Ensure zero em dashes in code, comments, or copy.
- Maintain accessible labels and keyboard controls.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4692,"specSha256":"d847e36b57a586a11f9509f50e29b0739ba6875ce72e95dfdfac197f0d9c5ee1","branch":"refs/heads/feature/microsoft-word-style-rich-text-formatting-for-task-descriptions","head":"3a4f2a1dc0c02136be3cedfcf019f7d3f6423133","baseRef":"refs/heads/main","baseCommit":"3a4f2a1dc0c02136be3cedfcf019f7d3f6423133","sourceTree":"4c73af498aa7c2c7ee15da79a843c797862bb493","absentOptional":[]} -->
