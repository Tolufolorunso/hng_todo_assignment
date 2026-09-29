# Feature: Task list: create, view, and complete

**From build-plan:** feature 2
**Build attempt:** 1
**Status:** verified
**Branch:** feature/task-list-create-view-and-complete

## Goal

Ship the first user-visible slice of the app: a Tasks screen that loads tasks from
IndexedDB, adds a task by title, and toggles a task complete. This is the first
point where the data layer built in Feature 1 becomes something a person can
actually use, and it establishes the client-boundary and state-handling patterns
the remaining UI features will follow.

## In scope

- Replace the `create-next-app` scaffold at `app/page.tsx` with the Tasks screen.
- A client screen component that loads tasks on mount and handles loading, empty,
  populated, and error states.
- Add a task by title through a form, with validation feedback.
- Toggle a task complete or incomplete.
- Completed styling and the empty state.

## Out of scope

- Editing a task's title or description, and deleting tasks. Feature 3 owns these.
- The `description` field in the UI. The form adds by title only; `description`
  stays `""`. Feature 3 adds editing.
- `dueDate` and `priority` controls and overdue styling (Feature 5).
- Search, filter, and sort, including any "hide completed" toggle (Feature 6).
- Notes (Feature 4), PWA/offline work (Feature 7), deployment and branding
  (Feature 8).
- Changing `app/layout.tsx` metadata or the product name. The tab title stays
  `Create Next App` for now; naming is still an open question in the plan and
  branding belongs to Feature 8.
- Any new runtime or dev dependency. This feature uses React, Tailwind, and the
  existing Feature 1 data layer only.
- Any schema change. The Feature 1 stores and contracts are used as-is.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present
  one feature-level review packet with the full diff and each step's evidence.
- `workflow.checkpointCommits` is `disabled`, so no checkpoint commits are offered.
- A read-only walkthrough of the finished code is available after the packet.
- `/complete` creates the single feature commit.

## Build steps

- [x] 1. **Tasks screen shell and read path.** Replace the `app/page.tsx` scaffold
  with a server component that renders a new client component,
  `components/tasks/TasksScreen.tsx`. The screen loads tasks with `listTasks()` in
  a `useEffect`, and renders a heading, a loading state, an empty state
  ("No tasks yet"), and a plain list of task titles.
  **Done when:** `npm run build` passes and `npm run test` still reports 38
  passing tests; on the dev server, `/` renders the heading then the empty state
  with no server-render or hydration error in the console.
- [x] 2. **Add a task by title.** Add `components/tasks/TaskForm.tsx`: a labeled
  title input and a submit button. On submit it trims and validates the title
  (reusing `validateTaskInput`), calls `createTask`, then reloads the list. An
  empty or whitespace-only title shows an inline error, is not submitted, and
  returns focus to the input; the submission is disabled while in flight.
  **Done when:** submitting a title adds it to the top of the list and it survives
  a page reload; submitting only spaces shows the inline error, creates nothing,
  and keeps focus in the input.
- [x] 3. **Toggle complete.** Add `components/tasks/TaskItem.tsx`: a row whose
  checkbox is associated with the task title (clicking the title also toggles),
  calling `updateTask(id, { completed })` then reloading the list. Completed tasks
  are visibly struck through; the state is not conveyed by color alone.
  **Done when:** checking a task strikes it through and it is still completed
  after a reload, unchecking reverts it, and a failed write shows the error state
  rather than a silent no-op.

## Files / areas

- `app/page.tsx` - replace scaffold; thin server component rendering the screen
- `components/tasks/TasksScreen.tsx` - new: client orchestrator (state, load, add, toggle)
- `components/tasks/TaskForm.tsx` - new: client add form with validation feedback
- `components/tasks/TaskItem.tsx` - new: presentational task row with toggle

`components/` does not exist yet and is created by this feature. `lib/`, `types/`,
and the test harness already exist from Feature 1 and are not modified except as
noted below.

## Data / contracts

No schema change. The Feature 1 stores, `Task` model, and repository functions are
used as they are.

**Repository calls used** (from `lib/tasks.ts`):
- `listTasks(): Promise<Task[]>` - returns newest first (`createdAt` descending,
  `id` ascending tie-break). The screen renders this order as-is; it does not
  re-sort.
- `createTask({ title }): Promise<Task>` - throws `TaskValidationError` on an
  invalid title.
- `updateTask(id, { completed }): Promise<Task>` - throws `TaskNotFoundError` for
  a missing id and `TaskValidationError` on invalid input.

**UI contracts recorded as decisions:**
- **Add takes a title only.** The form has one text field; `description` is left
  `""` and is not shown. Feature 3 adds it.
- **Completed tasks stay in the list**, shown struck through. Nothing is hidden
  yet; filtering is Feature 6.
- **After every successful mutation the list is reloaded** from the repository
  rather than patched optimistically. The repository stays the single source of
  truth for ordering and derived fields; no optimistic update layer is added.
- **Client-only boundary.** IndexedDB exists only in the browser. All data access
  happens inside event handlers and `useEffect`, never during the initial render,
  so server prerender does not touch `indexedDB`. `lib/db.ts` opens the database
  lazily, so importing the data layer from a client component is safe.
- **User text is rendered as text**, never as HTML. React escapes it by default;
  no `dangerouslySetInnerHTML`.

**Required states on the Tasks screen:**
- loading - initial load in progress
- empty - loaded, no tasks ("No tasks yet")
- populated - one or more task rows
- error - a load or mutation failed; show a message and keep the UI usable
- invalid input - inline, associated, and announced form error (add flow)

## Testing

- Command: `npm run test` (Vitest). The runner exists from Feature 1; this feature
  adds no new runner and no new dependency.
- This feature is UI wiring with no new pure logic, so per the Testing gate in
  `coding-standards.md` it adds no new unit tests and does not claim any. The
  existing 38 tests must stay green as a regression check.
- There is no `Browser tests` command, so browser/harness coverage is not claimed.
  Do not add a browser runner mid-feature.
- Evidence for this feature is: `npm run build` passing, `npm run test` green, and
  manual verification on the dev server following the done-when of each step.
  `/implement` does not start a dev server; the manual pass is run by the user or
  by `/check` when requested.
- Accessibility items to verify manually: the input has a label; the error is
  associated with the input (`aria-describedby` plus `aria-invalid`) and announced
  (`role="alert"` or a live region); focus returns to the input on an invalid
  submit; the checkbox has an accessible name derived from the task title, and
  clicking the title toggles it.

## Notes for the AI

- Server components by default: keep `app/page.tsx` a server component and isolate
  `"use client"` in `components/tasks/`.
- Reuse the Feature 1 data layer and validation helpers. Do not add a state
  manager, data-fetching library, or form library.
- Do not add edit, delete, description, due date, priority, filtering, notes, or
  branding. Those belong to later features.
- Use the existing Tailwind theme (`--background`, `--foreground`, `dark:`
  variant). No inline styles.
- The screen must survive a failed IndexedDB open: catch errors, show the error
  state, and never leave the UI stuck on loading.
- No em dashes in code, comments, or docs.

## Open questions

- The product name is still undecided, so the screen heading is the plain word
  "Tasks" and the browser tab title is left as the scaffold default. Both are
  cosmetic and are revisited in Feature 8 once the name is chosen.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8187,"specSha256":"7f2034b436b824964a2bf41b9b0e9c516baeade1e0c793019bb3cba1c24bb6d8","branch":"refs/heads/feature/task-list-create-view-and-complete","head":"cece5b8eca56d20be9588b23f5775c8ac6af927e","baseRef":"refs/heads/main","baseCommit":"cece5b8eca56d20be9588b23f5775c8ac6af927e","sourceTree":"d5b8c658537e0f596532761ff61744dcdc9a3eb4","absentOptional":[]} -->
