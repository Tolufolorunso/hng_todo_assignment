# Feature: Due dates and priorities

**From build-plan:** feature 5
**Build attempt:** 1
**Status:** verified
**Branch:** feature/due-dates-and-priorities

## Goal

Give tasks a due date and a priority so the list can show what is urgent and what
is late. This extends the persisted Task model (schema version bump), adds
validation and controls to set both fields, and derives an overdue state that is
computed, never stored. It is the first feature to change the stored shape since
Feature 1, where the plan recorded that a field or index change is a schema
version bump, not an edit.

## Design reference

The look is already locked: tokens live in `app/globals.css` (`@theme inline`,
light plus `prefers-color-scheme` dark) and the `prototypes/` folder was consumed
and deleted at Feature 3. This feature uses the already-ported state tokens,
specifically `--prio-low`, `--prio-medium`, `--prio-high` with their background
variants, and `--danger` / `--danger-soft` for overdue. No new visual language.

## In scope

- Extend `Task` with `priority: TaskPriority` and `dueDate: string | null`
  (`TaskPriority` already exists in `types/task.ts` but is unused).
- Bump the IndexedDB schema to version 2 and add the `completed` and `dueDate`
  indexes the plans document, with an upgrade that backfills existing records.
- Extend task validation for `priority` and `dueDate`.
- Pure derived overdue logic plus date-only helpers, with unit tests.
- Priority and due date controls in the task edit form.
- Priority badge and due date chip on each task row, with overdue highlighting.

## Out of scope

- Task search, filter, and sort (Feature 6). This feature does not add a control
  bar; it only shows the two new fields per row.
- The add form. It stays title-only and the new fields default, matching the
  recorded Feature 2 and 3 decision that task detail is set through edit.
- Notes, which have no priority or due date.
- Reminders, notifications, recurrence, and natural-language date parsing, all
  explicit non-goals in the plan.
- PWA and offline work (Feature 7) and branding (Feature 8).
- Any new runtime or dev dependency.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present
  one feature-level review packet with the full diff and each step's evidence.
- `workflow.checkpointCommits` is `disabled`, so no checkpoint commits are offered.
- A read-only walkthrough of the finished code is available after the packet.
- `/complete` creates the single feature commit.

## Build steps

- [x] 1. **Model and validation.** Add `priority` and `dueDate` to the `Task`
  interface in `types/task.ts`. In `lib/validation.ts` extend `TaskInput`,
  `ValidTaskInput`, `TaskPatch`, and `ValidTaskPatch` with `priority?` and
  `dueDate?`, and teach `validateTaskInput` / `validateTaskPatch` to normalize
  them: `priority` must be one of `low`, `medium`, `high` (missing means
  `"medium"`); `dueDate` must be `null`, empty (clears to `null`), or a real
  `YYYY-MM-DD` date (reject `2026-13-40`, `2026-2-3`, and other non-date-only or
  impossible values). Also update the existing task fixtures in `lib/db.test.ts`
  and `lib/tasks.test.ts` to include the two new required fields, and add the new
  validation cases to `lib/validation.test.ts`.
  **Done when:** `npm run test` passes including new cases (missing priority
  defaults to medium; each valid priority accepted; an unknown priority rejected;
  empty or absent due date accepted as null; a valid date-only string accepted; a
  malformed or impossible date rejected) and `npm run build` passes.

- [x] 2. **Schema version 2 with backfill.** In `lib/db.ts` bump `DB_VERSION` to
  2 and, in the `upgrade` handler, create the `completed` and `dueDate` indexes on
  `tasks` when upgrading from a version that lacks them, and backfill every
  existing task so `priority` is `"medium"` and `dueDate` is `null` (per the
  default recorded in Data / contracts). Update `createTask` in `lib/tasks.ts` to
  write `priority` and `dueDate` (defaulting to `"medium"` and `null`). Add a
  test that opens a version 1 database, writes a task without the new fields,
  reopens at version 2, and confirms the record and both indexes are present.
  **Done when:** `npm run test` passes including the upgrade/backfill test (a
  pre-existing task reads back with `priority: "medium"` and `dueDate: null`, and
  both new indexes exist), and `npm run build` passes.

- [x] 3. **Derived overdue logic.** Add pure helpers to `lib/tasks.ts`:
  `todayIsoDate(now?: Date): string` returning `YYYY-MM-DD`, and
  `isOverdue(task: Task, todayIso: string): boolean` returning true only when the
  task is incomplete and its `dueDate` is a non-null date strictly before
  `todayIso` (a task due today is not overdue). Keep `todayIso` an explicit
  parameter so the logic is deterministic under test. Add cases to
  `lib/tasks.test.ts`.
  **Done when:** `npm run test` passes including cases for no due date, a past
  date, today (not overdue), a future date, and a completed task with a past date
  (not overdue), and `npm run build` passes.

- [x] 4. **Priority and due date on the row.** In `components/tasks/TaskItem.tsx`
  render a priority badge carrying both a dot and the word (Low, Medium, High)
  using the `prio` tokens, and a due date chip. An overdue task (via `isOverdue`)
  shows a danger chip with a warning icon and the word "Overdue" plus the date; a
  completed task shows no overdue state. Keep everything text or icon backed, not
  color only. `TaskItem` receives `todayIso` from `TasksScreen` so the whole list
  agrees on "today".
  **Done when:** `npm run build` passes; in the browser a task with a past due
  date shows the overdue chip, one due today and one with no due date do not, a
  completed overdue task does not, and each priority shows its labeled badge in
  both light and dark mode.

- [x] 5. **Edit the fields.** Add a labeled priority control (a `select` with
  Low, Medium, High) and a labeled due date control (`<input type="date">`) to
  `components/tasks/TaskEditForm.tsx`, prefilled from the task, with the due date
  clearable (an empty value saves `null`). Extend the form's save payload and the
  `onSave` contract through `TaskItem` to `TasksScreen.handleUpdate` so the patch
  includes `priority` and `dueDate` and reaches `updateTask`.
  **Done when:** `npm run build` and `npm run test` pass; in the browser, editing
  a task to High with a future due date shows both on the row after Save and
  survives a reload; clearing the due date removes the chip and saves `null`;
  Cancel discards changes; both controls are labeled, keyboard operable, and
  focus rings are visible.

## Files / areas

- `types/task.ts` - add `priority` and `dueDate` to `Task`
- `lib/validation.ts` - task `priority` and `dueDate` validation
- `lib/validation.test.ts` - new validation cases
- `lib/db.ts` - version 2, the two indexes, and the backfill upgrade
- `lib/tasks.ts` - write the new fields; add `todayIsoDate` and `isOverdue`
- `lib/tasks.test.ts` - existing fixtures updated; new repository and derived cases
- `lib/db.test.ts` - existing fixture updated; upgrade/backfill case
- `components/tasks/TaskItem.tsx` - priority badge and due date chip
- `components/tasks/TaskEditForm.tsx` - priority and due date controls
- `components/tasks/TasksScreen.tsx` - pass `todayIso`; extend the update patch

No new route and no new dependency. `components/tasks/TaskForm.tsx` is unchanged
(add stays title-only).

## Data / contracts

This is a schema version bump, a change Feature 1 flagged as migration, not an
edit.

**Task model additions** (`types/task.ts`):
- `priority: TaskPriority` where `TaskPriority` is `"low" | "medium" | "high"`
  (already declared, now used).
- `dueDate: string | null` - an ISO date-only string (`YYYY-MM-DD`) or `null`.

**IndexedDB version 2** (`lib/db.ts`): the `tasks` store gains a `completed`
index and a `dueDate` index, matching the documented contract "indexed on
`completed`, `dueDate`, and `updatedAt`". The upgrade backfills existing records
so they satisfy the non-null `priority` contract. Notes and their `updatedAt`
index are untouched.

**Defaults (recorded decisions, the user did not choose):**
- **New tasks default to `priority: "medium"`.** The plan lists only the three
  priorities with no default; medium is the neutral middle and keeps the field
  non-nullable as the model states.
- **`dueDate` defaults to `null`.** The model already declares it nullable, and
  most tasks have no date.
- **Existing v1 records are backfilled to the same defaults.** Without this they
  would violate the non-null priority contract.
- **Priority and due date are set through the edit form only.** The add form
  stays title-only, consistent with the recorded Feature 2 and 3 decision that
  task detail is set through edit (description works this way today). This is the
  smallest change that satisfies "controls to set them"; if you want these on the
  add form too, say so and it becomes a small follow-up.

**Validation rules:**
- `priority` absent means `"medium"`; any present value must be one of the three
  literals; anything else is rejected with a message.
- `dueDate` absent or empty string clears to `null`; a present value must match
  `YYYY-MM-DD` and be a real calendar date; otherwise rejected.
- User text (title, description) is still rendered as text, never HTML.

**Derived, never stored:**
- `isOverdue(task, todayIso)` - incomplete and `dueDate` strictly before today.
  Date-only string comparison, so "today" is not overdue. `todayIso` is passed in
  as the test seam for the nondeterministic current date.

**Required states:**
- The row shows: no badge-worthy date (no chip), a due date chip, an overdue
  chip, each priority label, and the completed variant with no overdue styling.
- The edit form shows: valid saved values, an invalid priority or date rejected
  inline with an associated, announced error and focus on the offending control.

## Testing

- Command: `npm run test` (Vitest). No runner is added.
- This feature adds logic, so it ships passing tests in the same diff: validation
  cases, the schema upgrade and backfill, and the derived overdue logic. The
  existing suite (70 tests across 4 files) must stay green; the task fixtures gain
  the two new fields.
- This is the first feature that changes the persisted shape, so the upgrade path
  is covered directly rather than assumed.
- UI behavior rides on `npm run build` plus manual/browser verification of each
  step's done-when. There is no `Browser tests` command, so no browser runner is
  added and browser coverage is not claimed.
- Accessibility to verify manually: the priority and due date controls are
  labeled; errors are associated and announced; the badge and chip carry text or
  an icon, not color alone; controls are keyboard operable with a visible focus
  ring.

## Notes for the AI

- Keep the schema change contained to `lib/db.ts`. One version bump with one
  upgrade path; do not create a migration framework.
- Do not add search, filter, or sort (Feature 6). The control bar is that
  feature's job; this one only sets and shows the two fields.
- Reuse the ported `prio` and `danger` tokens. No inline styles.
- Use `@/*` imports, TypeScript strict, no `any`.
- The row must not break for a legacy record with a missing field; the backfill
  handles stored data, and the pure helpers treat `null` as no due date.
- No em dashes in code, comments, or docs.

## Open questions

- Two decisions were taken without your input and are recorded above: the medium
  default and edit-only controls. Both are easily revised.
- The product name is still undecided; the heading stays the plain word "Tasks"
  (Feature 8).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11786,"specSha256":"e59fbe6262fc4b84a9636ea5246c9b3fb6ab74ed8968fbba6e35850dc6ee8ab5","branch":"refs/heads/feature/due-dates-and-priorities","head":"9f8ccace11bbea249b32c93c5e435137e56430db","baseRef":"refs/heads/main","baseCommit":"02cac2c875797f698c8e7992caae470dbe4e27e5","sourceTree":"72ba5a0dd370fa8f4bb9954a6f5a8d3ac666c9cc","absentOptional":[]} -->


## Independent review

**Status:** passed
**Target commit:** 9f8ccace11bbea249b32c93c5e435137e56430db
**Base commit:** 02cac2c875797f698c8e7992caae470dbe4e27e5
**Base ref:** refs/heads/main
**Spec hash:** e59fbe6262fc4b84a9636ea5246c9b3fb6ab74ed8968fbba6e35850dc6ee8ab5
**Spec snapshot:** blueprint/.state/review-specs/9f8ccace11bbea249b32c93c5e435137e56430db-e59fbe6262fc4b84a9636ea5246c9b3fb6ab74ed8968fbba6e35850dc6ee8ab5.md
**Prepared by:** codex
**Builder model:** 1169d9fa-4d84-4e9f-8b70-c091db26fe59/deepseek-v4-flash
**Requested reviewer:** codex
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-09-29T06:12:00Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** 1169d9fa-4d84-4e9f-8b70-c091db26fe59/deepseek-v4-flash
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-09-29T05:15:09Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run build`: pass
- `npm run test`: fail (the declared command globs the ignored stray worktree `.kilo/worktrees/victorious-sherbet`, whose stale pre-feature test copies fail against current source; the failures are environmental, not from this delta)
- `npx vitest run --exclude '**/node_modules/**' --exclude '**/.next/**' --exclude '**/.kilo/**'`: pass (4 files, 90 tests)
- `npx tsc --noEmit`: pass
- `npm run lint`: pass

## Evidence

- Freshness confirmed: `HEAD` equals target `9f8ccace…`, `merge-base(refs/heads/main, target)` equals base `02cac2c…`, `refs/heads/main` resolves to the base commit, `git status --porcelain` is clean, and current-feature plus the snapshot both hash to `e59fbe62…`.
- Snapshot inputs valid: path chain under `blueprint/.state/review-specs/` is ordinary files/dirs (no symlinks), the snapshot and `blueprint/context/current-feature.md` are both ignored (`.gitignore:46` `blueprint/`), untracked, absent from the index, and absent from the target tree.
- Complete delta reviewed (10 files, +499/-25): `types/task.ts`, `lib/validation.ts`, `lib/db.ts`, `lib/tasks.ts`, `components/tasks/TaskItem.tsx`, `components/tasks/TaskEditForm.tsx`, `components/tasks/TasksScreen.tsx`, `lib/validation.test.ts`, `lib/db.test.ts`, `lib/tasks.test.ts`.
- Upgrade path exercised by a real test: `lib/db.test.ts:92` opens an IndexedDB v1 database, writes a task without the new fields, reopens at v2, and asserts `priority: "medium"`, `dueDate: null`, and both new indexes.
- Validation covers default/case rules: missing priority defaults to medium, each literal accepted, unknown rejected, empty/absent due date clears to null, valid date-only accepted, and `2026-2-3`, `2026-13-01`, `2026-02-30`, `nope`, `2026/02/03` rejected (`lib/validation.test.ts`).
- Derived logic is deterministic and correct: `isOverdue` returns false for null due date, false for today and future, false when completed, true only for a past date (`lib/tasks.test.ts:207`); `todayIsoDate` zero-pads (`lib/tasks.test.ts:200`).
- UI bindings match the spec: priority badge carries dot plus label, due chip renders only when `dueDate !== null`, overdue chip carries a warning icon plus "Overdue, {date}", completed tasks show no overdue styling (`components/tasks/TaskItem.tsx:144`); edit form has labeled `select` plus `<input type="date">`, associated `role="alert"` error, `aria-invalid`/`aria-describedby`, and focus on the offending control (`components/tasks/TaskEditForm.tsx`).
- Design tokens exist for both light and dark themes: `--prio-low/medium/high` with `-bg` variants plus `--danger`/`--danger-soft` are defined and mapped via `@theme inline` (`app/globals.css:31`, `:64`, `:94`).
- Standards checked: `@/*` imports used, no `any`, no inline styles, no `dangerouslySetInnerHTML`, no em dashes in changed files; server/client boundaries respected (`"use client"` only where interactivity is needed).
- Security and performance lens: all user text rendered as text; due date strictly validated; no new network, dependency, or unbounded work; `isOverdue` is O(1) per row and the list still uses one in-memory read/sort.

## Findings

- F-01 [P3] open - tasks `completed` boolean index is permanently empty (quality/design)
- F-02 [P3] open - edit-form focus targets coupled to validation message wording (tests/robustness)

## Remaining risk

- `npm run test` as declared fails in this checkout only because it globs the ignored `.kilo/worktrees` worktree (untracked, via `.git/info/exclude`, predating this delta) that holds stale pre-feature test copies; the project's own suite passes under the scoped run. Not repaired because it is config/tooling outside this delta and the review must not edit config.
- No browser or E2E runner exists, so row badges, overdue highlighting, dark mode, and edit-form focus/announcement behavior were not exercised in a real browser; UI evidence is build plus code inspection only, as the spec declares.
- `todayIso` is captured once per mount (`components/tasks/TasksScreen.tsx:22`); a tab left open across local midnight would show stale overdue state until reload.
- F-01 is a latent gap that will surface in build-plan Feature 6 (status filter) if that feature assumes the `completed` index is queryable.
