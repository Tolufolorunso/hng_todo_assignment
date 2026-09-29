# Feature: Task data layer and persistence

**From build-plan:** feature 1
**Build attempt:** 1
**Status:** verified
**Branch:** feature/task-data-layer-and-persistence

## Goal

Give the app a typed, tested data layer over the browser database so every later
feature reads and writes tasks through one reliable API. This feature delivers the
IndexedDB schema (version 1) with `tasks` and `notes` stores, a lazily opened
database handle, validation helpers, full task CRUD, and the unit-test harness that
turns the logic test gate on. No UI ships here; the evidence is the test suite and a
clean build.

## In scope

- Runtime dependency `idb`; dev dependencies `vitest` and `fake-indexeddb`.
- Vitest configuration and setup, a `test` script in `package.json`, and the
  matching `test` command recorded in `AGENTS.md`.
- Domain types: `Task`, `Note`, and `TaskPriority`.
- IndexedDB schema version 1 with stores `tasks` and `notes`, opened lazily.
- Task repository: create, read one, list, update, delete.
- Input validation helpers for task fields.
- Unit tests for the schema, validation, and CRUD behavior.

## Out of scope

- Any UI, route, or component. Feature 2 owns the first visible slice.
- Note repository functions and note validation. The `notes` store is created now
  (see Data / contracts) but only Feature 4 wires note CRUD.
- `dueDate` and `priority` fields and their index. Feature 5 adds these and bumps
  the schema to version 2.
- Search, filter, and sort. Feature 6 owns these as pure functions.
- Offline/PWA work (Feature 7) and deployment (Feature 8).
- A combined `Verify` command or CI. `/ci` owns those; this feature does not
  create them.

## Build loop

- `workflow.stepReview` is `feature`, so implement and verify each step, then show
  one feature-level review packet with the full diff and each step's evidence.
- `workflow.checkpointCommits` is `disabled`, so no checkpoint commits are offered.
- After the final packet, a read-only walkthrough of the finished code is available.
- `/complete` creates the single feature commit.

## Build steps

- [x] 1. Install `idb`, `vitest`, and `fake-indexeddb`; add `vitest.config.ts` and a
  setup file that loads `fake-indexeddb/auto`; add `"test": "vitest run"` to
  `package.json`; record the test command in the `AGENTS.md` Commands section and
  update its testing note. Add one trivial smoke test to prove the runner works.
  **Done when:** `npm run test` passes, `npm run build` still succeeds, and a
  deliberately broken assertion fails the run (proving an empty or ineffective
  suite cannot look green).
- [x] 2. Add `types/task.ts` (`Task`, `TaskPriority`) and `types/note.ts` (`Note`),
  then `lib/db.ts`: the `TaskFlowDB` schema interface, store and index definitions,
  a lazily opened module-level handle, `getDb()`, and `deleteDb()` for resets.
  **Done when:** tests confirm the database opens at version 1, both object stores
  exist, each declared index exists, a record round-trips through a store, and
  `deleteDb()` clears it.
- [x] 3. Add `lib/validation.ts` with helpers that validate and normalize task
  input (trim title, reject empty, enforce field limits; normalize optional
  description).
  **Done when:** tests cover a valid task, a whitespace-only title, an empty title,
  an over-limit title, a missing description, and an over-limit description, and
  each returns the exact expected result or error.
- [x] 4. Add `lib/tasks.ts` with `createTask`, `getTask`, `listTasks`, `updateTask`,
  and `deleteTask`, using the validation helpers and a shared clock/id source.
  **Done when:** tests cover create (defaults and generated fields), read by id
  (found and missing), list ordering, update of each field including `completed`
  transition semantics, update of a missing id, and delete including a repeat
  delete. `npm run test` and `npm run build` both pass.

## Files / areas

- `package.json` - add dependencies and the `test` script
- `vitest.config.ts` - new test runner configuration
- `vitest.setup.ts` - new setup file loading `fake-indexeddb/auto`
- `AGENTS.md` - add the test command to Commands, update the testing note
- `types/task.ts` - new: `Task`, `TaskPriority`
- `types/note.ts` - new: `Note`
- `lib/db.ts` - new: schema, `getDb`, `deleteDb`
- `lib/validation.ts` - new: task input validation and normalization
- `lib/tasks.ts` - new: task CRUD
- `lib/db.test.ts`, `lib/validation.test.ts`, `lib/tasks.test.ts` - new tests

`types/`, `lib/` do not exist yet and are created by this feature. The App Router
stays at the repo root; nothing under `app/` changes.

## Data / contracts

All data lives in IndexedDB in the browser. No server, no API routes.

**Database:** name `taskflow`, version `1`, opened lazily on first use through
`idb`'s `openDB`. The module keeps one resolved handle and reopens if it was
closed. `deleteDb()` closes and deletes the database for tests and resets.

**`tasks` store** - primary key `id` (string).

- `id` (string) - `crypto.randomUUID()`, generated by the repository
- `title` (string) - required, trimmed
- `description` (string) - optional, defaults to `""`
- `completed` (boolean) - defaults to `false`
- `createdAt`, `updatedAt` (string) - ISO 8601 datetime, set by the repository
- `completedAt` (string | null) - ISO 8601 datetime, `null` until completed

Indexes: `updatedAt`.

**`notes` store** - primary key `id` (string). Created now so Feature 4 needs no
migration; no note code touches it yet.

- `id` (string)
- `title` (string) - required
- `body` (string)
- `createdAt`, `updatedAt` (string) - ISO 8601 datetime

Indexes: `updatedAt`.

**Decisions recorded (differ from or extend the overview's brief index list):**

- The overview lists an index on `completed`. IndexedDB rejects boolean key values,
  so a `completed` index cannot work as written. Status filtering is instead done
  in memory by Feature 6, which is proportionate at this scale. The overview's
  index list should be corrected on the next `/overview` run; this feature does not
  edit the generated overview.
- `dueDate` and `priority` are not in version 1. Feature 5 adds them and their
  `dueDate` index in a version 2 upgrade, which is the migration the plan's risk
  note anticipates. Version 1 therefore ships one upgrade path to extend later,
  not two.
- Field limits, chosen as generous defaults and easy to change in `validation.ts`:
  title 1 to 200 characters after trimming, description 0 to 2000 characters.

**Validation contract** (`lib/validation.ts`):

- Title is trimmed; a missing or whitespace-only title is rejected.
- Rejected input returns a typed result (`{ ok: false, error }`); accepted input
  returns the normalized value (`{ ok: true, value }`). Helpers never throw on
  invalid user input; the repository surfaces the validation error to its caller.

**Repository contract** (`lib/tasks.ts`):

- `createTask({ title, description? })` validates, then writes a task with
  generated `id`, `completed: false`, `completedAt: null`, and matching
  `createdAt`/`updatedAt`. Rejects invalid input; the validation error propagates.
- `getTask(id)` returns the task or `undefined`.
- `listTasks()` returns all tasks ordered by `createdAt` descending, with `id`
  ascending as a deterministic tie-break. User-selectable sorting is Feature 6.
- `updateTask(id, patch)` accepts a partial patch of `title`, `description`, and
  `completed`; validates any provided field; always advances `updatedAt`. Setting
  `completed` to `true` sets `completedAt` to the current time; setting it to
  `false` sets `completedAt` to `null`. Throws `TaskNotFoundError` when the id is
  absent.
- `deleteTask(id)` removes the task and is idempotent: deleting an absent id
  resolves without error.
- All reads and writes go through `getDb()`. The module is client-only; it uses the
  `indexedDB` global and must not be imported from a server component.

## Testing

- Command: `npm run test` (`vitest run`). This command is new in this feature, so
  the logic test gate is ON from here on.
- Runner: Vitest with `fake-indexeddb/auto` loaded in `vitest.setup.ts`, giving a
  real IndexedDB implementation in the test process. Environment is Node; no DOM.
- Time and ids must be deterministic in tests: use `vi.useFakeTimers()` to fix
  `createdAt`/`updatedAt` and `vi.setSystemTime()`, and assert generated ids by
  shape and uniqueness rather than exact value.
- Each test starts from a clean database via `deleteDb()` in `beforeEach`.
- Scope: the data layer, validation, and CRUD logic. There is no UI in this
  feature, so no browser test is added and none is claimed.
- Evidence for this feature is the passing `npm run test` and a clean
  `npm run build`. No Verify command exists yet, so it is not run.

## Notes for the AI

- Do not add UI, routes, or a notes repository in this feature.
- Keep the store shapes and the version 1 schema fixed; they are a contract later
  features depend on. A field or index change after this feature is a version bump.
- Do not index `completed`; booleans are not valid IndexedDB keys.
- Reuse the standard library and `idb`. Do not add an ORM, state library, or
  validation library for these rules.
- The `notes` store ships empty and tested for existence only; that is intentional
  so Feature 4 needs no migration.
- No em dashes in code, comments, or docs.

## Open questions

None blocking. The chosen field limits and the dropped `completed` index are
recorded above as decisions; either can be revised during review.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9520,"specSha256":"6167cdce33cf514790a4e915fa77419828d74e0c52e2b10ee5fd6ca77017b119","branch":"refs/heads/feature/task-data-layer-and-persistence","head":"09ce1854832d81f097dd8bc21fc463bfa4a89b43","baseRef":"refs/heads/master","baseCommit":"09ce1854832d81f097dd8bc21fc463bfa4a89b43","sourceTree":"ff567447c5608b2984242791762932f78748f9c5","absentOptional":[]} -->
