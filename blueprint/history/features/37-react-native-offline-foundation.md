# Feature: React Native offline foundation

**From build-plan:** feature 37
**Build attempt:** 1
**Branch:** feature/react-native-offline-foundation
**Status:** verified

## Goal

Create the independent React Native mobile application for Android and iOS in `apps/mobile`, providing an offline-first foundation with native-style navigation, mobile-owned SQLite schema and migrations, task and note CRUD, live search, portable JSON backup import and export, accessible touch interactions, and verified offline restart persistence.

## In scope

- Mobile application layout and scaffolding in `apps/mobile`:
  - Independent `package.json`, TypeScript configuration (`tsconfig.json`), and directory structure in `apps/mobile`.
  - App entry point (`apps/mobile/App.tsx` or `src/App.tsx`) supporting clean offline initialization.
  - Zero cross-application source imports, strictly respecting repository isolation boundaries verified by `scripts/check-boundaries.mjs`.
- Mobile-owned SQLite schema and migrations:
  - Database manager and migration runner (`apps/mobile/src/db/`) executing versioned DDL.
  - Tables for `tasks` and `notes` matching TaskFlow data models:
    - `tasks`: `id`, `title`, `description`, `completed`, `completed_at`, `priority`, `due_date`, `category`, `created_at`, `updated_at`.
    - `notes`: `id`, `title`, `body`, `created_at`, `updated_at`.
    - `schema_migrations`: tracking applied migration versions.
  - Support for both native SQLite drivers and an in-memory/test driver for deterministic unit test execution.
- Task and Note data layer and validation:
  - Data repositories (`apps/mobile/src/storage/` or `services/`) with full CRUD operations.
  - Input validation enforcing 1-200 character titles, priority enum checks (`low`, `medium`, `high`), category enum checks (`work`, `personal`, `urgent`, `study`, `ideas`), date formatting (`YYYY-MM-DD`), and size bounds.
- Live search:
  - Unified and per-entity search querying titles, descriptions, and note bodies with case-insensitive matching and fast result rendering.
- Backup import and export:
  - Backup v1 and v2 format support in mobile JSON snapshot format.
  - Export: generates valid JSON snapshots of local tasks and notes with metadata.
  - Import: supports merge and replace modes, validating schema integrity and rejecting malformed payloads before database writes.
- Accessible touch navigation and screen UI:
  - Navigation container with native tabs or stack navigation between Tasks, Notes, Search, and Settings/Backup.
  - Accessible touch interaction: minimum 44x44 dp touch targets, clear accessibility labels and roles, visible empty and loading states.
  - Screens: Tasks screen, Task detail/edit modal or screen, Notes screen, Note detail/edit modal or screen, Search screen, and Backup screen.
- Automated testing:
  - Unit and integration tests covering SQLite migrations, CRUD operations, validation rules, search queries, and backup import/export.

## Out of scope

- Differentiated Milestone L capabilities (Feature 38): Plan My Day, Actionable Notes, Follow Up recurrence, local reminder notifications, communication launchers, share-sheet capture, and app shortcuts.
- Cloud synchronization, accounts, and session management (Feature 39).
- WPF or Windows application code (`apps/windows`).
- Modifying web application logic in `apps/web`.

## Build loop

- Step review: feature (review after the entire feature is ready).
- Checkpoint commits: disabled.

## Build steps

- [x] 1. **Mobile Application Scaffolding and Types**
   - Initialize `apps/mobile/package.json`, `tsconfig.json`, and core directory structure.
   - Define TypeScript interfaces in `apps/mobile/src/types/` for tasks, notes, search queries, backup snapshots, and navigation routes.
   - Done when `apps/mobile/package.json` and TypeScript configuration are valid and pass type checking without errors.

- [x] 2. **Mobile SQLite Schema and Migration Runner**
   - Implement database connection abstraction and migration engine in `apps/mobile/src/db/`.
   - Create initial migration `001_initial_schema.sql` (or TypeScript migration equivalent) defining `tasks`, `notes`, and `schema_migrations` tables with indexes.
   - Implement pluggable database driver allowing tests to run in-memory while production uses SQLite.
   - Add unit tests in `apps/mobile/src/db/database.test.ts`.
   - Done when migrations execute cleanly, create expected schema, and pass all database unit tests.

- [x] 3. **Task and Note Repositories and Validation**
   - Implement validation helpers in `apps/mobile/src/services/validation.ts` for task and note constraints.
   - Implement `TaskRepository` and `NoteRepository` in `apps/mobile/src/storage/` providing CRUD methods, filtering, and sorting.
   - Add unit tests in `apps/mobile/src/storage/repository.test.ts`.
   - Done when task and note creation, reading, updating, and deletion pass all repository tests.

- [x] 4. **Live Search and Backup Import/Export Service**
   - Implement `apps/mobile/src/services/search.ts` providing keyword matching across tasks and notes.
   - Implement `apps/mobile/src/services/backup.ts` supporting export of JSON backup files and import with validation in merge and replace modes.
   - Add unit tests in `apps/mobile/src/services/backup.test.ts` and `apps/mobile/src/services/search.test.ts`.
   - Done when search queries return expected filtered entities and backup import/export correctly serializes and restores database state.

- [x] 5. **Accessible Mobile UI Components and Screen Layouts**
   - Implement core accessible touch UI components in `apps/mobile/src/components/` (touchable cards, buttons with >=44dp target areas, badges, text inputs, empty state banners).
   - Implement mobile screens:
     - `TasksScreen`: filterable task list with completion toggle, priority chips, and create/edit actions.
     - `TaskEditScreen`: modal or screen for creating and editing tasks with validation error announcements.
     - `NotesScreen`: list of notes with excerpts, creation, and detail views.
     - `NoteEditScreen`: rich or plain-text note editor with title and body inputs.
     - `SearchScreen`: unified search bar with categorized results.
     - `BackupScreen`: export JSON action and import file/text selector with mode choices.
   - Done when components render with proper accessibility props (`accessibilityRole`, `accessibilityLabel`) and handle empty, loading, and error states.

- [x] 6. **Mobile Navigation and Offline Restart App Entry**
   - Implement mobile navigation in `apps/mobile/src/navigation/` (tab bar and stack transitions).
   - Wire `apps/mobile/App.tsx` with database initialization, splash/loading state handling, and error boundaries.
   - Ensure app survives restarts with data fully preserved in SQLite.
   - Done when `App.tsx` initializes database and renders navigation without runtime exceptions.

- [x] 7. **Monorepo Boundary Check and Verification**
   - Run boundary check `node scripts/check-boundaries.mjs` to ensure zero cross-application imports.
   - Run all mobile tests and root verification gates.
   - Done when boundary checks, mobile test suites, and existing web verification pass cleanly.

## Files / areas

- `apps/mobile/package.json` - mobile application dependencies and test scripts.
- `apps/mobile/tsconfig.json` - strict TypeScript configuration for mobile.
- `apps/mobile/App.tsx` - mobile application entry point and database lifecycle manager.
- `apps/mobile/src/types/` - domain types for tasks, notes, backups, and navigation.
- `apps/mobile/src/db/` - SQLite database initialization, migration runner, and schema definitions.
- `apps/mobile/src/storage/` - task and note SQLite repository implementations.
- `apps/mobile/src/services/` - validation, search, and backup import/export services.
- `apps/mobile/src/components/` - accessible touch UI primitives and list item components.
- `apps/mobile/src/screens/` - Tasks, TaskEdit, Notes, NoteEdit, Search, and Backup screens.
- `apps/mobile/src/navigation/` - root navigation stack and tab navigator.
- `apps/mobile/tests/` or `apps/mobile/src/**/*.test.ts` - mobile unit tests.
- `scripts/check-boundaries.mjs` - monorepo boundary check verification.

## Data / contracts

- `Task`:
  - `id`: string (UUID or stable ID)
  - `title`: string (1 to 200 characters)
  - `description`: string (up to 20,000 characters)
  - `completed`: boolean
  - `completedAt`: string | null (ISO 8601 UTC)
  - `priority`: "low" | "medium" | "high"
  - `dueDate`: string | null (YYYY-MM-DD)
  - `category`: "work" | "personal" | "urgent" | "study" | "ideas" | null
  - `createdAt`: string (ISO 8601 UTC)
  - `updatedAt`: string (ISO 8601 UTC)
- `Note`:
  - `id`: string
  - `title`: string (1 to 200 characters)
  - `body`: string (up to 50,000 characters)
  - `createdAt`: string (ISO 8601 UTC)
  - `updatedAt`: string (ISO 8601 UTC)
- `MobileBackupSnapshot`:
  - `version`: 1 | 2
  - `exportedAt`: string (ISO 8601 UTC)
  - `origin`: "taskflow-mobile"
  - `tasks`: Task[]
  - `notes`: Note[]

## Testing

- Unit tests via test runner in `apps/mobile`:
  - `database.test.ts`: migration execution, schema creation, index creation, table inspection.
  - `repository.test.ts`: task and note CRUD, filtering by priority/category/completion, order sorting.
  - `validation.test.ts`: boundary validation on titles, dates, priorities, and descriptions.
  - `search.test.ts`: multi-field search ranking and case-insensitive matching across tasks and notes.
  - `backup.test.ts`: export payload structure, import merge deduplication, import replace replacement, and malformed payload rejection.
- Monorepo gate: `npm run check:boundaries` and `npm run verify`.

## Notes for the AI

- Maintain zero em dashes, en dashes, or ellipsis characters across all files, comments, and specs.
- Do not import any code from `apps/web` or `apps/windows`. Mobile code must be completely self-contained.
- SQLite queries should use parameterized statements to prevent SQL injection.
- Keep touch targets accessible with at least 44x44 dp sizing and explicit accessibility labels.
- Stop after planning; do not implement in `/feature`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10186,"specSha256":"c16dd4ba1e2cde65c53eed5a9746abc0ad8e0ad7ae5eab512644420771563410","branch":"refs/heads/feature/react-native-offline-foundation","head":"9445623f1dfc1bd688674846e680c66a64632731","baseRef":"refs/heads/main","baseCommit":"9445623f1dfc1bd688674846e680c66a64632731","sourceTree":"3ceea6eb335c31140109c9483157cd677b5df585","absentOptional":[]} -->
