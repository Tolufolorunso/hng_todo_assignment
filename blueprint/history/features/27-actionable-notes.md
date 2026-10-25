# Feature: Actionable notes

**From build-plan:** feature 27
**Build attempt:** 1
**Branch:** feature/actionable-notes
**Status:** verified

## Goal

Enable users to turn notes into action by creating tasks or follow-ups directly from selected note content, preserving immutable context snapshots and source note links, displaying live backlinks on notes, and ensuring tasks and follow-ups remain fully usable even when the source note is edited or deleted.

## In scope

- Data layer and schema upgrades:
  - Upgrade IndexedDB schema to version 7 in `lib/db.ts` with `sourceNoteId` indexes on `tasks` and `followups` object stores.
  - Add optional `sourceNoteId` (string or null) and `sourceExcerpt` (string or null, max 2000 chars) to `Task` in `types/task.ts`.
  - Update `lib/validation.ts` to validate `sourceNoteId` and `sourceExcerpt` in `TaskInput` and `TaskPatch`.
  - Update `lib/tasks.ts` to store and update `sourceNoteId` and `sourceExcerpt`.
  - Add `getNoteBacklinks(noteId: string)` helper in `lib/notes.ts` to retrieve all tasks and follow-ups referencing a note.
  - Update `lib/backup.ts` to export and restore `sourceNoteId` and `sourceExcerpt` on tasks and follow-ups.
- Action creation from note content:
  - Support creating a Task or FollowUp from note content in both `NoteEditor.tsx` (in `NotesScreen.tsx`) and `StandaloneNoteView.tsx`.
  - Text selection capture: allow selecting text in the note to launch action creation with prefilled title/commitment and context snapshot (`sourceExcerpt`).
  - Action creation modal (`components/notes/ActionCreationModal.tsx`):
    - Tab or toggle to select either "Create Task" or "Create Follow Up".
    - Prefilled excerpt snapshot and editable title/commitment.
    - Fields for priority, due date, category (for task) or due date, person name, preferred action (for follow-up).
- Note backlinks:
  - Display connected tasks and follow-ups in a `NoteBacklinks.tsx` component inside `NoteEditor.tsx` and `StandaloneNoteView.tsx`.
  - Show status (open vs completed), title, date, and priority/person badge.
  - Allow toggling task completion directly from the backlinks list.
  - Clear empty state when no actions are linked.
- Bidirectional source link and resilience:
  - In `TaskItem.tsx` and `TaskEditForm.tsx`: display source note badge with link to `/notes?id=<sourceNoteId>` and an expandable context snapshot snippet.
  - In `FollowUpCard.tsx` and `FollowUpModal.tsx`: display source note badge with link and context snapshot snippet.
  - Resilient handling when the source note is edited: task/follow-up retains its frozen creation-time `sourceExcerpt`.
  - Resilient handling when the source note is deleted: task/follow-up remains completely intact and functional; badge displays note unavailable / deleted, retaining the context snapshot.
- Testing:
  - Comprehensive unit tests in `lib/tasks.test.ts`, `lib/notes.test.ts`, `lib/validation.test.ts`, `lib/db.test.ts`, and `lib/backup.test.ts`.
  - Regression suite passing: `npm run test`, `npm run lint`, `npm run build`.

## Out of scope

- Automatic bi-directional synchronization that rewrites note content when tasks are edited or completed.
- External markdown sync or third-party note integrations (e.g. Obsidian or Notion).
- Cloud synchronization of note backlinks (scheduled for Milestone J / Feature 32).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Schema, models, validation, and backlinks data layer.
  - Add `sourceNoteId` and `sourceExcerpt` to `Task` in `types/task.ts`.
  - Validate `sourceNoteId` and `sourceExcerpt` in `lib/validation.ts`.
  - Update `lib/tasks.ts` to persist `sourceNoteId` and `sourceExcerpt`.
  - Upgrade IndexedDB schema to version 7 in `lib/db.ts` with `sourceNoteId` index on `tasks` and `followups`.
  - Add `getNoteBacklinks` in `lib/notes.ts`.
  - Update `lib/backup.ts` to preserve and validate `sourceNoteId` and `sourceExcerpt`.
  - Done when: unit tests in `lib/tasks.test.ts`, `lib/notes.test.ts`, `lib/validation.test.ts`, `lib/db.test.ts`, and `lib/backup.test.ts` pass via `npm run test`.

- [x] 2. Action creation modal and note text selection triggers.
  - Create `components/notes/ActionCreationModal.tsx` for creating a Task or FollowUp with prefilled context snapshot from selected note content.
  - Add action creation launcher to `NoteEditor.tsx` and `StandaloneNoteView.tsx` supporting text selection and whole-note actions.
  - Done when: selecting text or clicking create action opens the modal, creates the task or follow-up with `sourceNoteId` and `sourceExcerpt`, and persists to IndexedDB.

- [x] 3. Note backlinks display on editor and standalone view.
  - Build `components/notes/NoteBacklinks.tsx` displaying all linked tasks and follow-ups for a note.
  - Support inline completion toggle for linked tasks.
  - Embed backlinks in `NoteEditor.tsx` and `StandaloneNoteView.tsx`.
  - Done when: created tasks and follow-ups appear in the backlinks list immediately, can be checked off, and show clean empty states when none exist.

- [x] 4. Source note badges on tasks/follow-ups and deleted-note resilience.
  - Update `TaskItem.tsx` and `TaskEditForm.tsx` to show the source note badge with link and snapshot excerpt.
  - Update `FollowUpCard.tsx` and `FollowUpModal.tsx` to display the source note badge and snapshot excerpt.
  - Verify graceful fallback when a linked note is modified or deleted: task and follow-up remain fully editable and functional with excerpt intact.
  - Done when: `npm run test`, `npm run lint`, and `npm run build` pass with zero errors.

## Files / areas

- `types/task.ts`: add `sourceNoteId` and `sourceExcerpt` fields.
- `lib/validation.ts`: add `sourceNoteId` and `sourceExcerpt` validation rules.
- `lib/db.ts`: upgrade `DB_VERSION` to 7 and add indexes for `sourceNoteId`.
- `lib/tasks.ts`: support `sourceNoteId` and `sourceExcerpt` in `createTask` and `updateTask`.
- `lib/notes.ts`: add `getNoteBacklinks`.
- `lib/backup.ts`: export and restore `sourceNoteId` and `sourceExcerpt`.
- `components/notes/ActionCreationModal.tsx`: modal to turn note selection into Task or FollowUp.
- `components/notes/NoteBacklinks.tsx`: list linked tasks and follow-ups on notes.
- `components/notes/NoteEditor.tsx`: selection handler and backlinks section.
- `components/notes/StandaloneNoteView.tsx`: selection handler and backlinks section.
- `components/tasks/TaskItem.tsx`: display source note badge and excerpt.
- `components/tasks/TaskEditForm.tsx`: display source note context.
- `components/followups/FollowUpCard.tsx`: display source note badge and excerpt.
- `components/followups/FollowUpModal.tsx`: display source note context.

## Data / contracts

- `Task`:
  - `sourceNoteId`: string | null (ID of the note from which the task was created, or null).
  - `sourceExcerpt`: string | null (immutable text excerpt from the note at creation time, up to 2000 chars).
- `FollowUp`:
  - `sourceNoteId`: string | null.
  - `sourceExcerpt`: string | null.
- `NoteBacklinks`:
  - `{ tasks: Task[]; followups: FollowUp[] }`.

## Testing

- Unit tests in `lib/notes.test.ts` for `getNoteBacklinks` with active tasks, completed tasks, follow-ups, and empty results.
- Unit tests in `lib/validation.test.ts` for `sourceNoteId` and `sourceExcerpt` on `TaskInput` and `TaskPatch`.
- Unit tests in `lib/tasks.test.ts` for task creation with source note metadata.
- Unit tests in `lib/backup.test.ts` for backup export and restore round-tripping `sourceNoteId` and `sourceExcerpt`.
- Full regression suite: `npm run test`, `npm run lint`, `npm run build`.

## Notes for the AI

- Writing style: zero em dashes (—), en dashes (–), or ellipsis characters.
- Strict resilience: when a note is deleted, never delete linked tasks or follow-ups; show graceful indication that source note was deleted.
- Snapshot immutability: the `sourceExcerpt` captures the text at creation time and is never altered when the original note is subsequently edited.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8219,"specSha256":"ac9128b58274db831e914e1a92bca421b92e7151424a6d834e7d2d089b4d1c1b","branch":"refs/heads/feature/actionable-notes","head":"5b7c9b7a70f9913655e81f775d5dba22339e14c9","baseRef":"refs/heads/main","baseCommit":"5b7c9b7a70f9913655e81f775d5dba22339e14c9","sourceTree":"6ea13f248b7b6c2e33f2f61448db210bfb48dfdc","absentOptional":[]} -->
