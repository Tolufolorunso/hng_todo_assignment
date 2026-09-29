# Feature: Search, filter, and sort for tasks

**From build-plan:** feature 6
**Build attempt:** 1
**Status:** verified
**Branch:** feature/search-filter-and-sort-for-tasks

## Goal

Make a long task list manageable: a sticky control bar with text search, a status
filter (all / active / completed), and sorting by due date, priority, or creation
date. The view logic is pure, testable functions; the screen composes them over
the in-memory list. Filtered and sorted views stay derived, never stored.

## Design reference

The theme is already locked and ported: tokens live in `app/globals.css`
(`@theme inline`, light plus `prefers-color-scheme` dark), and the consumed
`prototypes/` folder is gone. This feature reuses the token vocabulary already
established on the Tasks and Notes screens: `bg-surface-muted` segments,
`border-border`, `focus-visible` behavior, and `text-faint` placeholders. No new
visual language; the control bar is the bar the earlier prototype sketched.

## In scope

- A prerequisite fix so the declared test command is reliable in this checkout.
- Pure view functions: `searchTasks`, `filterTasksByStatus`, `sortTasks`, plus the
  `TaskStatusFilter` and `TaskSortKey` types.
- Unit tests for those functions.
- A sticky control bar on the Tasks screen with a text search input, an
  all / active / completed status filter, and a sort select.
- A no-results state when the current search and filter match nothing, with a
  clear action.

## Out of scope

- Changing the stored Task shape or the database. This feature adds no schema
  change; filtering and sorting are pure in-memory functions over `listTasks()`.
- The empty F-01 `completed` index finding. This feature deliberately filters in
  memory and does not query that index, so the finding neither blocks nor is
  resolved here (see Data / contracts).
- Persisting the search, filter, or sort choice across reloads. They reset when
  the screen loads.
- Multi-field search operators, fuzzy matching, saved views, or grouping.
- Notes. Note search already shipped in Feature 4.
- PWA and offline work (Feature 7) and branding (Feature 8).
- Any new runtime or dev dependency, and any new route.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present
  one feature-level review packet with the full diff and each step's evidence.
- `workflow.checkpointCommits` is `disabled`, so no checkpoint commits are offered.
- A read-only walkthrough of the finished code is available after the packet.
- `/complete` creates the single feature commit.

## Build steps

- [x] 1. **Make the declared test command reliable (prerequisite).** The declared
  `npm run test` currently fails with 2 failures that come only from the ignored
  Kilo Code worktree at `.kilo/worktrees/victorious-sherbet` (excluded via
  `.git/info/exclude`, detached at `d4dced2`), whose stale pre-feature test copies
  import current source through the `@` alias. Scope the Vitest config so the
  suite globs only the project: in `vitest.config.ts` add an `exclude` that keeps
  the Vitest defaults and adds `**/.kilo/**`. Do not delete the worktree and do
  not change any test.
  **Done when:** the declared `npm run test` passes as-is and reports only the
  project's own files and tests (no `.kilo` paths in the output), and
  `npm run build` passes.

- [x] 2. **Pure search, filter, and sort.** Add to `lib/tasks.ts`:
  `type TaskStatusFilter = "all" | "active" | "completed"`,
  `type TaskSortKey = "dueDate" | "priority" | "created"`, and the pure functions
  `searchTasks(tasks, query)`, `filterTasksByStatus(tasks, status)`, and
  `sortTasks(tasks, sort)`. `searchTasks` matches the query case-insensitively
  against title and description and returns the input unchanged for a blank query.
  `filterTasksByStatus` returns active (incomplete) or completed subsets, and the
  input for `"all"`. `sortTasks` returns a new array: `created` is newest first;
  `dueDate` is ascending with null dates last; `priority` is high, then medium,
  then low. Every sort breaks ties by `createdAt` descending, then `id` ascending,
  so the order is deterministic. Extend `lib/tasks.test.ts`.
  **Done when:** `npm run test` passes including new cases (search matches title
  and description case-insensitively, trims the query, returns the input for a
  blank query, and returns an empty array when nothing matches; status filter
  returns the right subset for each of the three values; each sort key orders
  correctly, null due dates sort last, and equal keys fall back to the documented
  tie-break; sorting does not mutate the input array).

- [x] 3. **Sticky control bar and wiring.** Add
  `components/tasks/TaskControls.tsx`: a sticky bar with a labeled search input,
  a labeled all / active / completed status control (a segmented group with
  `aria-pressed`), and a labeled sort select. Give it `sticky top-14 z-10` so it
  parks under the shared header, using the ported tokens. In
  `components/tasks/TasksScreen.tsx` hold `query`, `status`, and `sort` in state
  (defaults: empty, `"all"`, `"created"`), compute
  `sortTasks(filterTasksByStatus(searchTasks(tasks, query), status), sort)`, and
  render that list. Show the bar only when there is at least one task. When there
  are tasks but the view is empty, show a no-results state naming the active
  query and a `Clear filters` button that resets all three controls. Keep the
  existing "No tasks yet" empty state for a truly empty list.
  **Done when:** `npm run build` and `npm run test` pass; in the browser the bar
  sticks under the header while scrolling; typing narrows the list live and
  filtering by Active or Completed hides the other group; changing the sort
  reorders the list; a query or filter with no matches shows the no-results state
  and clearing it restores the full list; the bar and its controls are keyboard
  operable with visible focus, and the controls are labeled.

## Files / areas

- `vitest.config.ts` - exclude the ignored Kilo worktree so the declared command
  is reliable
- `lib/tasks.ts` - the three pure view functions and their two types
- `lib/tasks.test.ts` - unit tests for the view functions
- `components/tasks/TaskControls.tsx` - new: the sticky control bar
- `components/tasks/TasksScreen.tsx` - control state, derived list, no-results

`components/tasks/TaskItem.tsx`, `TaskEditForm.tsx`, `TaskForm.tsx`, `lib/db.ts`,
and the Task model are not modified. No schema change, no new route.

## Data / contracts

No schema change. `listTasks()` still returns newest first; this feature re-sorts
the in-memory result and never writes.

**Pure functions added** (`lib/tasks.ts`):
- `searchTasks(tasks: Task[], query: string): Task[]` - case-insensitive
  substring over `title` and `description`; a blank or whitespace-only query
  returns the input array unchanged.
- `filterTasksByStatus(tasks: Task[], status: TaskStatusFilter): Task[]` - `all`
  returns the input, `active` keeps incomplete tasks, `completed` keeps completed
  ones.
- `sortTasks(tasks: Task[], sort: TaskSortKey): Task[]` - returns a new array.
  `created`: `createdAt` descending. `dueDate`: `dueDate` ascending with `null`
  last. `priority`: high, medium, low. All tie-break by `createdAt` descending
  then `id` ascending.

**Order of composition (recorded decision):** search, then status filter, then
sort. Search and filter are order-independent with each other; sort is applied
last so the visible order always reflects the chosen key.

**UI contracts recorded as decisions:**
- **Filtering is in-memory.** This feature does not use the `completed` index, so
  the open F-01 finding (that index is permanently empty because IndexedDB cannot
  key on a boolean) does not affect it. F-01 stays open for a separate fix; this
  feature neither reads nor removes that index.
- **Search covers title and description**, matching the note-search behavior from
  Feature 4.
- **Control state is per-session UI state.** The search, filter, and sort reset
  when the screen loads; nothing is persisted. Persisting a view is not in the
  plan.
- **Default sort is `created`** (newest first), which preserves the order the list
  showed before this feature.
- **The control bar is hidden when there are no tasks**, so a first-run empty list
  is not cluttered by filters that cannot match anything.
- **The repository stays the single source of truth.** The screen derives the
  visible list from the loaded tasks; no separate stateful copy is kept.
- **User text is rendered as text.** The active query shown in the no-results
  message is React-escaped, never HTML.

**Required states on the Tasks screen** (all preserved or added):
- loading and error - unchanged
- empty - no tasks at all ("No tasks yet"), bar hidden
- populated - the derived list
- filtered - a non-default search, status, or sort applied
- no results - tasks exist but the view is empty; names the query and offers clear
- invalid input and mutation errors - unchanged

## Testing

- Command: `npm run test` (Vitest). No runner is added. Step 1 makes this exact
  declared command pass again in this checkout.
- This feature adds pure logic, so it ships passing unit tests in the same diff:
  search, status filter, and all three sort keys including tie-breaks and
  no-mutation. The existing suite (4 files, 90 tests) must stay green.
- UI behavior rides on `npm run build` plus manual/browser verification of each
  step's done-when. There is no `Browser tests` command, so no browser runner is
  added and browser coverage is not claimed.
- Accessibility to verify manually: the search input and sort select are labeled;
  the status control is a group with `aria-pressed` state and an accessible name;
  the no-results message is announced as needed; controls are keyboard operable
  with a visible focus ring; the active state is not conveyed by color alone.

## Notes for the AI

- Keep the view logic pure and out of the component; the component only holds
  state and composes the functions.
- Do not add a schema change, a query library, a state manager, or a URL/query
  param. This is in-memory derivation over the already-loaded list.
- Do not touch Notes, the Task model, or the database beyond the Vitest config fix
  in step 1.
- Reuse the ported tokens; no inline styles.
- Use `@/*` imports, TypeScript strict, no `any`.
- The sort must be stable and deterministic; do not rely on `Array.prototype.sort`
  stability alone for correctness, use the documented tie-break.
- No em dashes in code, comments, or docs.

## Open questions

- **The test-command prerequisite is recorded as step 1** (the user left the
  remedy to my judgment; the chosen fix is the reversible, non-destructive one).
  If instead you want the Kilo worktree removed, say so and step 1 becomes a
  `git worktree remove` with no config change.
- Default sort `created`, title-plus-description search, and non-persisted filter
  state are all recorded decisions that are easy to revise.
- The product name is still undecided; the heading stays the plain word "Tasks".


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11090,"specSha256":"33d6e80786b5177bc59ae0577985a57c4c1a15bb287c274ab3d872b5e4fe07cb","branch":"refs/heads/feature/search-filter-and-sort-for-tasks","head":"01eb460cbe74edb3efff21ecd4ebb6b233898891","baseRef":"refs/heads/main","baseCommit":"01eb460cbe74edb3efff21ecd4ebb6b233898891","sourceTree":"b58204228b936d7fb0be0cd3738130b031de7faa","absentOptional":[]} -->
