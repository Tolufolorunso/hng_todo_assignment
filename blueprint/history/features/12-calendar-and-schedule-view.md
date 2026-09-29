# Feature: Calendar and schedule view (/calendar)

**From build-plan:** feature 12
**Build attempt:** 1
**Branch:** feature/calendar-and-schedule-view
**Status:** verified

## Goal

Provide users with an interactive, responsive monthly calendar and schedule view at `/calendar`. Tasks with due dates are mapped to day cells on a calendar grid with priority and category indicators, overdue alerts, and today highlights. Users can navigate months, inspect tasks for any selected date in a dedicated detail panel, toggle task completion directly from the calendar, quickly schedule new tasks for a selected day, and review unscheduled tasks.

## Design reference

Modern productivity suite schedule views (Linear, Notion, and Cron / Notion Calendar style):
- 7-column monthly grid layout with weekday headers (Mon, Tue, Wed, Thu, Fri, Sat, Sun).
- Month navigation header:
  - Month and Year heading (e.g. "October 2026").
  - Previous Month, Next Month icon buttons.
  - "Today" quick-jump button.
- Day cell visual hierarchy:
  - Day number in top-right with accent ring when today.
  - Overdue warning indicator if the cell date is past today and has incomplete tasks.
  - Up to 3 task pill chips per cell displaying category dot, task title, and completion strike-through.
  - "+N more" pill badge when a day has more tasks than can fit cleanly in the cell.
  - Muted opacity for padding days outside the currently viewed month.
  - Focused / selected ring when a cell is clicked.
- Day detail inspector (right column / side panel):
  - Displays selected date header and full task list for that date.
  - Direct completion toggle checkboxes, priority badges, category pills.
  - Quick inline task creation pre-scheduled for the selected date.
  - Reschedule action to assign or shift due dates.
- Unscheduled tasks section:
  - Collapsible list showing backlog tasks without a due date, with quick-schedule action.

## In scope

1. **Calendar calculation logic (`lib/calendar.ts`, `lib/calendar.test.ts`):**
   - Pure functions to generate calendar grid days (leading padding days, current month days, trailing padding days to fill complete 7-day weeks).
   - Functions to group tasks by due date (`isoDate` keys) and collect unscheduled tasks (`dueDate === null`).
   - Month navigation helpers (`getPrevMonth`, `getNextMonth`, `formatMonthYear`).
   - Comprehensive unit tests covering leap years, month boundaries, weekday alignment, and task grouping.
2. **Calendar grid component (`components/calendar/CalendarGrid.tsx`):**
   - 7-column monthly grid with accessible ARIA grid roles.
   - Visual styling for current month, past/overdue dates, today, and selected date.
   - Task chips per day with category and priority visual styling.
3. **Day inspector & unscheduled tasks (`components/calendar/DayInspector.tsx`):**
   - Interactive panel showing all tasks for the selected date.
   - Task completion toggling, quick inline task addition for that date, and rescheduling.
   - Unscheduled tasks list drawer allowing users to schedule unassigned tasks.
4. **Calendar screen page integration (`components/calendar/CalendarScreen.tsx`, `app/calendar/page.tsx`):**
   - Full client screen with month state, task data loading from IndexedDB via `listTasks()`.
   - Real-time updates on task toggle, create, and reschedule.
   - Responsive widescreen desktop workspace layout (`max-w-6xl`) matching Milestone E aesthetics.

## Out of scope

- External calendar sync (Google Calendar, iCal, Outlook).
- Week-view and day-timeline hour-by-hour scheduling (the build plan specifically mandates the interactive monthly schedule view).
- Analytics metrics page (Feature 13).
- Data backup and restore (Feature 14).

## Build loop

- Step review mode: feature
- Checkpoint commits: disabled

## Build steps

1. [x] **Implement calendar calculation logic in `lib/calendar.ts` and tests in `lib/calendar.test.ts`**
   - Implement `getCalendarDays`, `groupTasksByDate`, `formatMonthYear`, `getPrevMonth`, and `getNextMonth`.
   - Add unit tests verifying 35 or 42 grid cell generation, correct day offsets, task date mapping, and date boundaries.
   - Done when: `npm run test` passes with full test coverage for calendar logic.

2. [x] **Create interactive `CalendarGrid.tsx` component**
   - Build 7-column grid with weekday headers, day cells, today highlight, overdue badges, task chips, and "+N more" pills.
   - Add keyboard accessibility and click handlers to select any date cell.
   - Done when: Calendar grid cleanly renders the days of any month with task badges and highlights.

3. [x] **Build `DayInspector.tsx` for selected date inspection and quick scheduling**
   - Create inspection card showing selected day tasks, completion checkboxes, category/priority badges, and inline task creator.
   - Include collapsible section for unscheduled tasks with quick-assign buttons.
   - Done when: Clicking a date in the grid displays its tasks in the inspector and allows toggling and adding tasks.

4. [x] **Assemble `CalendarScreen.tsx` and integrate into `app/calendar/page.tsx`**
   - Build main client screen connecting `listTasks`, month navigation controls, and task mutations (`updateTask`, `createTask`).
   - Replace placeholder in `app/calendar/page.tsx` with full interactive `CalendarScreen`.
   - Done when: Navigating to `/calendar` renders the interactive calendar workspace with live IndexedDB task data.

5. [x] **Run full verification suite**
   - Execute `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero linter warnings, and production Next.js build compiles with no errors.

## Files / areas

- `lib/calendar.ts`
- `lib/calendar.test.ts`
- `components/calendar/CalendarGrid.tsx`
- `components/calendar/DayInspector.tsx`
- `components/calendar/CalendarScreen.tsx`
- `app/calendar/page.tsx`

## Data / contracts

- `CalendarDay`:
  ```typescript
  interface CalendarDay {
    isoDate: string; // YYYY-MM-DD
    dayOfMonth: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
  }
  ```
- Task mapping:
  ```typescript
  interface CalendarTasks {
    byDate: Record<string, Task[]>;
    unscheduled: Task[];
  }
  ```
- No changes to existing IndexedDB schema or Task types required (uses existing `dueDate` field).

## Testing

- Unit tests (`npm run test`):
  - Month day generation across different months (e.g. February non-leap and leap year, 30-day and 31-day months).
  - Proper grouping of tasks by date and identification of unscheduled tasks.
  - Month navigation calculation.
- Linter (`npm run lint`): ESLint with zero warnings.
- Production build (`npm run build`): Next.js 16 App Router build succeeds with zero type errors.

## Notes for the AI

- Use proportional engineering: vanilla TypeScript date math without heavy external calendar dependencies like moment, date-fns, or fullcalendar.
- Zero em dashes in comments, documentation, or UI text.
- Full keyboard and screen reader accessibility on calendar grid elements.

## Open questions

None.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7058,"specSha256":"cdb100afbff1d015ff3cd47523e7c6000a0090e9147142f834a838a90f105a80","branch":"refs/heads/feature/calendar-and-schedule-view","head":"64868e7e37af033ee0b086914e88330c197e6fb0","baseRef":"refs/heads/main","baseCommit":"64868e7e37af033ee0b086914e88330c197e6fb0","sourceTree":"a3dd565df30244b3c314a832ba74552bbc6073d2","absentOptional":[]} -->
