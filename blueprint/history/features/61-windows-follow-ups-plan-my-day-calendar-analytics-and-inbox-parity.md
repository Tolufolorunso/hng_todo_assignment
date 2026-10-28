# Feature: Windows Follow Ups, Plan My Day, Calendar, Analytics, and Inbox parity

**From build-plan:** feature 61
**Build attempt:** 1
**Status:** verified
**Branch:** feature/windows-follow-ups-plan-my-day-calendar-analytics-and-inbox-parity

## Goal

Bring the remaining Windows desktop secondary views (`FollowUpsView`, `PlanMyDayView`, `CalendarView`, `AnalyticsView`, and `InboxView`) to visual and functional parity with the Next.js web application (`apps/web`). This completes Milestone Q by providing contact initials avatar cards, branded launchers (Email, WhatsApp, Phone), and occurrence management in Follow Ups; a visual capacity budgeting meter and explained recommendation cards in Plan My Day; a structured month calendar grid with day agenda inspector; metric KPI cards and distribution progress bars in Analytics; and quick capture triage in Inbox, all while preserving the native Windows desktop header and left sidebar navigation shell.

## Design reference

- **Follow Ups parity:** Matches `apps/web/components/followups/FollowUpCard.tsx` and `FollowUpsScreen.tsx`. Circular contact initials avatar badge, overdue pulse indicator, recurrence frequency pill, communication launchers (Email, WhatsApp, Phone) with highlighted preferred action, source note backlink quote, snooze (+24h), reschedule, and occurrence completion/history tracking.
- **Plan My Day parity:** Matches `apps/web/components/plan/CapacitySummary.tsx` and `PlanItemCard.tsx`. Visual capacity budgeting progress bar with under/over-capacity color indicator, preset buttons (1h, 2h, 4h, 8h), custom minutes input, and recommendation cards showing entity type pills, duration badges, and reason tags (e.g. "Due today", "Overdue high priority", "Follow-up commitment").
- **Calendar parity:** Matches `apps/web/components/calendar/CalendarGrid.tsx` and `DayInspector.tsx`. 7-column day-of-week header, 42-day cells with today ring/badge, separate Blue (tasks) and Amber (follow-ups) count badges, and an interactive day agenda panel displaying scheduled items with completion checkboxes.
- **Analytics parity:** Matches `apps/web/components/analytics/AnalyticsCards.tsx` and `AnalyticsScreen.tsx`. 4 KPI cards (Completion Rate, Total Tasks, Overdue Tasks, Open Follow-Ups), task priority progress bars (High in Rose, Medium in Amber, Low in Blue), category distribution, and entity volume breakdown.
- **Inbox parity:** Matches `apps/web/components/inbox/FastCaptureModal.tsx` and `InboxScreen.tsx`. Fast capture header box with automatic URL detection, state filter tabs (Pending, Processed, All), capture cards with clickable URL launchers, and 1-click triage actions (-> Task, -> Note, -> Follow-Up, Discard).

## In scope

1. **Follow Ups view overhaul (`FollowUpsView.xaml`, `FollowUpsViewModel.cs`):**
   - Create `FollowUpItemViewModel` with computed `Initials` (e.g. "Alex Johnson" -> "AJ"), `IsOverdue`, `FormattedDueAt`, `RecurrenceLabel`, launcher availability (`HasEmail`, `HasPhone`, `HasWhatsApp`), and source note backlink quote.
   - Update `FollowUpsViewModel` to support occurrence history inspection (`ListOccurrencesAsync`), reschedule panel, snooze (+24h), and preferred communication action launching via `ILauncherService`.
   - Rebuild `FollowUpsView.xaml` with modern card list, contact avatar circles, status badges, branded launcher buttons (Email, WhatsApp, Phone), occurrence action buttons, and empty state.
2. **Plan My Day view overhaul (`PlanMyDayView.xaml`, `PlanMyDayViewModel.cs`):**
   - Add `CapacityPercent`, `CapacityColorBrush`, `CapacityStatusMessage`, and custom available minutes input to `PlanMyDayViewModel`.
   - Rebuild `PlanMyDayView.xaml` with visual capacity meter bar, preset capacity buttons (60m, 120m, 240m, 480m), custom input, and recommendation cards with entity type pills, estimated minutes, reason explanation badges, completion checkboxes, and move to overflow actions.
3. **Calendar view overhaul (`CalendarView.xaml`, `CalendarViewModel.cs`):**
   - Rebuild `CalendarView.xaml` with a clean 7-column day-of-week header row (Sun through Sat), 42-cell uniform grid with today badge and dual task/follow-up badges, and an interactive Day Agenda panel with scheduled item cards, type pills, and empty states.
   - Update `CalendarViewModel.cs` to allow toggling completion of items directly from the agenda inspector and refreshing dates cleanly.
4. **Analytics view overhaul (`AnalyticsView.xaml`, `AnalyticsViewModel.cs`):**
   - Update `AnalyticsViewModel.cs` to calculate percentage distributions for priority and categories (Work vs Personal).
   - Rebuild `AnalyticsView.xaml` with modern KPI cards using design tokens (`MetricCard` style with colored accents), priority distribution progress bars with explicit percentages, and entity volume metrics.
5. **Inbox view overhaul (`InboxView.xaml`, `InboxViewModel.cs`):**
   - Update `InboxViewModel.cs` to support state filtering (Pending, Processed, All) and streamlined 1-click triage actions.
   - Rebuild `InboxView.xaml` with fast capture header bar, filter tabs, capture cards displaying extracted URLs with launcher buttons, and 1-click conversion buttons (-> Task, -> Note, -> Follow-Up, Discard).
6. **Automated test suite and verification:**
   - Add unit tests in `apps/windows/TaskFlow.Tests/ParityViewsTests.cs` verifying FollowUps, PlanMyDay, Calendar, Analytics, and Inbox view models.
   - Run full `npm run verify` ensuring 0 boundary violations, all unit suites passing, and clean builds.

## Out of scope

- Modifying the native Windows desktop header shell (`SearchInput`, "+ Quick Create", Sync status badge) or sidebar navigation buttons in `MainWindow.xaml`.
- Modifying `apps/web/` or `apps/mobile/` implementations or server database schemas.
- Adding third-party UI libraries or external WPF component suites.
- Background OS push notification registration for desktop (handled by existing local timer/polling).

## Build loop

- Step review: `workflow.stepReview` is `feature`.
- Checkpoint commits: `workflow.checkpointCommits` is `disabled`.
- Final feature commit and squash merge will be handled by `/complete`.

## Build steps

- [x] 1. **Follow Ups parity with contact initials avatar cards, branded launchers, and occurrence management:**
   - Create `apps/windows/TaskFlow/ViewModels/FollowUpItemViewModel.cs` wrapping `FollowUpItem` with `Initials`, `IsOverdue`, `FormattedDueAt`, `RecurrenceLabel`, launcher availability, and note quote.
   - Update `FollowUpsViewModel.cs` to expose `ObservableCollection<FollowUpItemViewModel>`, occurrence history listing, reschedule panel, snooze (+24h), and launcher actions.
   - Rebuild `FollowUpsView.xaml` and `FollowUpsView.xaml.cs` with contact initials circle avatar, branded launcher buttons (Email, WhatsApp, Phone), occurrence controls, status filter tabs, and empty state.
   - *Done when:* Follow ups render with initials avatar cards, branded launchers invoke `ILauncherService`, recurring items support snooze/reschedule/completion, and `dotnet build apps/windows/TaskFlow.sln` succeeds.
- [x] 2. **Plan My Day parity with capacity budgeting meter and explained recommendation cards:**
   - Update `PlanMyDayViewModel.cs` with `CapacityPercent`, `CapacityColorBrush`, `CapacityStatusMessage`, and custom available minutes calculation.
   - Rebuild `PlanMyDayView.xaml` with visual capacity meter bar, preset capacity buttons (1h, 2h, 4h, 8h), and recommendation cards with entity type pills, duration badges, and reason explanation tags.
   - *Done when:* Plan My Day renders a visual capacity meter with under/over-capacity color coding, explains recommendations with reason tags, and supports moving items to/from overflow.
- [x] 3. **Calendar parity with 7-column month grid, today highlights, and day agenda inspector:**
   - Rebuild `CalendarView.xaml` with 7-column day-of-week header row, 42-day cells with today ring/badge, dual blue/amber badges for tasks and follow-ups, and a day agenda inspector showing scheduled items with type pills and completion checkboxes.
   - Update `CalendarViewModel.cs` to support item completion toggle directly from the agenda inspector and clean date navigation.
   - *Done when:* Calendar renders a 7-column month grid with task/followup badges, clicking any date displays its day agenda with interactive items, and empty state renders when no items exist.
- [x] 4. **Analytics parity with KPI cards and distribution progress bars:**
   - Update `AnalyticsViewModel.cs` with priority percentages and category breakdown calculations.
   - Rebuild `AnalyticsView.xaml` with styled KPI cards (Completion Rate, Total Tasks, Overdue Tasks, Open Follow-Ups), priority distribution progress bars with percentage labels, category distribution, and volume breakdown.
   - *Done when:* Analytics renders metric cards with design system tokens and distribution progress bars matching web analytics values.
- [x] 5. **Inbox quick capture triage parity and end-to-end WPF test coverage:**
   - Rebuild `InboxView.xaml` and update `InboxViewModel.cs` with fast capture header input, state filter tabs, capture cards with URL link launcher, and 1-click triage actions (-> Task, -> Note, -> Follow-Up, Discard).
   - Add comprehensive unit tests in `apps/windows/TaskFlow.Tests/ParityViewsTests.cs` covering FollowUpsViewModel, PlanMyDayViewModel, CalendarViewModel, AnalyticsViewModel, and InboxViewModel.
   - Run full `npm run verify` ensuring 0 boundary violations, all unit suites passing, and clean builds.
   - *Done when:* Inbox triages captures into tasks, notes, and follow-ups, `dotnet test apps/windows/TaskFlow.sln` passes all tests, and `npm run verify` exits with code 0.

## Files / areas

- `apps/windows/TaskFlow/ViewModels/FollowUpItemViewModel.cs` (new)
- `apps/windows/TaskFlow/ViewModels/FollowUpsViewModel.cs` (modified)
- `apps/windows/TaskFlow/Views/FollowUpsView.xaml` (modified)
- `apps/windows/TaskFlow/Views/FollowUpsView.xaml.cs` (modified)
- `apps/windows/TaskFlow/ViewModels/PlanMyDayViewModel.cs` (modified)
- `apps/windows/TaskFlow/Views/PlanMyDayView.xaml` (modified)
- `apps/windows/TaskFlow/Views/PlanMyDayView.xaml.cs` (modified)
- `apps/windows/TaskFlow/ViewModels/CalendarViewModel.cs` (modified)
- `apps/windows/TaskFlow/Views/CalendarView.xaml` (modified)
- `apps/windows/TaskFlow/Views/CalendarView.xaml.cs` (modified)
- `apps/windows/TaskFlow/ViewModels/AnalyticsViewModel.cs` (modified)
- `apps/windows/TaskFlow/Views/AnalyticsView.xaml` (modified)
- `apps/windows/TaskFlow/Views/AnalyticsView.xaml.cs` (modified)
- `apps/windows/TaskFlow/ViewModels/InboxViewModel.cs` (modified)
- `apps/windows/TaskFlow/Views/InboxView.xaml` (modified)
- `apps/windows/TaskFlow/Views/InboxView.xaml.cs` (modified)
- `apps/windows/TaskFlow.Tests/ParityViewsTests.cs` (new)

## Data / contracts

- Existing SQLite tables and models (`FollowUpItem`, `FollowUpOccurrenceItem`, `DailyPlanItem`, `PlanItemReference`, `CalendarDayItem`, `InboxCaptureItem`, `TaskItem`, `NoteItem`) remain untouched; no database schema migration is required.
- `FollowUpItemViewModel` derives initials from `PersonName` by splitting whitespace and taking the first letter of each part (e.g. "Alex Johnson" -> "AJ", fallback to "?").
- Branded communication URLs follow standard protocols: `mailto:{email}`, `https://wa.me/{phone}`, `tel:{phone}`, handled via `ILauncherService`.
- `PlanEngine` results map directly to `PlanItemReference` entries containing `Type` ("task" or "followup"), `Title`, `Explanation`, and `EstimatedMinutes`.

## Testing

- Logic unit tests in `apps/windows/TaskFlow.Tests/ParityViewsTests.cs` using xUnit and Moq:
  - FollowUpItemViewModel initials, overdue status, and launcher availability computation.
  - FollowUpsViewModel occurrence completion, snooze, and filter behavior.
  - PlanMyDayViewModel capacity budgeting calculations and item movement.
  - CalendarViewModel month navigation and date item aggregation.
  - AnalyticsViewModel KPI calculations and percentage distributions.
  - InboxViewModel capture creation and triage conversions.
- Full gate: `npm run verify` running boundary checks, mobile typecheck/tests, web lint/tests/build, windows tests, and windows build.

## Notes for the AI

- Do not alter the top header bar (`SearchInput`, "+ Quick Create", Sync status badge) or sidebar navigation buttons in `MainWindow.xaml`.
- No em dashes in generated code, comments, commit messages, or docs.
- Use WPF `[Collection("WpfTests")]` for any test classes instantiating WPF controls to avoid STA thread resource dictionary contention.
- Keep components focused and proportional to existing design tokens in `ModernTheme.xaml`, `ModernCards.xaml`, and `ModernBadges.xaml`.

