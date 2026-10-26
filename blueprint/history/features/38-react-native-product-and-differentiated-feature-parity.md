# Feature: React Native product and differentiated feature parity

**From build-plan:** feature 38
**Build attempt:** 1
**Branch:** feature/react-native-product-and-differentiated-feature-parity
**Status:** verified

## Goal

Implement complete product and differentiated feature parity in `apps/mobile`, adding Follow Up commitments and recurrence, communication launchers, Plan My Day capacity planning, Actionable Notes, Fast Capture Inbox, calendar schedule view, productivity analytics, light and dark themes, local reminder notifications, and adaptive phone and tablet layouts.

## In scope

- SQLite schema migration `002_differentiated_features`:
  - Tables for `followups`, `followup_occurrences`, `daily_plans`, `inbox_captures`, `task_order`, and `preferences`.
  - Add `estimated_minutes`, `source_note_id`, and `source_excerpt` columns to `tasks`.
- Follow Up commitments and recurrence:
  - Models, repositories, and validation for one-time and recurring commitments.
  - Recurrence engine supporting calendar-anchored and completion-relative recurrence schedules, time zones, next-occurrence resolution, snooze, and reschedule.
  - Communication launchers generating platform URI intents (`mailto:`, `tel:`, and `whatsapp://` / `https://wa.me/`).
- Plan My Day:
  - Daily planning engine scoring tasks and due follow-ups by urgency, priority, and capacity against user available minutes.
  - Interactive daily plan acceptance, item reordering, and execution view.
- Actionable Notes:
  - Selection of note content to directly spawn a linked task or Follow Up while retaining `sourceNoteId` and `sourceExcerpt`.
  - Backlink derivation displaying linked actions on note reader view.
- Fast Capture Inbox:
  - Low-friction capture modal/screen for rapid text and URL input.
  - Offline inbox triage queue with one-tap conversion into task, note, or Follow Up.
- Calendar and Analytics:
  - Interactive monthly calendar schedule view displaying scheduled tasks and due follow-ups per day.
  - Productivity insights screen calculating completion metrics, category distribution, priority velocity, and commitment reliability.
- Themes, Notifications, and Accessibility:
  - Persistent Light and Dark theme preference toggle.
  - Local reminder notification manager interface for Follow Up occurrence alerts and plan check-ins.
  - Adaptive layout adjustments for phone and tablet screen widths (e.g., dual-pane master-detail on wider screens).

## Out of scope

- Cloud synchronization, authentication, OTP, and remote account management (Feature 39).
- Modifying `apps/web` or `apps/windows`.
- Shared code or cross-application source imports.

## Build loop

- Step review: feature (review after the entire feature is ready).
- Checkpoint commits: disabled.

## Build steps

- [x] 1. **Differentiated SQLite Schema Migration and Domain Types**
   - Define TypeScript interfaces in `apps/mobile/src/types/` for FollowUp, RecurrenceRule, FollowUpOccurrence, DailyPlan, InboxCapture, Analytics, and Themes.
   - Implement migration `002_differentiated_features` in `apps/mobile/src/db/migrations.ts` creating required tables and column additions.
   - Add unit tests in `apps/mobile/src/db/database.test.ts`.
   - Done when migration 2 executes cleanly, preserves existing data, and passes database tests.

- [x] 2. **Follow Up Commitments, Recurrence Engine, and Launchers**
   - Implement `FollowUpRepository` in `apps/mobile/src/storage/followUpRepository.ts`.
   - Implement mobile recurrence engine in `apps/mobile/src/services/recurrence.ts` supporting calendar-anchored and completion-relative recurrence, occurrence status transitions, and snooze/reschedule.
   - Implement `apps/mobile/src/services/launchers.ts` constructing valid `mailto:`, `tel:`, and WhatsApp URI actions.
   - Add unit tests in `apps/mobile/src/services/recurrence.test.ts` and `apps/mobile/src/services/launchers.test.ts`.
   - Done when recurrence schedules compute predictable occurrences and launchers format valid platform URIs.

- [x] 3. **Plan My Day Engine and Repository**
   - Implement `DailyPlanRepository` in `apps/mobile/src/storage/dailyPlanRepository.ts`.
   - Implement daily planning algorithm in `apps/mobile/src/services/planEngine.ts` scoring candidate tasks and due follow-ups against available minutes.
   - Add unit tests in `apps/mobile/src/services/planEngine.test.ts`.
   - Done when Plan My Day generates explained capacity-aware recommendations that can be accepted and customized.

- [x] 4. **Actionable Notes and Fast Capture Inbox Services**
   - Implement `InboxRepository` in `apps/mobile/src/storage/inboxRepository.ts`.
   - Implement actionable note extraction helper in `apps/mobile/src/services/actionableNotes.ts` spawning tasks/follow-ups with source backlinks.
   - Implement triage processor in `apps/mobile/src/services/inbox.ts` converting captures into tasks, notes, or follow-ups idempotently.
   - Add unit tests in `apps/mobile/src/services/inbox.test.ts`.
   - Done when fast capture items triage cleanly into target entities and notes maintain accurate backlinks.

- [x] 5. **Calendar, Analytics, and Local Notifications Services**
   - Implement calendar query aggregator in `apps/mobile/src/services/calendar.ts` grouping due tasks and follow-ups by date.
   - Implement analytics calculator in `apps/mobile/src/services/analytics.ts` deriving completion rates, category distributions, and productivity scores.
   - Implement local notification scheduler interface in `apps/mobile/src/services/notifications.ts`.
   - Add unit tests in `apps/mobile/src/services/calendar.test.ts` and `apps/mobile/src/services/analytics.test.ts`.
   - Done when calendar and analytics services return verified data structures.

- [x] 6. **Mobile UI Components, Themes, and Screen Layouts**
   - Implement theme provider supporting Light and Dark modes with persistent storage.
   - Implement mobile screens:
     - `FollowUpsScreen`: commitment cards, launcher action buttons, recurrence indicators, and snooze/reschedule controls.
     - `PlanScreen`: available time slider, recommended items, and accepted daily checklist.
     - `InboxScreen`: fast capture input bar and pending triage card queue.
     - `CalendarScreen`: monthly day grid and selected day inspector.
     - `AnalyticsScreen`: productivity metrics cards and category distribution bars.
     - Update `NotesScreen` and `NoteEditScreen`: add actionable text selection ("Create Task", "Create Follow Up") and backlinks display.
     - Update `TasksScreen`: add Plan My Day quick banner and estimate inputs.
   - Adapt layout for tablet screen widths (dual-column master detail when screen width >= 768px).
   - Done when screens render properly across themes, pass accessibility touch target guidelines, and handle empty states.

- [x] 7. **Navigation Integration, Monorepo Boundary Check, and Verification**
   - Update `apps/mobile/src/navigation/Navigator.tsx` to include tabs or drawers for Tasks, Follow Ups, Plan, Notes, Inbox, Calendar, and Analytics.
   - Run boundary check `scripts/check-boundaries.mjs` ensuring zero cross-application imports.
   - Run all mobile unit tests and full monorepo verify gate (`npm run verify`).
   - Done when boundary checks, mobile tests, and existing web verification pass cleanly.

## Files / areas

- `apps/mobile/src/types/` - domain types for FollowUp, Recurrence, Plan, Inbox, Analytics, Themes.
- `apps/mobile/src/db/migrations.ts` - migration `002_differentiated_features`.
- `apps/mobile/src/storage/followUpRepository.ts` - Follow Up persistence.
- `apps/mobile/src/storage/dailyPlanRepository.ts` - Daily plan persistence.
- `apps/mobile/src/storage/inboxRepository.ts` - Fast capture inbox persistence.
- `apps/mobile/src/services/recurrence.ts` - recurrence calculation engine.
- `apps/mobile/src/services/launchers.ts` - communication intent launcher formatting.
- `apps/mobile/src/services/planEngine.ts` - Plan My Day capacity planning algorithm.
- `apps/mobile/src/services/actionableNotes.ts` - note selection to action converter.
- `apps/mobile/src/services/inbox.ts` - capture triage processor.
- `apps/mobile/src/services/calendar.ts` - schedule aggregator.
- `apps/mobile/src/services/analytics.ts` - productivity analytics engine.
- `apps/mobile/src/services/notifications.ts` - local notification manager.
- `apps/mobile/src/services/theme.ts` - mobile theme manager.
- `apps/mobile/src/screens/` - FollowUps, Plan, Inbox, Calendar, Analytics, and updated Tasks/Notes screens.
- `apps/mobile/src/navigation/Navigator.tsx` - updated mobile navigator with new routes.
- `apps/mobile/src/**/*.test.ts` - unit tests for all new services and repositories.

## Data / contracts

- `FollowUp`:
  - `id`: string
  - `personName`: string (up to 200 characters)
  - `commitment`: string
  - `details`: string | null
  - `dueAt`: string (ISO 8601 UTC)
  - `timeZone`: string
  - `emailAddress`: string | null
  - `phoneNumber`: string | null
  - `whatsAppNumber`: string | null
  - `preferredAction`: "email" | "whatsapp" | "phone" | null
  - `recurrence`: RecurrenceRule | null
  - `status`: "open" | "completed" | "archived"
  - `sourceNoteId`: string | null
  - `sourceExcerpt`: string | null
  - `createdAt`, `updatedAt`: string (ISO 8601 UTC)
- `DailyPlan`:
  - `id`: string
  - `localDate`: string (YYYY-MM-DD)
  - `timeZone`: string
  - `availableMinutes`: number
  - `items`: Array<{ id: string; type: "task" | "followup"; title: string; estimatedMinutes?: number; completed: boolean }>
  - `acceptedAt`: string | null
  - `updatedAt`: string
- `InboxCapture`:
  - `id`: string
  - `text`: string
  - `sharedUrl`: string | null
  - `sourceAppLabel`: string | null
  - `capturedAt`: string
  - `state`: "pending" | "processed" | "discarded"
  - `resultEntityType`: "task" | "note" | "followup" | null
  - `resultEntityId`: string | null

## Testing

- Unit tests via `npm run test:mobile`:
  - Recurrence rules: calendar-anchored day preservation across months, completion-relative forward calculation from completion timestamp, snooze by hours/days.
  - Launchers: valid email mailto, tel phone URI, and WhatsApp deep-link generation.
  - Plan engine: capacity limits, scoring weights, fallback when estimates are missing.
  - Actionable notes: task and follow-up creation preserving source note ID and text excerpt.
  - Fast capture: triage processing idempotency.
  - Calendar & Analytics: date bucketing, completion rates, category metrics.
  - Database: migration 2 table creations, column alters, foreign reference handling.
- Monorepo gate: `npm run verify` (boundary check, mobile test suite, web lint, web tests, and build).

## Notes for the AI

- Maintain zero em dashes, en dashes, or ellipsis characters across all files, comments, and specs.
- Do not import any code from `apps/web` or `apps/windows`. Mobile code must be completely self-contained.
- Touch targets must remain accessible with at least 44x44 dp sizing.
- Stop after planning; do not implement in `/feature`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11044,"specSha256":"3009fe39a8599ca634330edd0abafdc4d96780bd6516e5fb808133965f510815","branch":"refs/heads/feature/react-native-product-and-differentiated-feature-parity","head":"bfa8bd5f71e9f96b6afefd1c27108c0a2fa19e0a","baseRef":"refs/heads/main","baseCommit":"bfa8bd5f71e9f96b6afefd1c27108c0a2fa19e0a","sourceTree":"1bcfdb194b2fe1eca1216fcb3f26558002062c12","absentOptional":[]} -->
