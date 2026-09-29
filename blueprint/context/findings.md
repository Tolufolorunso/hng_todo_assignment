# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P3] open - The tasks `completed` index can never contain a record

**File:** lib/db.ts:12, lib/db.ts:50
**Found:** 2026-09-29 by /audit independent (scope: current; lens: quality)
**Why it matters:** IndexedDB only indexes keys of type number, date, string, binary, or array; booleans are not valid keys. Because the store runs `createIndex("completed", "completed")` on a boolean field, the index exists but is permanently empty. Verified empirically: after writing one completed and one incomplete task, `index("completed").count()` returns 0 while `index("dueDate").count()` returns 1. The documented contract in `blueprint/context/project-overview.md` states the store is "Indexed on `completed`, `dueDate`, and `updatedAt`", and build-plan Feature 6 plans a status filter, so the index gives a false impression of queryability. The declared schema type `completed: number` (lib/db.ts:12) also misdescribes the stored boolean. No current code reads this index, so nothing is broken today.
**Suggested fix:** Either drop the `completed` index and filter in memory (`listTasks` already reads all tasks and sorts in memory), or, only if Feature 6 needs an indexed status query, keep an indexable derived field such as a numeric or string status. Removing the index loses only the literal plan contract "indexed on completed"; no current behavior depends on it.
**Resolution:**

### F-02 [P3] open - Edit-form focus targets are coupled to validation message wording

**File:** components/tasks/TaskEditForm.tsx:25
**Found:** 2026-09-29 by /audit independent (scope: current; lens: tests)
**Why it matters:** `focusFieldFor` chooses which control to focus by matching the leading words of the validator's human-readable error ("Description...", "Priority...", "Due date..."), falling back to Title otherwise. Any wording change in lib/validation.ts silently reroutes focus to Title, breaking the spec's "focus on the offending control" done-when, and there is no component test guarding that coupling.
**Suggested fix:** Return a stable field identifier or code from the validators, or map the attempted field directly in the submit handler, so focus behavior does not depend on message copy.
**Resolution:**
