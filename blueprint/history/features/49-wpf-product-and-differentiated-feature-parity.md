# Feature: WPF Product and Differentiated Feature Parity

**From build-plan:** feature 49
**Build attempt:** 1
**Status:** verified

## Goal

Implement the full suite of differentiated productivity capabilities in the native Windows WPF application (`apps/windows`): Follow Up commitments with recurring schedules, Plan My Day capacity planning with score explanations, Fast Capture Inbox with triage into tasks/notes/follow-ups, Actionable Notes with backlink context, Calendar schedule view, Analytics insights, rich note reading, Light/Dark/High-Contrast themes, communication launchers (email, phone, WhatsApp), Windows toast notifications, Narrator accessibility, and keyboard navigation.

## In scope

- SQLite Schema Migration 2 (`002_DifferentiatedFeatures.sql`):
  - Table `followups` with columns `id`, `person_name`, `commitment`, `details`, `due_at`, `time_zone`, `email_address`, `phone_number`, `whatsapp_number`, `preferred_action`, `recurrence_json`, `status`, `source_note_id`, `source_excerpt`, `created_at`, `updated_at`.
  - Table `followup_occurrences` with columns `id`, `followup_id`, `scheduled_due_time`, `outcome`, `resolution_time`, `created_at`, `updated_at`.
  - Table `daily_plans` with columns `id`, `local_date`, `time_zone`, `available_minutes`, `items_json`, `accepted_at`, `created_at`, `updated_at`.
  - Table `inbox_captures` with columns `id`, `text`, `shared_url`, `source_app_label`, `state`, `result_entity_type`, `result_entity_id`, `processed_at`, `captured_at`.
  - Table `task_orders` with columns `id`, `ordered_ids_json`, `updated_at`.
  - Migration runner support for incremental migrations in `__migrations`.
- Strongly-typed domain models:
  - `FollowUpItem`, `RecurrenceRule`, `FollowUpOccurrenceItem`, `DailyPlanItem`, `PlanItemReference`, `InboxCaptureItem`, `TaskOrderItem`.
- Repositories and Engines:
  - `IFollowUpRepository` & `FollowUpRepository`: CRUD, status filtering (`open`, `completed`, `archived`), occurrence generation, snooze (postponing occurrence), and reschedule (series vs single occurrence).
  - `RecurrenceEngine`: computes next occurrences for both `calendarAnchored` and `completionRelative` recurrence rules.
  - `PlanEngine`: capacity budgeting by `availableMinutes`, recommendation scoring based on urgency/due date, priority weighting (urgent > high > medium > low), due follow-up inclusion, and explanation generation.
  - `IDailyPlanRepository` & `DailyPlanRepository`: persist and retrieve daily plans by `localDate`.
  - `IInboxRepository` & `InboxRepository`: quick capture of text and URLs, list pending/processed/discarded, and triage into task, note, or follow-up.
  - `ActionableNotesService`: excerpt extraction from note text and conversion into task or follow-up with source backlink (`sourceNoteId`, `sourceExcerpt`).
  - `ILauncherService` & `LauncherService`: communication launchers opening `mailto:`, `tel:`, and `https://wa.me/` via Windows default process execution.
  - `NotificationService`: schedules and displays Windows toast notifications or notification alerts for due follow-ups and tasks.
- ViewModels:
  - `FollowUpsViewModel`: list follow-ups, filter by status, create/edit with recurrence, snooze, reschedule, and launcher actions.
  - `PlanMyDayViewModel`: available minutes input, plan generation via `PlanEngine`, item reordering/toggling, plan acceptance, and history.
  - `InboxViewModel`: fast capture input with automatic URL detection, list pending captures, triage actions.
  - `CalendarViewModel`: interactive monthly schedule mapping tasks and due follow-ups by date.
  - `AnalyticsViewModel`: completion rate metrics, priority distribution, category breakdown, velocity stats.
  - `ThemeViewModel`: Light, Dark, and High Contrast theme modes with dynamic resource dictionary swapping.
  - `MainViewModel`: navigation for 8 primary destinations (Tasks, Follow Ups, Plan My Day, Notes, Inbox, Calendar, Analytics, Backup), global search, and keyboard shortcuts (`Ctrl+1`..`Ctrl+8`, `Ctrl+N`, `Ctrl+I`, `Ctrl+P`, `Ctrl+F`).
- Desktop UI, Accessibility, and Presentation:
  - Sidebar navigation updated with badges and shortcuts for all 8 destinations.
  - Follow Ups View with person name, commitment text, recurrence tags, due indicators, snooze/reschedule dialog, and action launcher buttons.
  - Plan My Day View with capacity bar, recommended item list with score explanations, and accepted plan view.
  - Inbox View with quick capture text box, instant save, and triage cards.
  - Calendar View with interactive date grid and day item inspector.
  - Analytics View with stat KPI cards and visual distribution bars.
  - Standalone Note Reader mode with word count, reading time estimation, and copy action.
  - AutomationProperties (`AutomationProperties.Name`, `AutomationProperties.HelpText`) on all interactive controls for Windows Narrator screen reader support.
  - High-DPI layout compatibility with vector glyphs and dynamic brush resources.
- Automated unit test suite:
  - Database migration 2 integrity and idempotency tests.
  - FollowUp and recurrence engine tests.
  - PlanEngine scoring and capacity budgeting tests.
  - Inbox capture and triage tests.
  - Communication launcher URI formatting tests.
  - ViewModel state transitions, commands, and filter tests.
- Monorepo Verification:
  - Zero cross-application imports verified via `npm run check:boundaries`.
  - Full `npm run verify` passing across web, mobile, and windows.

## Out of scope

- Milestone M Feature 50:
  - Authentication and session lifecycle (email OTP, refresh tokens).
  - Cloud synchronization and conflict engine with Next.js backend.
  - DPAPI-protected session storage.
  - MSIX packaging, code signing, and Microsoft Store submission.
- Milestone N Cross-Platform Hardening (Feature 51).
- Modifying web or mobile applications.

## Build loop

- Step review: feature (review after all steps are complete before /complete).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.
- Branch: `feature/wpf-product-and-differentiated-feature-parity`.

## Build steps

- [x] 1. **Implement SQLite Migration 2 and differentiated domain models**
  - Create embedded SQL migration `002_DifferentiatedFeatures.sql` creating `followups`, `followup_occurrences`, `daily_plans`, `inbox_captures`, and `task_orders` tables with indexes.
  - Update `MigrationRunner` to discover and run migration 2 sequentially.
  - Create domain models: `FollowUpItem`, `RecurrenceRule`, `FollowUpOccurrenceItem`, `DailyPlanItem`, `PlanItemReference`, `InboxCaptureItem`, and `TaskOrderItem`.
  - Add unit tests in `TaskFlow.Tests` verifying migration 2 execution and schema integrity.
  - Done when migration 2 executes cleanly on both in-memory and disk SQLite databases.

- [x] 2. **Implement FollowUp repository, RecurrenceEngine, and occurrence scheduling**
  - Create `RecurrenceEngine` supporting `calendarAnchored` and `completionRelative` recurrence calculations.
  - Create `IFollowUpRepository` and `FollowUpRepository` for full CRUD, status filtering, occurrence generation, snooze, and reschedule.
  - Add unit tests verifying recurrence calculation, occurrence resolution, snooze, and reschedule.
  - Done when all FollowUp and RecurrenceEngine unit tests pass.

- [x] 3. **Implement PlanEngine, DailyPlanRepository, and TaskOrderRepository**
  - Create `PlanEngine` implementing capacity-based day planning with scoring weights and explanations.
  - Create `IDailyPlanRepository` & `DailyPlanRepository` to persist and load daily plans.
  - Create `ITaskOrderRepository` & `TaskOrderRepository` to persist and retrieve custom task order.
  - Add unit tests verifying capacity limits, scoring algorithms, and plan persistence.
  - Done when PlanEngine and plan repository tests pass with full coverage.

- [x] 4. **Implement Fast Capture Inbox, Actionable Notes, and LauncherService**
  - Create `IInboxRepository` & `InboxRepository` with URL detection and triage methods.
  - Create `ActionableNotesService` to convert note excerpts into tasks or follow-ups with backlinks.
  - Create `ILauncherService` & `LauncherService` for email, phone, and WhatsApp communication launchers.
  - Add unit tests for inbox capture triage, actionable note conversion, and launcher URI dispatch.
  - Done when inbox, actionable note, and launcher unit tests pass.

- [x] 5. **Implement ViewModels for all differentiated capabilities**
  - Create `FollowUpsViewModel`, `PlanMyDayViewModel`, `InboxViewModel`, `CalendarViewModel`, `AnalyticsViewModel`, and `ThemeViewModel`.
  - Update `MainViewModel` to manage navigation across all 8 destinations, global search, and keyboard shortcuts.
  - Add comprehensive ViewModel unit tests covering commands, state transitions, and calculations.
  - Done when all ViewModel unit tests pass cleanly.

- [x] 6. **Implement desktop WPF views, Note Reader, Narrator accessibility, and themes**
  - Update `MainWindow.xaml` with sidebar navigation for all 8 destinations.
  - Add views for Follow Ups, Plan My Day, Fast Capture Inbox, Calendar, and Analytics.
  - Add standalone Note Reader view and actionable note excerpt conversion.
  - Implement Light, Dark, and High Contrast theme palettes with dynamic resource switching.
  - Add `AutomationProperties` on all controls for Windows Narrator screen reader support.
  - Configure keyboard navigation shortcuts (`Ctrl+1`..`Ctrl+8`, `Ctrl+N`, `Ctrl+I`, `Ctrl+P`, `Ctrl+F`, `Space`, `Delete`).
  - Done when WPF application builds with zero warnings or errors.

- [x] 7. **Monorepo boundary verification and full verification suite**
  - Run `npm run check:boundaries` to ensure zero cross-application references.
  - Run `npm run verify` across the monorepo to ensure boundary checks, mobile typecheck + tests, web lint + tests + build, and windows tests + build all pass.
  - Done when `npm run verify` exits with code 0.

## Files / areas

- `apps/windows/TaskFlow/Data/Migrations/002_DifferentiatedFeatures.sql`
- `apps/windows/TaskFlow/Data/MigrationRunner.cs`
- `apps/windows/TaskFlow/Models/FollowUpItem.cs`
- `apps/windows/TaskFlow/Models/FollowUpOccurrenceItem.cs`
- `apps/windows/TaskFlow/Models/RecurrenceRule.cs`
- `apps/windows/TaskFlow/Models/DailyPlanItem.cs`
- `apps/windows/TaskFlow/Models/InboxCaptureItem.cs`
- `apps/windows/TaskFlow/Models/TaskOrderItem.cs`
- `apps/windows/TaskFlow/Repositories/IFollowUpRepository.cs`
- `apps/windows/TaskFlow/Repositories/FollowUpRepository.cs`
- `apps/windows/TaskFlow/Repositories/IDailyPlanRepository.cs`
- `apps/windows/TaskFlow/Repositories/DailyPlanRepository.cs`
- `apps/windows/TaskFlow/Repositories/IInboxRepository.cs`
- `apps/windows/TaskFlow/Repositories/InboxRepository.cs`
- `apps/windows/TaskFlow/Repositories/ITaskOrderRepository.cs`
- `apps/windows/TaskFlow/Repositories/TaskOrderRepository.cs`
- `apps/windows/TaskFlow/Services/RecurrenceEngine.cs`
- `apps/windows/TaskFlow/Services/PlanEngine.cs`
- `apps/windows/TaskFlow/Services/ActionableNotesService.cs`
- `apps/windows/TaskFlow/Services/ILauncherService.cs`
- `apps/windows/TaskFlow/Services/LauncherService.cs`
- `apps/windows/TaskFlow/Services/NotificationService.cs`
- `apps/windows/TaskFlow/Services/ThemeService.cs`
- `apps/windows/TaskFlow/ViewModels/MainViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/FollowUpsViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/PlanMyDayViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/InboxViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/CalendarViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/AnalyticsViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/ThemeViewModel.cs`
- `apps/windows/TaskFlow/MainWindow.xaml`
- `apps/windows/TaskFlow/MainWindow.xaml.cs`
- `apps/windows/TaskFlow.Tests/DatabaseMigrationTests.cs`
- `apps/windows/TaskFlow.Tests/FollowUpRepositoryTests.cs`
- `apps/windows/TaskFlow.Tests/RecurrenceEngineTests.cs`
- `apps/windows/TaskFlow.Tests/PlanEngineTests.cs`
- `apps/windows/TaskFlow.Tests/InboxRepositoryTests.cs`
- `apps/windows/TaskFlow.Tests/ActionableNotesTests.cs`
- `apps/windows/TaskFlow.Tests/LauncherServiceTests.cs`
- `apps/windows/TaskFlow.Tests/DifferentiatedViewModelTests.cs`

## Data / contracts

- Follow Up Contract:
  - Recurrence rules support `calendarAnchored` (fixed calendar slots) and `completionRelative` (relative to actual completion).
  - Occurrence states: `open`, `completed`, `skipped`, `missed`.
  - Snooze increments scheduled due time without altering parent recurrence rule.
- Plan My Day Contract:
  - Capacity input in minutes (`availableMinutes`).
  - Score formula: `(priorityWeight * 10) + urgencyScore + overduePenalty`.
  - Explanations describe why each item was recommended.
- Fast Capture Inbox Contract:
  - Quick capture of text and auto-detected URLs.
  - Triage actions: `ConvertToTask`, `ConvertToFollowUp`, `ConvertToNote`, `Discard`.
- Actionable Notes Contract:
  - Excerpt selected in note is converted to task or follow-up with `sourceNoteId` and `sourceExcerpt`.
- Communication Launchers Contract:
  - Email: `mailto:{emailAddress}?subject=Follow%20Up%3A%20{commitment}`
  - Phone: `tel:{phoneNumber}`
  - WhatsApp: `https://wa.me/{cleanPhone}?text=Hi%20{personName}`
- Keyboard Navigation Contract:
  - `Ctrl+1`: Tasks
  - `Ctrl+2`: Follow Ups
  - `Ctrl+3`: Plan My Day
  - `Ctrl+4`: Notes
  - `Ctrl+5`: Fast Capture Inbox
  - `Ctrl+6`: Calendar
  - `Ctrl+7`: Analytics
  - `Ctrl+8`: Backup & Restore
  - `Ctrl+N`: New Item
  - `Ctrl+I`: Open Fast Capture
  - `Ctrl+P`: Open Plan My Day
  - `Ctrl+F`: Focus Search
  - `Space`: Toggle Completion / Action

## Testing

- Unit tests in `FollowUpRepositoryTests.cs` and `RecurrenceEngineTests.cs` for recurrence calculation, series management, snooze, and reschedule.
- Unit tests in `PlanEngineTests.cs` for recommendation scoring, capacity constraints, and explanation strings.
- Unit tests in `InboxRepositoryTests.cs` and `ActionableNotesTests.cs` for triage logic and backlink preservation.
- Unit tests in `LauncherServiceTests.cs` for communication URI formation.
- Unit tests in `DifferentiatedViewModelTests.cs` for ViewModel navigation, commands, and filter states.
- Monorepo gate: `npm run verify` (boundary check, mobile typecheck + tests, web lint + tests + build, windows test + build).

## Notes for the AI

- Monorepo isolation is mandatory: never import or reference source files from `apps/web` or `apps/mobile` in `apps/windows`.
- Strictly no em dashes, en dashes, or ellipsis in any code, comments, commit messages, or docs.
- Strict C# nullable reference types (`<Nullable>enable</Nullable>`).
- Keep ViewModels decoupled from Views so all logic is testable via xUnit.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":14713,"specSha256":"5a7505d6791caa27958ad5157192acddc391790a1e8e2a856b6560d1c73ca907","branch":"refs/heads/feature/wpf-product-and-differentiated-feature-parity","head":"013dd466ef9eb62021f7054e07926b0100e05d0c","baseRef":"refs/heads/main","baseCommit":"013dd466ef9eb62021f7054e07926b0100e05d0c","sourceTree":"c75ba53c966995a0da5c6fd292e211d01705b906","absentOptional":[]} -->
