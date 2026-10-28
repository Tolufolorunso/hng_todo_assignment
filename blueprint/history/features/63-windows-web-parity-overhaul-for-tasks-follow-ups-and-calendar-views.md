# Feature: Windows Web Parity Overhaul for Tasks, Follow Ups, and Calendar Views

**From build-plan:** feature 63
**Build attempt:** 1
**Branch:** feature/windows-web-parity-overhaul-for-tasks-follow-ups-and-calendar-views
**Status:** verified

## Goal

Bring the Windows desktop application to visual and functional parity with the Next.js web application (`apps/web`) by overhauling Tasks, Follow Ups, and Calendar views to match the authoritative reference images in `websample/`. This includes restructuring Tasks into the 2-column Workspace layout with collapsible WYSIWYG quick-add and Today/KPI sidebar; redesigning Follow Ups with top action headers, filter tabs, action toolbars, and centered create modal; and refactoring Calendar into the 2-column layout with a Monday-first grid and Today schedule drawer.

## Design reference

- `websample/task page.png` and `websample/task page with add detail option opened.png`: Authoritative 2-column layout for Tasks / Workspace (collapsible Quick Add with full WYSIWYG editor, search/filter rows, category pills, right Today overview, 2x2 KPI grid, category distribution, and productivity tip).
- `websample/followup page.png` and `websample/create followup.png`: Authoritative layout for Follow Ups (header with "+ New Follow Up" button, left filter tabs with counts, right search input, action icon toolbars on cards, and centered New Follow Up modal dialog with required field asterisks).
- `websample/calender.png`: Authoritative 2-column layout for Calendar & Schedule (Monday-first 7-column header `MON` through `SUN`, purple today badge, colored event chips, right Today card with inline quick-add, tasks for this day agenda, and unscheduled tasks drawer).

## In scope

- Rebuild `TasksView.xaml` into a 2-column Workspace grid (`2*` left / `1*` right):
  - Left column: "Workspace" header with subtitle and "+ Plan My Day" button; Quick Add Task card with single-line input, category pill tags, and collapsible "+ Add Details" / "Hide Details" section containing Priority selector, Due Date picker, Estimate input, and full `WysiwygEditorControl`; Search input with status pills ([All], [Active], [Completed]), sort selector ([Sort: Custom]), and Category pills row ([All], [Work], [Personal], [Urgent], [Study], [Ideas]); task cards with checkboxes, rich text preview, pills, reordering arrows, and action buttons.
  - Right column: "TODAY" card with day/date display, remaining count, and completion progress bar; 2x2 KPI cards (Active, Completed, Total Tasks, Overdue); Categories distribution breakdown; and Quick Productivity Tip card.
  - Update `TasksViewModel.cs` to support collapsible quick-add details, quick-add task creation with formatted rich text, and live sidebar metrics calculation.
- Rebuild `FollowUpsView.xaml`:
  - Header: "Follow Ups" with subtitle and top-right "+ New Follow Up" accent button.
  - Filter and Search bar: Left status filter tabs ([All (N)], [Due & Overdue], [Upcoming (N)], [Completed (N)]) and right search box.
  - Card layout: Checkbox, bold contact name, commitment title and details, clock icon with formatted due date, launcher buttons (`[Email]`, `[WhatsApp]`, `[Call]`), and top-right action icon toolbar (history, calendar, snooze, edit, delete).
  - Modal: Centered "New Follow Up" modal dialog matching `create followup.png` with required field asterisks, communication launcher card, and recurring commitment toggle.
  - Update `FollowUpsViewModel.cs` with filter counts and modal state handling.
- Rebuild `CalendarView.xaml` into a 2-column grid (`2*` left / `1*` right):
  - Header: "Calendar & Schedule" with subtitle and "+ Manage Tasks" button.
  - Left column: Month navigation card ("October 2026", `[Today]`, `<` `>` arrows), 7-column Monday-first weekday header (`MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`, `SUN`), 42-day cells with purple today border/badge, and colored event chips.
  - Right column: "TODAY" card with date, remaining count, `[Plan My Day]` button, inline `[Add task for this day...] [Add]` form, "TASKS FOR THIS DAY" agenda, and "UNSCHEDULED TASKS" drawer.
  - Update `CalendarViewModel.cs` with Monday-first ISO offset calculation, inline task creation for selected date, and unscheduled count tracking.
- Add automated regression tests in `apps/windows/TaskFlow.Tests` covering all three overhauled view models.

## Out of scope

- Changes to `apps/web` or `apps/mobile`.
- Database schema changes, server route modifications, or synchronization protocol changes.
- Unrelated secondary views (Notes, Plan My Day, Inbox, Analytics, Backup, Account remain on their stabilized foundations).

## Build loop

- Step review: feature (review after completing all steps).
- Checkpoint commits: disabled (work progresses locally on the branch).
- Final gate: verify with `dotnet test apps/windows/TaskFlow.Tests` and `npm run check:boundaries`.

## Build steps

1. - [x] **Tasks / Workspace 2-column layout and collapsible Quick Add details with WYSIWYG**
     - Update `TasksViewModel.cs` with `QuickAddTitle`, `IsQuickAddDetailsOpen`, `QuickAddPriority`, `QuickAddCategory`, `QuickAddDueDate`, `QuickAddEstimatedMinutes`, `QuickAddDescription`, `ToggleQuickAddDetailsCommand`, `SubmitQuickAddCommand`, and live metrics properties (`TodayDisplay`, `RemainingTodaySummary`, `CompletionPercent`, `ActiveCount`, `CompletedCount`, `TotalCount`, `OverdueCount`, and category counts).
     - Rebuild `TasksView.xaml` with 2-column layout (`2*` / `1*`): left column holds "Workspace" header, Quick Add card with collapsible WYSIWYG details, Search/Filter pills bar, and card list; right column holds "TODAY" card with progress bar, 2x2 KPI cards, category breakdown, and tip card.
     - *Done when:* Tasks screen matches `websample/task page.png` and `websample/task page with add detail option opened.png`, allowing quick task creation with full WYSIWYG formatting and reflecting live metrics in the right sidebar.

2. - [x] **Follow Ups layout overhaul, action toolbar cards, and centered New Follow Up modal**
     - Update `FollowUpsViewModel.cs` to expose filtered category counts ([All (N)], [Upcoming (N)], [Completed (N)]), search query handling, and modal field bindings.
     - Rebuild `FollowUpsView.xaml` to feature top header with "+ New Follow Up" button, left-aligned filter tabs with count badges, right search box, card action toolbar (history, calendar, snooze, edit, delete), and centered "New Follow Up" modal dialog matching `websample/create followup.png` with required field asterisks, launcher inputs, and recurring commitment toggle.
     - *Done when:* Follow Ups matches `websample/followup page.png` and clicking "+ New Follow Up" opens the centered modal dialog matching `websample/create followup.png`.

3. - [x] **Calendar & Schedule 2-column layout, Monday-first grid, and Today schedule drawer**
     - Update `CalendarViewModel.cs` to calculate start offset using Monday-first ISO rules (`((int)firstDayOfMonth.DayOfWeek + 6) % 7`), add `NewTaskTitle` and `AddTaskForSelectedDateCommand` for inline quick-add, and compute unscheduled tasks count.
     - Rebuild `CalendarView.xaml` into 2 columns: left column holds "Calendar & Schedule" header, month navigation bar, Monday-first weekday header (`MON` through `SUN`), and 42-day cells with purple today highlight and event chips; right column holds "TODAY" card with inline quick-add, "TASKS FOR THIS DAY" agenda, and "UNSCHEDULED TASKS" drawer.
     - *Done when:* Calendar matches `websample/calender.png` with Monday-first columns, purple today ring/badge, right-side inline task addition, and scheduled item agenda.

4. - [x] **Add automated regression tests and verify full suite**
     - Add unit tests in `apps/windows/TaskFlow.Tests/` asserting:
       - `TasksViewModel` quick add details toggling, task creation, and sidebar metrics calculations.
       - `FollowUpsViewModel` filter count bindings, search, and modal lifecycle.
       - `CalendarViewModel` Monday-first offset calculation, inline task addition, and unscheduled count.
     - Execute `dotnet test apps/windows/TaskFlow.Tests` and `npm run check:boundaries`.
     - *Done when:* All Windows unit tests pass with zero failures and the boundary check reports zero cross-application imports.

## Files / areas

- `apps/windows/TaskFlow/ViewModels/TasksViewModel.cs`: Quick Add properties, details toggle, sidebar metrics calculation.
- `apps/windows/TaskFlow/Views/TasksView.xaml`: 2-column Workspace layout, Quick Add with WYSIWYG details, Today/KPI sidebar.
- `apps/windows/TaskFlow/ViewModels/FollowUpsViewModel.cs`: Filter counts, search, modal bindings.
- `apps/windows/TaskFlow/Views/FollowUpsView.xaml`: Header with "+ New Follow Up", filter bar, action toolbar cards, centered modal.
- `apps/windows/TaskFlow/ViewModels/CalendarViewModel.cs`: Monday-first offset, inline quick-add, unscheduled count.
- `apps/windows/TaskFlow/Views/CalendarView.xaml`: 2-column Calendar layout, Monday-first grid, Today schedule drawer.
- `apps/windows/TaskFlow.Tests/ParityViewsTests.cs`: New test cases for Tasks, Follow Ups, and Calendar web parity.

## Data / contracts

- Zero schema, entity, or API contract modifications.
- Preserves offline SQLite storage and existing models (`TaskItem`, `FollowUpItem`).

## Testing

- Unit tests: `dotnet test apps/windows/TaskFlow.Tests` covering view models, navigation, quick-add, and calendar calculations.
- Boundary verification: `npm run check:boundaries`.

## Notes for the AI

- Always reference `websample/task page.png`, `websample/task page with add detail option opened.png`, `websample/followup page.png`, `websample/create followup.png`, and `websample/calender.png` to avoid visual hallucinations.
- Maintain monorepo isolation: zero imports from `apps/web` or `apps/mobile`.
- No em dashes in code comments or commit messages.

