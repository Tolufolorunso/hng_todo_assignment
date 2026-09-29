# Feature: Notes

**From build-plan:** feature 4
**Build attempt:** 1
**Status:** verified
**Branch:** feature/notes

## Goal

Ship the standalone notes section: a two-pane workspace where a person lists,
creates, edits, searches, and deletes free-form notes (title plus body), all
stored in the existing `notes` IndexedDB store. Feature 1 created the `Note` type,
the `notes` object store, and its `updatedAt` index, but no notes repository,
validation, tests, or UI exist yet, so this feature builds all four.

## Design reference

The look is already locked and ported: the tokens from the prototype live in
`app/globals.css` (`@theme inline`, light plus `prefers-color-scheme` dark) and
were adopted by the Tasks screen in Feature 3. The `prototypes/` folder was
consumed and deleted at Feature 3's completion, so the tokens in `globals.css`
are now the single source of the theme. This screen reuses those tokens and the
row and control treatments already established, no new visual language.

## In scope

- Note validation in `lib/validation.ts`: required title, optional body, length
  bounds, trimming.
- A notes repository in `lib/notes.ts`: create, read, list, update, delete, plus a
  pure case-insensitive search over title and body.
- Unit tests for the validation and repository logic in the same reviewable diff.
- A `/notes` route and a two-pane notes screen: searchable list plus an editor.
- Create a note, edit a note, and delete a note with confirmation.
- Loading, empty, no-results, draft, invalid-input, and error states.
- A small shared header with Tasks and Notes links, added to both screens.

## Out of scope

- `priority` and `dueDate` on notes. Notes are standalone with title and body only.
- The Tasks search, filter, and sort control bar (Feature 6). Tasks search is not
  part of this feature; only notes search is, because the plan puts note search in
  this item.
- Any change to the task model, task screen behavior, or the notes schema. The
  Feature 1 `notes` store and index are used as they are.
- PWA, service worker, and offline indicator (Feature 7).
- Product name, page metadata, and branding beyond the small nav links
  (Feature 8).
- Any new runtime or dev dependency, any state manager, and any form or
  data-fetching library.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present
  one feature-level review packet with the full diff and each step's evidence.
- `workflow.checkpointCommits` is `disabled`, so no checkpoint commits are offered.
- A read-only walkthrough of the finished code is available after the packet.
- `/complete` creates the single feature commit.

## Build steps

- [x] 1. **Note validation.** Extend `lib/validation.ts` with
  `NOTE_TITLE_MAX_LENGTH = 200`, `NOTE_BODY_MAX_LENGTH = 10000`, `NoteInput`,
  `ValidNoteInput`, `NotePatch`, `ValidNotePatch`, and `validateNoteInput` /
  `validateNotePatch`, mirroring the existing task validators (trim first, title
  required and bounded, body optional and bounded, defaults to `""`). Extend
  `lib/validation.test.ts` with the note cases.
  **Done when:** `npm run test` passes including new cases (empty and
  whitespace-only title rejected; title and body trimmed; title over 200 rejected;
  body over 10000 rejected; missing body accepted as `""`; a valid input
  accepted) and `npm run build` passes.

- [x] 2. **Notes data layer.** Add `lib/notes.ts` with `NoteValidationError` and
  `NoteNotFoundError` (mirroring `lib/tasks.ts`) and `createNote`, `getNote`,
  `listNotes`, `updateNote`, `deleteNote`. `createNote` validates, assigns a
  `crypto.randomUUID()` id and ISO timestamps, and defaults `body` to `""`.
  `listNotes` returns newest first by `updatedAt` descending with an `id`
  ascending tie-break. `updateNote` validates the patch, throws
  `NoteNotFoundError` for a missing id, and bumps `updatedAt`. `deleteNote` is
  idempotent. Also export a pure `filterNotes(notes, query)` that returns notes
  whose title or body contains the query, case-insensitively, and returns the
  input unchanged for a blank query. Add `lib/notes.test.ts`.
  **Done when:** `npm run test` passes including new repository tests (create
  assigns id, empty body, and matching timestamps; trims; `getNote` undefined for
  a missing id; `listNotes` orders by `updatedAt` descending with an id
  tie-break; `updateNote` changes fields and advances `updatedAt`; invalid patch
  rejected without writing; `NoteNotFoundError` for a missing id; `deleteNote`
  removes and is idempotent; `filterNotes` matches title and body
  case-insensitively, ignores surrounding whitespace, and returns all notes for a
  blank query) and `npm run build` passes.

- [x] 3. **Notes route, list, and create.** Add `app/notes/page.tsx` (server
  component) rendering a new client `components/notes/NotesScreen.tsx`. The screen
  loads notes with `listNotes()` in a `useEffect` and renders a two-pane layout:
  a list pane (search input, `New note` button, the notes sorted as returned, and
  loading, empty, and error states) and an editor pane
  (`components/notes/NoteEditor.tsx`) with a labeled title input and labeled body
  textarea. `New note` clears the editor to a blank draft. Save validates with
  `validateNoteInput`; an invalid title shows an associated, announced inline
  error, keeps the draft, and focuses the title field; a valid draft calls
  `createNote`, reloads the list, and selects the new note.
  **Done when:** `/notes` renders; with no notes the list shows an empty state;
  clicking `New note` clears the editor; saving a blank title shows the inline
  error, creates nothing, and keeps focus; saving a valid note adds it to the
  list and it survives a page reload; a failed load shows the error state and
  never stays stuck on loading.

- [x] 4. **Edit a note and search notes.** Selecting a note in the list loads its
  title and body into the editor; Save calls `updateNote`, reloads the list, and
  keeps the note selected. A search input above the list filters it live through
  `filterNotes`; a query with no matches shows a no-results state with a clear
  action; clearing it restores the full list.
  **Done when:** clicking a note loads its content and Save updates it, and the
  change survives a reload; typing in search narrows the list to matching titles
  and bodies as you type; a non-matching query shows no-results and clearing it
  restores the list; unsaved edits to the current note are discarded when another
  note is selected (recorded behavior, see Data / contracts).

- [x] 5. **Delete a note and shared navigation.** Add a Delete control to the
  editor that opens an inline confirmation step ("Delete this note?" plus Delete
  and Cancel) using the danger tokens, matching the Feature 3 delete pattern.
  Delete calls `deleteNote`, reloads the list, and clears the editor; Cancel
  leaves the note untouched. Add `components/app/AppHeader.tsx` (server component)
  with a brand mark and Tasks and Notes links, taking an `active` prop, and render
  it in `app/page.tsx` and `app/notes/page.tsx`.
  **Done when:** Delete shows the confirmation and removes nothing until
  confirmed; Cancel keeps the note; confirming removes it, clears the editor, and
  it stays gone after a reload; both `/` and `/notes` show the header with the
  current section marked and the links navigate between them; a failed delete
  shows the error state and leaves the note in place; all controls are keyboard
  operable with a visible focus ring.

## Files / areas

- `lib/validation.ts` - add note constants, types, and validators
- `lib/validation.test.ts` - add note validation cases
- `lib/notes.ts` - new: notes repository and `filterNotes`
- `lib/notes.test.ts` - new: notes repository and search tests
- `app/notes/page.tsx` - new: `/notes` route, server component
- `app/page.tsx` - render the shared header above the Tasks screen
- `components/app/AppHeader.tsx` - new: shared Tasks and Notes navigation
- `components/notes/NotesScreen.tsx` - new: client orchestrator (state, load, CRUD, search)
- `components/notes/NoteList.tsx` - new: searchable list pane
- `components/notes/NoteEditor.tsx` - new: title and body form with Save and Delete

`lib/db.ts`, `types/note.ts`, and the `notes` store already exist from Feature 1
and are not modified. The Tasks components are not modified except by
`app/page.tsx`. No schema change.

## Data / contracts

No schema change. The Feature 1 `notes` store (keyPath `id`) and its `updatedAt`
index are used as they are. `Note` already has `id`, `title`, `body`, `createdAt`,
and `updatedAt` (all strings; `body` may be empty).

**Repository functions added** (`lib/notes.ts`):
- `createNote(input: NoteInput): Promise<Note>` - throws `NoteValidationError` on
  an invalid input.
- `getNote(id: string): Promise<Note | undefined>`.
- `listNotes(): Promise<Note[]>` - `updatedAt` descending, `id` ascending tie-break.
- `updateNote(id: string, patch: NotePatch): Promise<Note>` - throws
  `NoteValidationError` on an invalid patch and `NoteNotFoundError` for a missing
  id; bumps `updatedAt`.
- `deleteNote(id: string): Promise<void>` - idempotent.
- `filterNotes(notes: Note[], query: string): Note[]` - pure; case-insensitive
  substring over `title` and `body`; a blank or whitespace-only query returns the
  input unchanged.

**Length bounds:** `NOTE_TITLE_MAX_LENGTH = 200` (reused convention from task
titles) and `NOTE_BODY_MAX_LENGTH = 10000`. Chosen to allow long-form notes while
still rejecting oversized paste; recorded here because the plans stated the need
for a bound but not the value.

**UI contracts recorded as decisions:**
- **Two-pane layout.** List pane on the left, editor pane on the right, desktop
  first, matching the agreed direction. Below a narrow breakpoint it stacks to a
  single column (list, then editor). Mobile-specific chrome is Feature 7's
  offline work and is not built here.
- **The editor is always a form.** Selecting a note loads it; `New note` clears to
  a blank draft; Save creates when the draft is new and updates when a note is
  selected. There is no separate create page or modal.
- **Selecting another note discards unsaved edits** to the current note, matching
  the repository-as-source-of-truth pattern from Features 2 and 3 (no optimistic
  layer, no autosave). This is a known, accepted limitation for a single-user app;
  see the review note.
- **Delete confirms inline, not with `window.confirm`**, reusing the Feature 3
  pattern so it stays keyboard and screen-reader friendly and matches the look.
- **The repository stays the single source of truth.** After every successful
  mutation the list is reloaded rather than patched in place.
- **Mutations serialize through one in-flight guard** (`pendingId`), as on the
  Tasks screen.
- **User text is rendered as text**, never as HTML. React escapes it by default;
  no `dangerouslySetInnerHTML`.
- **Navigation decision (user skipped this question):** a minimal shared header is
  added with Tasks and Notes links, the smallest change that makes `/notes`
  reachable and matches the approved direction. Fuller branding stays in
  Feature 8.

**Required states on the notes screen:**
- loading - initial load in progress
- empty - loaded, no notes ("No notes yet")
- populated - one or more notes in the list
- no results - a search query matches nothing
- draft - a new, unsaved note in the editor
- invalid input - inline, associated, announced title error
- delete confirmation - the editor awaiting a confirm or cancel
- error - a load or mutation failed; show a message and keep the UI usable

## Testing

- Command: `npm run test` (Vitest). The runner exists from Feature 1; this feature
  adds no runner and no dependency.
- This feature adds logic (note validation, the notes repository, and `filterNotes`),
  so per the Testing gate in `coding-standards.md` it must ship passing unit tests
  in the same diff: new cases in `lib/validation.test.ts` and a new
  `lib/notes.test.ts`. The write error classes and validation paths get covered
  here, unlike Feature 3 which was pure UI wiring.
- The existing task suite must stay green. The project suite is currently 38 tests
  across 3 files; note tests are added, none are removed.
- UI behavior rides on `npm run build` plus manual/browser verification of each
  step's done-when. There is no `Browser tests` command, so no browser runner is
  added and browser coverage is not claimed.
- Accessibility to verify manually: title and body inputs are labeled; the
  validation error is associated (`aria-describedby` plus `aria-invalid`) and
  announced (`role="alert"`); focus moves to the title field on an invalid save;
  list items are keyboard selectable buttons with accessible names from the note
  title; the active note is indicated by more than color; destructive intent
  carries a word plus icon; controls show a visible focus ring.

## Notes for the AI

- Server components by default. Keep `app/page.tsx` and `app/notes/page.tsx` server
  components; all new interactivity stays inside `components/notes/`.
- Reuse the Feature 1 data layer pattern and the existing validation module. Do not
  add a state manager, data-fetching library, or form library.
- Do not add Tasks search, filter, or sort (Feature 6), task priority or due dates
  (Feature 5), PWA or offline (Feature 7), or branding (Feature 8).
- Style with Tailwind utilities backed by the existing `@theme` tokens in
  `app/globals.css`. No inline styles.
- The screen must survive a failed IndexedDB open or write: catch errors, show the
  error state, and never leave the UI stuck on loading or on a stuck control.
- No em dashes in code, comments, or docs.

## Open questions

- The product name is still undecided, so the header brand stays a plain mark and
  the word is deferred to Feature 8.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13866,"specSha256":"62a4139ed612bc8757ec44c56fc22d4045f821d1c25d5dc2ff8b96b49a8487b6","branch":"refs/heads/feature/notes","head":"56e662702f1bc316b7a5d11a703964baf00a582e","baseRef":"refs/heads/main","baseCommit":"56e662702f1bc316b7a5d11a703964baf00a582e","sourceTree":"a11eea7ff56ed4a4319b1a325b2319338154adff","absentOptional":[]} -->
