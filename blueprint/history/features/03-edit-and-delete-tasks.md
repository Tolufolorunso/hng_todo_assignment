# Feature: Edit and delete tasks

**From build-plan:** feature 3
**Build attempt:** 1
**Status:** verified
**Branch:** feature/edit-and-delete-tasks

## Goal

Complete the task lifecycle in the UI: a person can open an existing task, change
its title and description, save or cancel, and delete a task after confirming.
The Feature 1 repository already implements and tests `updateTask` and
`deleteTask`, so this feature is UI wiring plus the first port of the agreed
prototype theme into the real app. It establishes the inline edit and destructive
action patterns later screens reuse.

## Design reference

The look is locked in the prototype; this is the first UI feature after
prototyping, so the theme ports here.

- `prototypes/theme.css` - the durable token source (surfaces, text, accent,
  priority, states, fonts, radius, light and dark). Port it into `app/globals.css`.
- `prototypes/tasks.html` - the target Tasks row: rounded card, tokenized border,
  checkbox, muted secondary text, per-row edit and delete icon buttons.
- `prototypes/states.html` - the destructive and error styling (`--danger`,
  `--danger-soft`) and the label-plus-icon rule for anything destructive.

Full mockup fidelity is not in scope here. The sticky control bar, priority
badges, due-date chips, and the offline pill in the mockups belong to Features 5,
6, and 7.

## In scope

- Port the prototype theme tokens into `app/globals.css` and adopt them across the
  existing Tasks screen components.
- Show a task's description in its row when one is set.
- Edit a task's title and description inline in its row, with validation, Save,
  and Cancel.
- Delete a task from its row behind an inline confirmation step.
- Keep the existing screen states working: loading, empty, populated, mutation
  error, and the add flow's invalid-input state.

## Out of scope

- `priority`, `dueDate`, and overdue styling (Feature 5).
- Search, filter, sort, and any "hide completed" toggle (Feature 6).
- Notes and any Notes-screen styling (Feature 4).
- PWA, service worker, and the offline indicator (Feature 7).
- Product name, page metadata, and branding (Feature 8).
- Restyling beyond the Tasks screen. The Notes screen keeps its current styling
  until Feature 4.
- Adding a description field to the add form. Add stays title-only (Feature 2
  decision); description is set through edit.
- Any new runtime or dev dependency, and any schema change. The Feature 1 stores
  and repository contracts are used as they are.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present
  one feature-level review packet with the full diff and each step's evidence.
- `workflow.checkpointCommits` is `disabled`, so no checkpoint commits are offered.
- A read-only walkthrough of the finished code is available after the packet.
- `/complete` creates the single feature commit.

## Build steps

- [x] 1. **Port the theme tokens.** Copy the token block from `prototypes/theme.css`
  into `app/globals.css`, keeping Tailwind v4 CSS-first config: expose the surfaces,
  text, accent, priority, state colors, font stacks, and radius through `@theme` so
  utilities like `bg-surface`, `text-muted`, and `text-accent` resolve, and keep the
  light default plus the `prefers-color-scheme: dark` override. Preserve the
  existing `--background` and `--foreground` so nothing breaks before components are
  migrated. Change no component in this step.
  **Done when:** `npm run build` passes and `npm run test` still reports 38 passing
  tests; on the dev server the Tasks screen looks unchanged (no component consumes
  the new tokens yet) and the tokens are visible on `:root` in DevTools.

- [x] 2. **Put the Tasks screen on the tokens.** Restyle the three existing
  components to use the ported tokens instead of hardcoded `zinc`/`indigo` values:
  `TasksScreen` (heading, page spacing, error text), `TaskForm` (labeled input,
  accent submit button, focus ring, inline error), and `TaskItem` (rounded card row,
  tokenized border, checkbox, completed strike-through with muted text). This is a
  visual change only; the add and toggle behavior is unchanged.
  **Done when:** `npm run build` and `npm run test` pass; in the browser the Tasks
  screen matches the row and form treatment in `prototypes/tasks.html` (minus the
  out-of-scope chrome), adding a task still works, toggling a task still strikes it
  through and survives a reload, and both light and dark mode look correct.

- [x] 3. **Edit a task's title and description.** Add
  `components/tasks/TaskEditForm.tsx`: a labeled title input and a labeled
  description textarea prefilled from the task, with Save and Cancel. On Save,
  validate with the existing `validateTaskInput` (`title` required and 200 max,
  description 2000 max). If invalid, show an associated, announced inline error,
  keep the row in edit mode, and focus the offending field. If valid, call a new
  `handleUpdate(task, { title, description })` in `TasksScreen` that calls
  `updateTask`, reloads the list, and reports errors like the existing toggle path.
  `TaskItem` gains an Edit control that opens the form in place and a view-mode
  description line that renders `task.description` only when it is non-empty.
  **Done when:** clicking Edit expands the row with title and description
  prefilled; clearing the title and saving shows a validation error and saves
  nothing; a valid save updates the row in place, shows the description under the
  title, and both survive a page reload; Cancel restores the original values; focus
  moves to the title field when the form opens.

- [x] 4. **Delete a task with confirmation.** Add a Delete control to `TaskItem`.
  Clicking it replaces the row's actions with a destructive confirmation step
  ("Delete this task?" plus Delete and Cancel), using the tokenized danger styling.
  Delete calls a new `handleDelete(task)` in `TasksScreen` that calls `deleteTask`,
  reloads the list, and reports errors like the other mutations. Cancel restores the
  row untouched.
  **Done when:** clicking Delete shows the confirmation step and does not remove the
  task; Cancel leaves the task intact; confirming removes it from the list and it
  stays gone after a reload; a failed delete shows the mutation error and leaves the
  row in place.

## Files / areas

- `app/globals.css` - port the prototype token block into the existing `@theme`
- `components/tasks/TaskEditForm.tsx` - new: inline edit form for title and description
- `components/tasks/TaskItem.tsx` - add description line, edit mode, and delete confirm
- `components/tasks/TasksScreen.tsx` - add `handleUpdate` and `handleDelete`
- `components/tasks/TaskForm.tsx` - token restyle only, no behavior change

`lib/`, `types/`, and the test harness already exist and are not modified. No new
route is added; the Tasks screen stays at `/`.

## Data / contracts

No schema change. The Feature 1 stores, `Task` model, and repository functions are
used as they are. `Task` already has `description: string` (default `""`).

**Repository calls used** (from `lib/tasks.ts`):
- `listTasks(): Promise<Task[]>` - unchanged; the screen renders its order as-is.
- `updateTask(id, { title, description }): Promise<Task>` - already implemented and
  tested. Throws `TaskNotFoundError` for a missing id and `TaskValidationError` on
  invalid input. Bumps `updatedAt`; leaves `completedAt` untouched.
- `deleteTask(id): Promise<void>` - already implemented and tested, and idempotent
  for a missing id.

**Validation used** (from `lib/validation.ts`): `validateTaskInput({ title,
description })` for the edit form, and the `TITLE_MAX_LENGTH` /
`DESCRIPTION_MAX_LENGTH` constants for the input `maxLength`. No new validation logic.

**UI contracts recorded as decisions:**
- **Edit is inline in the row.** Edit expands the existing row into a form with
  title and description fields, Save and Cancel. No modal, no separate route, no
  edit page.
- **Delete confirms inline, not with `window.confirm`.** Deleting is permanent
  (there is no server backup), so it takes two deliberate clicks, but the
  confirmation is a styled step inside the row so it stays keyboard and
  screen-reader friendly and matches the agreed look. This is the one user-visible
  choice in the spec; see the review note.
- **Description is shown only when non-empty**, as a muted second line under the
  title. Empty descriptions add no line.
- **The repository stays the single source of truth.** After a successful update or
  delete the list is reloaded from the repository rather than patched in place,
  matching the Feature 2 toggle path. No optimistic update layer is added.
- **Mutations are serialized the same way as toggle.** The existing `pendingId`
  disables row controls while a write is in flight; update and delete reuse it.
- **User text is rendered as text**, never as HTML. React escapes it by default; no
  `dangerouslySetInnerHTML`.
- **One local UI state per row.** `TaskItem` owns its own ephemeral `view` / `edit`
  / `confirmDelete` state and edit field values; persistence is delegated to
  `TasksScreen` callbacks.

**Required states on the Tasks screen** (all preserved or added by this feature):
- loading - initial load in progress
- empty - loaded, no tasks
- populated - one or more task rows, with or without a description
- edit - a row open in edit mode, with valid or invalid fields
- delete confirmation - a row awaiting a confirm or cancel
- error - a load or any mutation failed; show a message and keep the UI usable
- invalid input - inline, associated, and announced error in the add and edit forms

## Testing

- Command: `npm run test` (Vitest). The runner exists from Feature 1; this feature
  adds no runner and no dependency.
- The `updateTask` and `deleteTask` repository paths the plan calls out are already
  covered by `lib/tasks.test.ts` (Feature 1). This feature adds no new pure logic
  (it wires existing validated functions to UI and holds only ephemeral view state),
  so per the Testing gate in `coding-standards.md` it adds no new unit tests and
  does not claim any. The existing 38 tests must stay green as a regression check.
- This is UI wiring, so evidence is `npm run build` passing, `npm run test` green,
  and manual browser verification of each step's done-when. There is no `Browser
  tests` command, so browser/harness coverage is not claimed and no runner is added.
- Accessibility to verify manually: the Edit, Delete, Save, Cancel, and confirm
  controls have accessible names that include the task title; edit inputs are
  labeled; the validation error is associated (`aria-describedby` plus
  `aria-invalid`) and announced (`role="alert"`); focus moves into the title field
  when edit opens and returns sensibly on Cancel; destructive intent is carried by
  a word or icon and not by color alone; controls are keyboard operable and show a
  visible focus ring.

## Notes for the AI

- Server components by default. Keep `app/page.tsx` a server component; all new
  interactivity stays inside `components/tasks/`.
- Reuse the Feature 1 data layer and the existing validation helpers. Do not add a
  state manager, data-fetching library, or form library.
- Do not add priority, due date, overdue, search, filter, sort, notes, offline, or
  branding. Those belong to later features.
- Style with Tailwind utilities backed by the ported tokens. No inline styles. Use
  the `dark:` variant through the token switch rather than fixed colors.
- The screen must survive a failed IndexedDB open or write: catch errors, show the
  error state, and never leave the UI stuck on loading or on a stuck row.
- No em dashes in code, comments, or docs.

## Open questions

- The product name is still undecided, so the heading stays the plain word "Tasks".
  Cosmetic, revisited in Feature 8.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11853,"specSha256":"bdd16a58e0fc1b17d38769086360146e07102038bb336777b8322a7e913d436c","branch":"refs/heads/feature/edit-and-delete-tasks","head":"d4dced212b7cb9d50a59de0f77170fcbf5d70541","baseRef":"refs/heads/main","baseCommit":"d4dced212b7cb9d50a59de0f77170fcbf5d70541","sourceTree":"3b35a6bd74f07144b6588db894fc69b9654b3cd7","absentOptional":[]} -->
