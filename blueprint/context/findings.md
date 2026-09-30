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

### F-03 [P2] fixed - Calendar day inspector renders WYSIWYG HTML as literal text

**File:** components/calendar/DayInspector.tsx:169-177
**Found:** 2026-09-30 by /audit (scope: full; lens: quality)
**Why it matters:** Task descriptions are saved as HTML by the WYSIWYG editor (any multi-paragraph or formatted description is markup, e.g. `<div>...</div>`), and TaskItem.tsx:249-275 correctly detects `hasHtml` and renders it as rich HTML. DayInspector instead renders `{task.description}` as a React text child, so React escapes the markup and the calendar inspector shows raw tags like `<p>Buy milk</p>` instead of the formatted description. Reachable from the calendar for any task created with "Add Details".
**Suggested fix:** Render the plain-text form (`stripHtmlToText(task.description)`, matching the excerpt pattern used elsewhere) or reuse the TaskItem hasHtml/dangerouslySetInnerHTML rendering so the inspector matches the task list.
**Resolution:** Fixed in fix/calendar-inspector-wysiwyg-html. Added regex HTML detection (`/<[a-z][\s\S]*>/i.test(task.description)`) and rendered formatted rich text via `dangerouslySetInnerHTML` with scoped typography styling (`text-[11px]`, lists, emphasis, headings, and paragraphs) matching TaskItem, with whitespace-preserving plain-text fallback.

### F-04 [P2] fixed - Stored WYSIWYG HTML is injected into the DOM without sanitization

**File:** components/tasks/TaskItem.tsx:273, components/notes/StandaloneNoteView.tsx:346
**Found:** 2026-09-30 by /audit (scope: full; lens: security)
**Why it matters:** Note bodies and task descriptions are rendered with `dangerouslySetInnerHTML` and nothing validates or sanitizes the stored HTML (lib/validation.ts checks only length; lib/backup.ts checks only field shapes). The editor is self-XSS-safe, but the backup restore path is a real trust boundary: any `.json` backup file can be imported (merge or replace), and its `description`/`body` strings are then executed as HTML in the page origin, so a backup shared by someone else can inject script via event-handler attributes (e.g. an `onerror` handler) on any load. Vercel headers include no CSP to mitigate this. Single-user product, so severity stays P2, but the import feature makes the boundary reachable.
**Suggested fix:** Sanitize once on save (restore/import and the editor save path) to a whitelist matching the tags the editor actually produces (p, h1-h3, blockquote, ul, ol, li, b/strong, i/em, u, s, span/font with style color) and drop event-handler attributes and script/style/iframe/link tags. A tiny inline sanitizer avoids adding a dependency; a CSP header in vercel.json is a cheap second layer.
**Resolution:** Fixed in fix/sanitize-stored-wysiwyg-html. Added `sanitizeHtml` in `lib/html.ts` with tag/attribute whitelisting and recursive script/iframe/style/event-handler stripping; sanitized descriptions and bodies on input and patch in `lib/validation.ts`, and on database restore in `lib/backup.ts`; added CSP security header in `vercel.json`; verified via 193 passing tests in unit test suite.

### F-05 [P3] fixed - Drag reorder with an active filter silently reshuffles hidden tasks

**File:** components/tasks/TasksScreen.tsx:238-248
**Found:** 2026-09-30 by /audit (scope: full; lens: quality)
**Why it matters:** When a search or filter is active, `handleDrop` builds `combined = reorderedVisible + remainingTasks` and persists `order` indices for every task, so all filtered-out (hidden) tasks are moved to the end of the manual ordering. After clearing the filter, the user's curated order of those hidden tasks has been silently rearranged. No data is lost, but the persisted order no longer reflects what the user arranged.
**Suggested fix:** When filters are active, either disable dragging, or persist only relative order among visible tasks and keep hidden tasks' positions (interleave using their previous order values).
**Resolution:** Fixed in fix/preserve-hidden-task-order. Added `interleaveReorderedTasks` helper in `lib/tasks.ts` to preserve hidden task slot positions while applying the new visible task sequence, updated `TasksScreen.tsx`'s `handleDrop` to use `interleaveReorderedTasks(tasks, reorderedVisible)`, and verified with 5 unit tests in `lib/tasks.test.ts` plus full regression suite passing (198 tests).

### F-06 [P3] open - Export failure shows no user feedback

**File:** components/backup/BackupModal.tsx:84
**Found:** 2026-09-30 by /audit (scope: full; lens: quality)
**Why it matters:** `handleExport`'s catch writes to `validationError`, but that state is only rendered inside the Restore tab panel. If `exportDatabaseBackup` or `triggerDownload` fails while the Export tab is open, the spinner stops and the UI silently returns to idle with no error message.
**Suggested fix:** Add an `exportError` state rendered in the Export panel (or surface a shared error banner), and stop writing export failures into the restore-only validation state.
