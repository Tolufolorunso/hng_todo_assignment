# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P3] fixed - The tasks `completed` index can never contain a record

**File:** lib/db.ts:12, lib/db.ts:50
**Found:** 2026-09-29 by /audit independent (scope: current; lens: quality)
**Why it matters:** IndexedDB only indexes keys of type number, date, string, binary, or array; booleans are not valid keys. Because the store runs `createIndex("completed", "completed")` on a boolean field, the index exists but is permanently empty. Verified empirically: after writing one completed and one incomplete task, `index("completed").count()` returns 0 while `index("dueDate").count()` returns 1. The documented contract in `blueprint/context/project-overview.md` states the store is "Indexed on `completed`, `dueDate`, and `updatedAt`", and build-plan Feature 6 plans a status filter, so the index gives a false impression of queryability. The declared schema type `completed: number` (lib/db.ts:12) also misdescribes the stored boolean. No current code reads this index, so nothing is broken today.
**Suggested fix:** Either drop the `completed` index and filter in memory (`listTasks` already reads all tasks and sorts in memory), or, only if Feature 6 needs an indexed status query, keep an indexable derived field such as a numeric or string status. Removing the index loses only the literal plan contract "indexed on completed"; no current behavior depends on it.
**Resolution:** Fixed in fix/remove-completed-index. Upgraded DB_VERSION to 4, removed `completed` from `TaskFlowDB['tasks']['indexes']`, removed index creation on new databases, and deleted legacy `completed` index in upgrade handler. Verified via 11 passing tests in `lib/db.test.ts`.

### F-02 [P3] fixed - Edit-form focus targets are coupled to validation message wording

**File:** components/tasks/TaskEditForm.tsx:25
**Found:** 2026-09-29 by /audit independent (scope: current; lens: tests)
**Why it matters:** `focusFieldFor` chooses which control to focus by matching the leading words of the validator's human-readable error ("Description...", "Priority...", "Due date..."), falling back to Title otherwise. Any wording change in lib/validation.ts silently reroutes focus to Title, breaking the spec's "focus on the offending control" done-when, and there is no component test guarding that coupling.
**Suggested fix:** Return a stable field identifier or code from the validators, or map the attempted field directly in the submit handler, so focus behavior does not depend on message copy.
**Resolution:** Fixed in fix/decouple-validation-focus-targets. Added stable `field` property to `ValidationResult` in `lib/validation.ts`, returned `field` on every sub-validator failure, removed `focusFieldFor` from `TaskEditForm.tsx` and `NoteEditor.tsx` in favor of reading `validation.field` directly, and covered all field error return paths with 45 passing unit tests in `lib/validation.test.ts`.

### F-04 [P2] fixed - Stored WYSIWYG HTML is injected into the DOM without sanitization

**File:** components/tasks/TaskItem.tsx:273, components/notes/StandaloneNoteView.tsx:346
**Found:** 2026-09-30 by /audit (scope: full; lens: security)
**Why it matters:** Note bodies and task descriptions are rendered with `dangerouslySetInnerHTML` and nothing validates or sanitizes the stored HTML (lib/validation.ts checks only length; lib/backup.ts checks only field shapes). The editor is self-XSS-safe, but the backup restore path is a real trust boundary: any `.json` backup file can be imported (merge or replace), and its `description`/`body` strings are then executed as HTML in the page origin, so a backup shared by someone else can inject script via event-handler attributes (e.g. an `onerror` handler) on any load. Vercel headers include no CSP to mitigate this. Single-user product, so severity stays P2, but the import feature makes the boundary reachable.
**Suggested fix:** Sanitize once on save (restore/import and the editor save path) to a whitelist matching the tags the editor actually produces (p, h1-h3, blockquote, ul, ol, li, b/strong, i/em, u, s, span/font with style color) and drop event-handler attributes and script/style/iframe/link tags. A tiny inline sanitizer avoids adding a dependency; a CSP header in vercel.json is a cheap second layer.
**Resolution:** Fixed in fix/sanitize-stored-wysiwyg-html. Added `sanitizeHtml` in `lib/html.ts` with tag/attribute whitelisting and recursive script/iframe/style/event-handler stripping; sanitized descriptions and bodies on input and patch in `lib/validation.ts`, and on database restore in `lib/backup.ts`; added CSP security header in `vercel.json`; verified via 193 passing tests in unit test suite.

### F-14 [P2] open - The desktop More trigger cannot toggle its menu closed

**File:** apps/web/components/app/MorePopover.tsx:37-60; apps/web/components/app/AppHeader.tsx:229-276
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** The outside-pointer handler closes the menu on the trigger's pointer event, then the click handler reopens it.
**Suggested fix:** Include the trigger in the containment boundary or use one explicit toggle path.
**Resolution:**

### F-20 [P2] open - Critical responsive dialog and navigation behavior has no browser coverage

**File:** apps/web/vitest.config.ts:4-11; apps/web/package.json:5-10
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: tests)
**Why it matters:** All 521 tests run in Node and no browser tests render the header, dialogs, More popover, or bottom sheet. Pure unit tests passed while core viewport behavior was broken.
**Suggested fix:** Add focused browser coverage for dialog close paths, viewport bounds, mobile More visibility, focus restoration, header overflow, theme action, and desktop More toggle.
**Resolution:**
