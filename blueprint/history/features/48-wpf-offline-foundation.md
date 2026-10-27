# Feature: WPF Offline Foundation

**From build-plan:** feature 48
**Build attempt:** 1

## Goal

Create the independent .NET 10 WPF desktop application in `apps/windows` with MVVM architecture, Windows-owned SQLite schema migrations, task and note CRUD, search, backup import and export compatible with the TaskFlow universal schema, keyboard navigation, and reliable offline restart behavior.

## In scope

- Create .NET 10 solution `apps/windows/TaskFlow.sln` containing `TaskFlow` (WPF desktop app) and `TaskFlow.Tests` (xUnit test project).
- Add `Microsoft.Data.Sqlite` package for local database persistence.
- Implement Windows-owned SQLite database layer:
  - Database path resolution targeting `%LOCALAPPDATA%\TaskFlow\taskflow.db` for desktop execution and `:memory:` for headless tests.
  - Windows-owned migration runner tracking applied versions in `__migrations`.
  - Schema migration 1 creating `tasks` and `notes` tables with indexes on `updated_at`, `due_date`, and `completed`.
- Implement strongly-typed domain models:
  - `TaskItem` (Id, Title, Description, Completed, CompletedAt, Priority, DueDate, Category, EstimatedMinutes, SourceNoteId, SourceExcerpt, CreatedAt, UpdatedAt).
  - `NoteItem` (Id, Title, Body, CreatedAt, UpdatedAt).
- Implement repository layer:
  - `ITaskRepository` and `TaskRepository` supporting list, filter by status and category, get by id, create, update, toggle completion, and delete.
  - `INoteRepository` and `NoteRepository` supporting list, text search query, get by id, create, update, and delete.
- Implement backup service:
  - `IBackupService` and `BackupService` supporting portable JSON export and import matching TaskFlow v1 and v2 universal backup formats.
  - Support `merge` and `replace` import modes with robust validation and corrupted input rejection.
- Implement MVVM architecture:
  - Base `ObservableObject` (`INotifyPropertyChanged`) and `RelayCommand` (`ICommand`).
  - ViewModels: `MainViewModel`, `TasksViewModel`, `NotesViewModel`, and `BackupViewModel`.
- Implement WPF desktop XAML interface:
  - `MainWindow.xaml`: desktop layout with sidebar navigation (Tasks, Notes, Backup), global search input, quick create button, and active status bar.
  - Task management view with filter tabs (All, Active, Completed), category filter (All, Work, Personal, Urgent, Study, Ideas), task list, and task detail/create dialog.
  - Note management view with search filter, note list, and note detail/create dialog.
  - Backup view with export to file dialog, import from file dialog, merge/replace selector, and import summary.
  - Comprehensive keyboard navigation: access keys, tab traversal, and standard desktop shortcuts (`Ctrl+N` new item, `Ctrl+F` search, `Ctrl+1`/`Ctrl+2`/`Ctrl+3` navigation, `Delete` to remove, `Space` to toggle completion).
- Add automated unit and integration tests in `apps/windows/TaskFlow.Tests`:
  - Database migration and schema integrity tests.
  - Task and note repository CRUD tests.
  - Backup export and import validation tests.
  - ViewModel navigation, filter, and command execution tests.
- Integrate into monorepo root:
  - Add `test:windows` and `build:windows` scripts to root `package.json`.
  - Update `npm run verify` to execute Windows tests and build.
  - Ensure `npm run check:boundaries` confirms zero cross-application imports.

## Out of scope

- Milestone M later features:
  - Feature 49: WPF product and differentiated feature parity (Plan My Day, actionable notes, Follow Up recurrence, Windows toast notifications, URI launchers, Narrator accessibility, high-DPI layouts).
  - Feature 50: WPF API integration, DPAPI cloud sync, MSIX packaging, Store readiness.
- Milestone N: Cross-Platform Hardening (Feature 51).
- Modifying web or mobile applications.

## Build loop

- Step review: feature (review after all steps are complete before /complete).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.

## Build steps

- [x] 1. **Scaffold .NET 10 solution, WPF application, and test project**
  - Create `apps/windows/TaskFlow.sln`.
  - Create `apps/windows/TaskFlow/TaskFlow.csproj` targeting `net10.0-windows` with `Microsoft.Data.Sqlite`.
  - Create `apps/windows/TaskFlow.Tests/TaskFlow.Tests.csproj` targeting `net10.0-windows` with xUnit.
  - Add projects to solution and configure root scripts `test:windows` and `build:windows` in `package.json`.
  - Done when `dotnet build apps/windows/TaskFlow.sln` and `dotnet test apps/windows/TaskFlow.sln` succeed.

- [x] 2. **Implement SQLite database connection, migrations, and domain models**
  - Create domain models `TaskItem` and `NoteItem`.
  - Create `DatabaseConnectionFactory` with path resolution and migration runner.
  - Create Migration 1 (tasks and notes tables with indexes).
  - Add unit tests verifying schema creation, table constraints, and migration idempotency.
  - Done when migration tests execute cleanly on in-memory and disk SQLite connections.

- [x] 3. **Implement TaskRepository and NoteRepository with CRUD and search**
  - Create `ITaskRepository` and `TaskRepository` for task listing, filtering, creation, updating, completion toggle, and deletion.
  - Create `INoteRepository` and `NoteRepository` for note listing, search, creation, updating, and deletion.
  - Add comprehensive repository unit tests in `TaskFlow.Tests`.
  - Done when all task and note repository tests pass with full CRUD coverage.

- [x] 4. **Implement BackupService with JSON import, export, and validation**
  - Create `BackupService` exporting TaskFlow JSON matching the universal v2 format.
  - Implement merge and replace import modes with strict payload validation and sanitization.
  - Add unit tests for serialization, deserialization, corrupt payload handling, and merge/replace semantics.
  - Done when backup service unit tests pass with clean export/import roundtripping.

- [x] 5. **Implement MVVM architecture, ViewModels, and WPF UI with keyboard navigation**
  - Create `ObservableObject` and `RelayCommand`.
  - Create `MainViewModel`, `TasksViewModel`, `NotesViewModel`, and `BackupViewModel`.
  - Implement `MainWindow.xaml` with sidebar navigation, tasks view, notes view, backup view, and dialogs.
  - Wire keyboard navigation shortcuts (`Ctrl+N`, `Ctrl+F`, `Ctrl+1`, `Ctrl+2`, `Ctrl+3`, `Delete`, `Space`).
  - Add ViewModel unit tests covering commands, filter changes, and navigation.
  - Done when WPF application builds cleanly and ViewModel unit tests pass.

- [x] 6. **Monorepo boundary verification and full verification suite**
  - Update root `package.json` `verify` script to include `npm run test:windows && npm run build:windows`.
  - Run `npm run check:boundaries` to verify zero cross-application imports.
  - Run `npm run verify` across the monorepo to ensure boundary checks, mobile typecheck and tests, web lint and tests, web build, and Windows tests and build all pass.
  - Done when `npm run verify` exits with code 0.

## Files / areas

- `apps/windows/TaskFlow.sln`
- `apps/windows/TaskFlow/TaskFlow.csproj`
- `apps/windows/TaskFlow/App.xaml`
- `apps/windows/TaskFlow/App.xaml.cs`
- `apps/windows/TaskFlow/MainWindow.xaml`
- `apps/windows/TaskFlow/MainWindow.xaml.cs`
- `apps/windows/TaskFlow/Models/TaskItem.cs`
- `apps/windows/TaskFlow/Models/NoteItem.cs`
- `apps/windows/TaskFlow/Data/DatabaseConnectionFactory.cs`
- `apps/windows/TaskFlow/Data/MigrationRunner.cs`
- `apps/windows/TaskFlow/Data/Migrations/001_InitialSchema.sql`
- `apps/windows/TaskFlow/Repositories/ITaskRepository.cs`
- `apps/windows/TaskFlow/Repositories/TaskRepository.cs`
- `apps/windows/TaskFlow/Repositories/INoteRepository.cs`
- `apps/windows/TaskFlow/Repositories/NoteRepository.cs`
- `apps/windows/TaskFlow/Services/IBackupService.cs`
- `apps/windows/TaskFlow/Services/BackupService.cs`
- `apps/windows/TaskFlow/Common/ObservableObject.cs`
- `apps/windows/TaskFlow/Common/RelayCommand.cs`
- `apps/windows/TaskFlow/ViewModels/MainViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/TasksViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/NotesViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/BackupViewModel.cs`
- `apps/windows/TaskFlow.Tests/TaskFlow.Tests.csproj`
- `apps/windows/TaskFlow.Tests/DatabaseMigrationTests.cs`
- `apps/windows/TaskFlow.Tests/TaskRepositoryTests.cs`
- `apps/windows/TaskFlow.Tests/NoteRepositoryTests.cs`
- `apps/windows/TaskFlow.Tests/BackupServiceTests.cs`
- `apps/windows/TaskFlow.Tests/ViewModelTests.cs`
- `package.json`

## Data / contracts

- SQLite Database Contract:
  - Local path: `%LOCALAPPDATA%\TaskFlow\taskflow.db`
  - In-memory path: `Data Source=:memory:;Mode=Memory;Cache=Shared`
  - Migrations table: `__migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`
- Backup Contract:
  - Format: JSON object with `version: 2`, `exportedAt: ISO 8601`, `origin: "taskflow-windows"`, `tasks: TaskItem[]`, `notes: NoteItem[]`.
  - Modes: `merge` (inserts missing, updates newer `updatedAt`) and `replace` (deletes existing tasks and notes before inserting).
- Keyboard Navigation Contract:
  - `Ctrl+1`: Navigate to Tasks
  - `Ctrl+2`: Navigate to Notes
  - `Ctrl+3`: Navigate to Backup
  - `Ctrl+N`: Create new task or note depending on active tab
  - `Ctrl+F`: Focus search input
  - `Space` / `Enter`: Toggle task completion
  - `Delete`: Delete selected task or note

## Testing

- Unit tests in `apps/windows/TaskFlow.Tests/DatabaseMigrationTests.cs` for migration ordering, idempotency, and foreign key enforcement.
- Unit tests in `apps/windows/TaskFlow.Tests/TaskRepositoryTests.cs` for task CRUD, status filtering, category filtering, and completion toggle.
- Unit tests in `apps/windows/TaskFlow.Tests/NoteRepositoryTests.cs` for note CRUD and search filtering.
- Unit tests in `apps/windows/TaskFlow.Tests/BackupServiceTests.cs` for JSON export, import merge, import replace, and invalid JSON rejection.
- Unit tests in `apps/windows/TaskFlow.Tests/ViewModelTests.cs` for command execution, tab selection, and filter bindings.
- Verification command: `npm run verify` (runs boundary check, mobile typecheck, mobile vitest, web lint, web vitest, web production build, windows test, and windows build).

## Notes for the AI

- Monorepo boundary isolation is mandatory: never import or reference source files from `apps/web` or `apps/mobile` in `apps/windows`.
- Strictly no em dashes, en dashes, or ellipsis in any code, comments, commit messages, or responses.
- Use nullable reference types in C# with clean warning-free compilation (`<Nullable>enable</Nullable>`).
- Keep ViewModels decoupled from Views so logic is 100% testable via xUnit.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10663,"specSha256":"1609e7bf22d8d77735e5827216db00d5cff2cb27e1c3c48803110ccba0362e89","branch":"refs/heads/feature/wpf-offline-foundation","head":"845d32fe76da79f78a6242faa363ac7207123ae3","baseRef":"refs/heads/main","baseCommit":"845d32fe76da79f78a6242faa363ac7207123ae3","sourceTree":"06e8982c18d3eb48a49d129336ef3af4ae0f4dff","absentOptional":[]} -->
