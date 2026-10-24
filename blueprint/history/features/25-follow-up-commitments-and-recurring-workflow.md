# Feature: Follow Up commitments and recurring workflow

**From build-plan:** feature 25
**Build attempt:** 1
**Branch:** feature/follow-up-commitments-and-recurring-workflow
**Status:** verified

## Goal

Add local web Follow Up commitments enabling users to track commitments to people, schedule calendar-anchored and completion-relative recurrences, record completion history, manage snooze and scoped rescheduling, receive in-app overdue reminders, and trigger validated communication launchers (email, WhatsApp, phone) with zero server dependencies.

## In scope

- Data layer and IndexedDB schema upgrade:
  - Upgrade IndexedDB schema to version 5 in `lib/db.ts` with `followups` and `followup_occurrences` object stores and necessary indexes (`dueAt`, `status`, `updatedAt`, `followUpId`).
  - Create TypeScript types in `types/followup.ts` for `FollowUp`, `RecurrenceRule`, `FollowUpOccurrence`, `PreferredAction`, `RecurrenceMode`, and `OccurrenceOutcome`.
  - Implement full local CRUD operations and query helpers in `lib/followups.ts`.
- Recurrence calculation and scheduling engine:
  - Implement `lib/recurrence.ts` supporting both `calendarAnchored` (preserves fixed calendar slot across late completion and daylight saving) and `completionRelative` (calculates next due time from actual completion date).
  - Implement snoozing for the active occurrence (1 hour, tomorrow, next week, or custom date/time) without modifying future series schedule.
  - Implement scoped rescheduling with explicit choice between rescheduling only the current occurrence or the whole recurrence series.
  - Implement skip logic that records a skipped occurrence and advances to the next calculated occurrence.
- Communication launchers:
  - Implement `lib/launchers.ts` with URI generators and validators for `mailto:`, `https://wa.me/`, and `tel:`.
  - Ensure opening a launcher never automatically completes or deletes a commitment.
- User interface and navigation:
  - Create dedicated `/followups` page (`app/followups/page.tsx`) and components in `components/followups/`:
    - Commitment creation and editing modal with contact targets, preferred action selector, date-time picker, and structured recurrence options.
    - Card view displaying person, commitment, details, formatted due date, overdue badges, launcher action button, and action menus.
    - Snooze dropdown and reschedule modal.
    - Occurrence history log per follow-up.
    - Empty, loading, and filtered views (All, Due & Overdue, Upcoming, Completed).
  - Update `components/app/AppHeader.tsx` and `components/app/MobileNavBar.tsx` to add Follow Ups navigation and an in-app badge showing due/overdue follow-ups count.
  - Update `app/sitemap.ts` to include `/followups`.
- Integration:
  - Integrate follow-up commitments into JSON backup and restore (`lib/backup.ts`) with schema validation and test coverage.
  - Map due follow-ups into the monthly calendar view (`components/calendar/CalendarScreen.tsx`).

## Out of scope

- Closed-app Web Push background dispatch or service worker push subscriptions (scheduled for Feature 36 after account infrastructure).
- React Native or Windows native implementations (Milestone J and later).
- Autonomous background message sending or message delivery confirmation.
- Shared contacts, team assignments, or CRM address books.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. **IndexedDB v5 schema and FollowUp data layer** - Upgrade `lib/db.ts` to DB_VERSION 5, create `types/followup.ts`, implement repository CRUD and occurrence history helpers in `lib/followups.ts`, and add comprehensive unit tests in `lib/followups.test.ts`.
  **Done when:** `npm run test` passes with new tests verifying store creation, schema migrations, and CRUD operations for follow-ups and occurrences.
- [x] 2. **Recurrence engine, snooze, rescheduling, and communication launchers** - Implement `lib/recurrence.ts` (calendar-anchored vs completion-relative calculation, snooze, single vs series rescheduling, skipping) and `lib/launchers.ts` (URI encoding and formatting for mailto, WhatsApp, and tel), covered by unit tests in `lib/recurrence.test.ts` and `lib/launchers.test.ts`.
  **Done when:** All recurrence calculations and launcher URI generation tests pass with edge-case coverage including month boundaries and custom intervals.
- [x] 3. **Follow Ups workspace and navigation integration** - Build `app/followups/page.tsx`, `components/followups/FollowUpsScreen.tsx`, creation/edit modals, action launcher buttons, snooze/reschedule menus, and occurrence history views. Add Follow Ups to `AppHeader.tsx`, `MobileNavBar.tsx`, and `app/sitemap.ts`.
  **Done when:** Navigating to `/followups` allows creating, viewing, completing, snoozing, and rescheduling follow-ups with responsive mobile/desktop clearance and active due badge in the header.
- [x] 4. **Calendar mapping, backup integration, and quality verification** - Add follow-ups to `components/calendar/CalendarScreen.tsx` due-date indicators, update `lib/backup.ts` to export and restore follow-ups and occurrences with schema validation, and verify all automated quality gates (`npm run test`, `npm run lint`, `npm run build`).
  **Done when:** Calendar displays due follow-ups, backup JSON round-trips follow-up stores, and all tests, lint checks, and Next.js production builds exit code 0.

## Files / areas

- `types/followup.ts` - core interfaces for FollowUp, RecurrenceRule, FollowUpOccurrence, and enums.
- `lib/db.ts` - upgrade to DB_VERSION 5, create `followups` and `followup_occurrences` stores.
- `lib/followups.ts` - typed data layer repository for follow-ups and occurrence history.
- `lib/recurrence.ts` - pure recurrence calculation, snooze, and rescheduling logic.
- `lib/launchers.ts` - validated URI builders for email, WhatsApp, and phone.
- `app/followups/page.tsx` - Follow Ups route.
- `components/followups/*` - FollowUpsScreen, FollowUpCard, FollowUpModal, RescheduleModal.
- `components/app/AppHeader.tsx` & `components/app/MobileNavBar.tsx` - navigation link and due-items badge.
- `components/calendar/CalendarScreen.tsx` - display due follow-ups on calendar day cells.
- `lib/backup.ts` - backup export/restore support for followups and occurrences.
- `app/sitemap.ts` - sitemap inclusion.
- `lib/*.test.ts` - unit tests for followups, recurrence, launchers, and backup.

## Data / contracts

- `FollowUp`:
  - `id`: string (UUID or timestamp-random string).
  - `personName`: string (1 to 200 chars).
  - `commitment`: string (1 to 500 chars).
  - `details`: string | null.
  - `dueAt`: RFC 3339 UTC string.
  - `timeZone`: string (e.g. "UTC" or IANA identifier).
  - `emailAddress`, `phoneNumber`, `whatsAppNumber`: string | null.
  - `preferredAction`: "email" | "whatsapp" | "phone" | null.
  - `recurrence`: RecurrenceRule | null.
  - `status`: "open" | "completed" | "archived".
  - `sourceNoteId`, `sourceExcerpt`: string | null.
  - `createdAt`, `updatedAt`: RFC 3339 UTC string.
- `FollowUpOccurrence`:
  - `id`: string.
  - `followUpId`: string.
  - `dueAt`: RFC 3339 UTC string.
  - `outcome`: "completed" | "skipped" | "missed" | "unresolved".
  - `resolvedAt`: RFC 3339 UTC string | null.
  - `nextDueAt`: RFC 3339 UTC string | null.
  - `notes`: string | null.

## Testing

- Unit tests in `lib/followups.test.ts` for database operations and store migrations.
- Unit tests in `lib/recurrence.test.ts` for calendar-anchored and completion-relative algorithms.
- Unit tests in `lib/launchers.test.ts` for URI formatting and security encoding.
- Unit tests in `lib/backup.test.ts` for export/restore round-trip with followups.
- Automated gate: `npm run test`, `npm run lint`, `npm run build`.

## Notes for the AI

- Writing style: zero em dashes (—), en dashes (–), or ellipsis characters.
- Keep components focused and extract reusable hooks.
- Handle responsive clearance: use `pb-24 sm:pb-20` on page containers so cards never collide with mobile tab bar or desktop fixed footer dock.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8252,"specSha256":"d56a9a4d8f15a7a0dffb2f0291141450f1db6f836ff91b9f6dc81b837cfa2d59","branch":"refs/heads/feature/follow-up-commitments-and-recurring-workflow","head":"a33ce1bc86773c1a62a68dcc5cd5958ea97e3f80","baseRef":"refs/heads/main","baseCommit":"a33ce1bc86773c1a62a68dcc5cd5958ea97e3f80","sourceTree":"03a40236343f3392cd8d7c25facb834a3b596006","absentOptional":[]} -->
