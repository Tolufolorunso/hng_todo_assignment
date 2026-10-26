# Feature: React Native product parity and mobile-first workflows

**From build-plan:** feature 42
**Build attempt:** 1
**Branch:** feature/react-native-product-parity-and-mobile-first-workflows
**Status:** verified

## Goal

Achieve complete product parity and mobile-first productivity workflows in `apps/mobile`, implementing Follow Up commitments with recurrence, direct communication launchers via React Native `Linking`, Plan My Day capacity planning, Actionable Notes with backlinks, interactive Calendar scheduling, productivity Analytics, local closed-app notifications via `expo-notifications`, and full dark and light theme consistency across all screens using pure React Native primitives.

## In scope

- Local notifications via `expo-notifications`:
  - Install and configure `expo-notifications` in `apps/mobile/package.json`.
  - Implement `NotificationScheduler` in `apps/mobile/src/services/notifications.ts` integrating with `expo-notifications` on native runtimes (`scheduleNotificationAsync`, `cancelScheduledNotificationAsync`), with in-memory fallback for headless test runners.
  - Schedule automatic local reminders 15 minutes before due follow-ups without requiring network access.
- Native communication launchers:
  - Wire native launchers in `apps/mobile/src/services/launchers.ts` and `FollowUpsScreen.tsx` using React Native `Linking.openURL` (`tel:`, `mailto:`, and WhatsApp `https://wa.me/`).
  - Minimum touch targets strictly >= 44x44 dp with accessibility labels for phone, email, and WhatsApp buttons.
- Follow Up commitments & recurrence:
  - Refactor `FollowUpsScreen.tsx` using pure React Native components (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`, `StyleSheet`).
  - Support creating commitments with calendar-anchored or completion-relative recurrence (daily, weekly, monthly).
  - Support occurrence completion, 24-hour snooze, recurrence advancement, and item deletion.
- Plan My Day screen:
  - Refactor `PlanScreen.tsx` using pure React Native components.
  - Capacity preset selection (60m, 120m, 180m, 240m, 360m, 480m) and focus recommendations scored from tasks and follow-ups.
  - Save and accept daily plans in local SQLite storage.
- Calendar view:
  - Refactor `CalendarScreen.tsx` using pure React Native components.
  - Month grid navigation with deadline dots and day inspector for scheduled tasks and follow-ups.
- Productivity Analytics:
  - Refactor `AnalyticsScreen.tsx` using pure React Native components.
  - Completion rates, velocity, priority breakdown, and category distribution rendered with native flexbox bars and metrics.
- Workspace Search:
  - Refactor `SearchScreen.tsx` using pure React Native components for searching tasks and notes.
- Pure React Native & Theme Consistency:
  - Eliminate all remaining HTML DOM elements (`div`, `button`, `span`, `input`) across mobile screens.
  - Ensure dark and light themes apply seamlessly to backgrounds, surfaces, text, and borders.
- Monorepo verification:
  - Zero cross-app boundary violations (`npm run check:boundaries`).
  - Mobile typecheck (`npm --prefix apps/mobile run typecheck`) and tests pass.
  - Full repo verification (`npm run verify`) passes.

## Out of scope

- Mobile cloud sync, email OTP auth, secure store, and Android emulator launch (deferred to Feature 43).
- Web application modifications (`apps/web`).
- Windows application modifications (`apps/windows`).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Local notifications integration and communication launchers.
  - Install `expo-notifications` in `apps/mobile`.
  - Update `notifications.ts` to schedule local notifications with `expo-notifications` on native runtimes and in-memory fallback for test environments.
  - Update `launchers.ts` with direct `Linking.openURL` integration and unit tests.
  - Done when: unit tests in `notifications.test.ts` and `launchers.test.ts` pass and typecheck succeeds.

- [x] 2. Follow Ups screen and recurrence workflows.
  - Refactor `FollowUpsScreen.tsx` using pure React Native primitives.
  - Implement native communication launch actions (Call, Email, WhatsApp) for each follow-up with >= 44x44 dp touch targets.
  - Implement occurrence completion, 24h snooze, and recurrence creation.
  - Done when: unit tests verify occurrence advancement, recurrence calculations, and launcher actions.

- [x] 3. Plan My Day, Actionable Notes, Calendar, Analytics, and full verification.
  - Refactor `PlanScreen.tsx`, `CalendarScreen.tsx`, `AnalyticsScreen.tsx`, and `SearchScreen.tsx` to pure React Native components.
  - Verify dark/light theme styling across all secondary screens.
  - Run `npm run verify` ensuring boundary checks pass, mobile typecheck and tests pass, web lint/test/build succeed.
  - Done when: `npm run verify` exits with code 0 across the monorepo.

## Files / areas

- `apps/mobile/package.json`: expo-notifications dependency.
- `apps/mobile/src/services/notifications.ts`: native NotificationScheduler wrapping expo-notifications.
- `apps/mobile/src/services/notifications.test.ts`: notification scheduling unit tests.
- `apps/mobile/src/services/launchers.ts`: Linking.openURL launchers for email, phone, and WhatsApp.
- `apps/mobile/src/screens/FollowUpsScreen.tsx`: native follow-ups screen with recurrence and launchers.
- `apps/mobile/src/screens/PlanScreen.tsx`: native Plan My Day screen.
- `apps/mobile/src/screens/CalendarScreen.tsx`: native calendar grid and day inspector.
- `apps/mobile/src/screens/AnalyticsScreen.tsx`: native productivity analytics screen.
- `apps/mobile/src/screens/SearchScreen.tsx`: native workspace search screen.

## Data / contracts

- Notification Schedule:
  ```ts
  export interface ScheduledNotification {
    id: string;
    title: string;
    body: string;
    triggerAt: string;
    type: "followup_reminder" | "plan_checkin";
    targetId?: string;
  }
  ```
- Launcher Actions:
  ```ts
  export type PreferredAction = "email" | "whatsapp" | "phone";
  ```

## Testing

- Unit tests in `notifications.test.ts` for notification scheduling and cancellation.
- Unit tests in `launchers.test.ts` for URI generation and validation.
- Unit tests in `recurrence.test.ts` for calendar-anchored and completion-relative recurrence.
- Full monorepo verification via `npm run verify`.

## Notes for the AI

- Maintain zero em dashes, en dashes, or ellipsis characters across all files, code, comments, and specs.
- Do not import code from `apps/web` or `apps/windows`. Mobile code must remain strictly self-contained.
- Zero HTML DOM elements in React Native components. Strictly use `react-native` primitives.
- All interactive touch targets must meet or exceed 44x44 dp.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6930,"specSha256":"288588fe9aac6f981d5003321ab561888c6a364aa332cd8036dd94aa26cd5eb6","branch":"refs/heads/feature/react-native-product-parity-and-mobile-first-workflows","head":"8ced04dfc3fc655e1056130613a08201d83d4767","baseRef":"refs/heads/main","baseCommit":"8ced04dfc3fc655e1056130613a08201d83d4767","sourceTree":"8a564c5e9810f5f8d9c6561e3e663b9c1d0fa99d","absentOptional":[]} -->
