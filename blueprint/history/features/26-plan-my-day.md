# Feature: Plan My Day

**From build-plan:** feature 26
**Build attempt:** 1
**Branch:** feature/plan-my-day
**Status:** verified

## Goal

Add local web Plan My Day capability enabling users to enter their available time, receive transparent capacity-aware recommendations across tasks and due follow-ups with clear selection rationale, customize and accept a focused daily plan, execute their daily shortlist with live progress tracking, and safely preserve backlog integrity without silent rescheduling of unfinished work.

## In scope

- Data layer and schema upgrades:
  - Upgrade IndexedDB schema to version 6 in `lib/db.ts` with new `daily_plans` object store indexed by `date` and `updatedAt`.
  - Add optional `estimatedMinutes` (positive integer from 1 to 1440, or null) to `Task` in `types/task.ts` and validate it in `lib/validation.ts`.
  - Create TypeScript models in `types/plan.ts` for `DailyPlan`, `DailyPlanItem`, `PlanRecommendation`, and related options.
  - Implement CRUD helpers and plan retrieval in `lib/plans.ts` with full unit test coverage in `lib/plans.test.ts`.
- Capacity-aware recommendation engine:
  - Implement deterministic local scoring and capacity selection engine in `lib/plan-engine.ts`.
  - Evaluate incomplete tasks and due/overdue follow-ups against user-supplied available time.
  - Produce transparent, human-readable explanations for each recommendation (e.g. "Overdue by 2 days", "Due today with high priority", "Quick win fitting remaining time", "Unfinished from previous plan").
  - Greedy/knapsack capacity fitting prioritizing urgent and high-priority commitments while keeping total estimated minutes within available capacity.
  - Comprehensive unit tests in `lib/plan-engine.test.ts` covering edge cases, empty backlogs, overdue items, zero/custom estimates, and capacity overflow.
- User interface and navigation:
  - Create dedicated `/plan` route (`app/plan/page.tsx`) and components in `components/plan/`:
    - Available-time selector with quick presets (1h, 2h, 4h, 8h) and custom minute entry.
    - Capacity summary bar displaying planned vs available time and visual utilization indicator.
    - Recommendation review view with reasons, include/exclude toggles, reordering, and estimate adjustments.
    - Backlog drawer to manually search and add other tasks or follow-ups to the plan.
    - Execution view for accepted plans with item completion checkboxes that synchronize state to underlying tasks and follow-ups.
    - Safe handling of unfinished work: yesterday's plan remains immutable history, and unfinished items are cleanly surfaced for today's review without modifying backlog due dates or priorities.
  - Add optional effort estimate input field (minutes) to task creation and editing (`components/tasks/TaskEditForm.tsx` and quick task inputs).
  - Add Plan navigation link to `components/app/AppHeader.tsx`, `components/app/MobileNavBar.tsx`, and add route to `app/sitemap.ts`.
- Integration:
  - Update `lib/backup.ts` to export and restore `daily_plans` with schema validation and test coverage.
  - Link calendar day view (`components/calendar/CalendarScreen.tsx` and `DayInspector.tsx`) to daily plans.

## Out of scope

- External cloud AI APIs or non-deterministic recommendation services (all algorithms run strictly local and deterministic in the browser).
- Automatic rescheduling or moving of task due dates when a day finishes without completing items.
- Cloud account synchronization of daily plans (scheduled for Milestone J / Feature 32).
- Native mobile or Windows platform integrations (Milestone J and later).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. **IndexedDB v6 schema, DailyPlan data layer, and Task effort estimation** - Upgrade `lib/db.ts` to DB_VERSION 6 with `daily_plans` store, create `types/plan.ts`, update `types/task.ts` and `lib/validation.ts` with optional `estimatedMinutes`, implement repository operations in `lib/plans.ts`, and add unit tests in `lib/plans.test.ts`, `lib/db.test.ts`, and `lib/validation.test.ts`.
  **Done when:** `npm run test` passes with verified store creation, migration handling, task effort validation, and daily plan CRUD queries.
- [x] 2. **Capacity recommendation engine with explainable rationale** - Build pure recommendation algorithm in `lib/plan-engine.ts` that prioritizes overdue items, due-today tasks, and due follow-ups within available time, generating human-readable reasons, with full test coverage in `lib/plan-engine.test.ts`.
  **Done when:** Unit tests pass verifying deterministic recommendation scoring, capacity constraints, explanation strings, and edge cases.
- [x] 3. **Plan My Day interface, Task form integration, and navigation** - Build `/plan` route and components in `components/plan/` (available time input, capacity meter, recommendation review, backlog selection drawer, accepted plan execution view), update `TaskEditForm.tsx` with effort estimate input, and update `AppHeader.tsx`, `MobileNavBar.tsx`, and `app/sitemap.ts`.
  **Done when:** Navigating to `/plan` lets users configure available time, review suggestions with rationale, adjust estimates, accept the plan, and check off items, with desktop and mobile responsive clearance.
- [x] 4. **Backup export/restore, calendar link, and quality gates verification** - Update `lib/backup.ts` to export and restore `daily_plans` with schema validation, add daily plan indicator in `DayInspector.tsx`, and run all quality checks (`npm run test`, `npm run lint`, `npm run build`).
  **Done when:** Backup JSON round-trips daily plans, calendar links to daily plans, and all automated tests, lint, and Next.js production builds exit code 0.

## Files / areas

- `types/plan.ts` - core interfaces for DailyPlan, DailyPlanItem, PlanRecommendation, and options.
- `types/task.ts` - add optional `estimatedMinutes?: number | null`.
- `lib/db.ts` - upgrade to DB_VERSION 6, create `daily_plans` store.
- `lib/validation.ts` - validate `estimatedMinutes` on task input and update.
- `lib/plans.ts` - repository data layer for saving, loading, and querying daily plans.
- `lib/plan-engine.ts` - recommendation algorithm and capacity budgeting.
- `app/plan/page.tsx` - Plan My Day page route.
- `components/plan/*` - PlanScreen, AvailableTimeInput, CapacitySummary, PlanItemList, PlanBacklogDrawer.
- `components/tasks/TaskEditForm.tsx` - estimated minutes input field.
- `components/app/AppHeader.tsx` & `components/app/MobileNavBar.tsx` - navigation links.
- `components/calendar/DayInspector.tsx` - day drawer link to daily plan.
- `lib/backup.ts` - export and restore support for daily plans.
- `app/sitemap.ts` - sitemap inclusion.
- `lib/*.test.ts` - unit tests for plans, recommendation engine, backup, and validation.

## Data / contracts

- `Task`:
  - existing fields plus optional `estimatedMinutes`: number | null (1 to 1440).
- `DailyPlanItem`:
  - `id`: string (UUID).
  - `type`: "task" | "followup".
  - `targetId`: string (reference to task id or followup id).
  - `title`: string (snapshot of title/commitment for display).
  - `estimatedMinutes`: number (positive integer, default 30 for task without estimate, 15 for followup).
  - `completed`: boolean.
  - `recommendationReason`: string | null.
  - `order`: number.
- `DailyPlan`:
  - `id`: string (UUID).
  - `date`: string (local calendar date format `YYYY-MM-DD`).
  - `timeZone`: string (e.g. "UTC" or IANA time zone identifier).
  - `availableMinutes`: number (positive integer, e.g. 60, 120, 240, 480).
  - `items`: DailyPlanItem[].
  - `acceptedAt`: string | null (RFC 3339 UTC string).
  - `createdAt`: string (RFC 3339 UTC string).
  - `updatedAt`: string (RFC 3339 UTC string).

## Testing

- Unit tests in `lib/plans.test.ts` for IndexedDB v6 daily plan persistence and retrieval by date.
- Unit tests in `lib/plan-engine.test.ts` for capacity calculations, priority/overdue weighting, and explanation generation.
- Unit tests in `lib/validation.test.ts` for task effort estimate boundary and integer checks.
- Unit tests in `lib/backup.test.ts` for backup export and restore round-tripping daily plans.
- Regression suite passing: `npm run test`, `npm run lint`, `npm run build`.

## Notes for the AI

- Writing style: zero em dashes (—), en dashes (–), or ellipsis characters.
- Keep components focused and extract reusable hooks.
- Handle responsive clearance: use `pb-24 sm:pb-20` on page containers so cards never collide with mobile tab bar or desktop fixed footer dock.
- Maintain backlog safety: accepting or modifying a plan never alters original task due dates, priorities, or completion status unless an item is explicitly marked completed.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8916,"specSha256":"52f37f1bf576e634fb31261cb89c38f276cabb854bd32cf17d064927a3207fe6","branch":"refs/heads/feature/plan-my-day","head":"728e33bafdde1857790c352fa2e39df60bd2b854","baseRef":"refs/heads/main","baseCommit":"728e33bafdde1857790c352fa2e39df60bd2b854","sourceTree":"7cb570d1ba2d4e05e7874908b58d0e762e1cb1ce","absentOptional":[]} -->
