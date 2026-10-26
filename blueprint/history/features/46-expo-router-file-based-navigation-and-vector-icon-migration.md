# Feature: Expo Router File-Based Navigation and Vector Icon Migration

**From build-plan:** feature 46
**Build attempt:** 1

## Goal

Re-architect `apps/mobile` with official Expo Router file-based navigation (`app/(tabs)/_layout.tsx`, `tasks.tsx`, `followups.tsx`, `notes.tsx`, `more.tsx`, and modal stack screens), support deep linking and route parameters, and replace unicode emojis across mobile navigation and screens with crisp `@expo/vector-icons`.

## In scope

- Add Expo Router dependencies (`expo-router`, `react-native-screens`, `react-native-safe-area-context`, `@expo/vector-icons`) to `apps/mobile/package.json`.
- Configure `apps/mobile/app.json` with URL scheme `taskflow` for deep linking and `expo-router` plugin.
- Create dependency injection context `apps/mobile/src/context/AppContext.tsx` providing repositories and services to file-based routes.
- Implement root layout `apps/mobile/app/_layout.tsx` with native `Stack` navigator, theme provider, and modal presentation for secondary flows.
- Implement tab layout `apps/mobile/app/(tabs)/_layout.tsx` with strictly 4 primary tabs: Tasks, Follow Ups, Notes, and More.
- Create tab screen entrypoints:
  - `apps/mobile/app/(tabs)/tasks.tsx`
  - `apps/mobile/app/(tabs)/followups.tsx`
  - `apps/mobile/app/(tabs)/notes.tsx`
  - `apps/mobile/app/(tabs)/more.tsx`
- Create modal stack route entrypoints:
  - `apps/mobile/app/task-edit.tsx` (supports `taskId` route parameter for editing or creation)
  - `apps/mobile/app/note-edit.tsx` (supports `noteId` route parameter for editing or creation)
  - `apps/mobile/app/plan.tsx` (Plan My Day flow)
  - `apps/mobile/app/inbox.tsx` (Fast capture inbox triage)
  - `apps/mobile/app/calendar.tsx` (Monthly calendar view)
  - `apps/mobile/app/analytics.tsx` (Productivity insights)
  - `apps/mobile/app/search.tsx` (Workspace search)
  - `apps/mobile/app/backup.tsx` (JSON backup export and restore)
  - `apps/mobile/app/account.tsx` (Cloud sync and OTP account session management)
- Replace all placeholder unicode emojis across tab bars and `MoreScreen` with crisp `@expo/vector-icons` (`Ionicons`).
- Maintain badge indicators for due follow-ups on the Follow Ups tab and pending triage items on the More tab.
- Update `apps/mobile/vitest.config.ts` and test mocks to support Expo Router and vector icon components in Node test environment.
- Add comprehensive unit tests verifying navigation routes, tab definitions, vector icon mappings, and service injection.

## Out of scope

- `expo-haptics` tactile feedback (reserved for Feature 47).
- `FlatList` virtualization and scroll performance optimization (reserved for Feature 47).
- iOS inset grouped cards and Android Material 3 elevation styling (reserved for Feature 47).
- Web or Windows application modifications (reserved for respective milestone features).
- Modifying SQLite schema, migration sequence, or synchronization protocol.

## Build loop

- Step review: feature (review after all steps are complete before /complete).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.

## Build steps

- [x] 1. **Install and configure Expo Router dependencies and test mocks**
  - Add `expo-router`, `react-native-screens`, `react-native-safe-area-context`, and `@expo/vector-icons` to `apps/mobile/package.json`.
  - Add `"scheme": "taskflow"` and Expo Router configuration to `apps/mobile/app.json`.
  - Update `apps/mobile/vitest.config.ts` and add mocks in `apps/mobile/src/test/` for `expo-router`, `react-native-screens`, `react-native-safe-area-context`, and `@expo/vector-icons`.
  - Done when `npm --prefix apps/mobile run typecheck` and `npm --prefix apps/mobile run test` succeed with clean mock resolutions.

- [x] 2. **Create AppContext and Service Provider for dependency injection**
  - Create `apps/mobile/src/context/AppContext.tsx` providing `taskRepo`, `noteRepo`, `followUpRepo`, `dailyPlanRepo`, `inboxRepo`, `triageService`, `searchService`, `backupService`, `authService`, `syncEngine`, and `syncRepo` via React context.
  - Export `AppServicesProvider` and `useAppServices()` hook with strict type safety and clear error messages when used outside provider.
  - Add unit test in `apps/mobile/src/context/AppContext.test.ts` verifying service initialization and context access.
  - Done when `AppContext` provides all initialized services and tests pass.

- [x] 3. **Implement root layout and native stack modal screens**
  - Create `apps/mobile/app/_layout.tsx` rendering `ThemeProvider`, `AppServicesProvider`, and a native `Stack` with `(tabs)` and modal routes.
  - Create modal route files in `apps/mobile/app/`:
    - `task-edit.tsx` (navigates to task edit with `taskId`)
    - `note-edit.tsx` (navigates to note edit with `noteId`)
    - `plan.tsx`
    - `inbox.tsx`
    - `calendar.tsx`
    - `analytics.tsx`
    - `search.tsx`
    - `backup.tsx`
    - `account.tsx`
  - Wire modal presentation options, accessible headers, and navigation dismissal callbacks.
  - Done when all secondary screens render as native stack routes and support route parameters.

- [x] 4. **Implement four-tab Expo Router layout with vector icons and dynamic badges**
  - Create `apps/mobile/app/(tabs)/_layout.tsx` configuring Expo Router `Tabs` with 4 primary tabs: Tasks, Follow Ups, Notes, More.
  - Use `@expo/vector-icons` (`Ionicons`) for tab icons:
    - Tasks: `checkbox-outline` / `checkbox`
    - Follow Ups: `people-outline` / `people`
    - Notes: `document-text-outline` / `document-text`
    - More: `ellipsis-horizontal-circle-outline` / `ellipsis-horizontal-circle`
  - Connect badge counts for due follow-ups and pending inbox captures using live repository counts.
  - Create tab screen entrypoints:
    - `apps/mobile/app/(tabs)/tasks.tsx`
    - `apps/mobile/app/(tabs)/followups.tsx`
    - `apps/mobile/app/(tabs)/notes.tsx`
    - `apps/mobile/app/(tabs)/more.tsx`
  - Done when 4-tab file-based navigation renders tabs with vector icons, accurate badges, and routes to each screen.

- [x] 5. **Migrate MoreScreen and screen controls from unicode emojis to vector icons**
  - In `apps/mobile/src/screens/MoreScreen.tsx`, replace unicode emojis with `@expo/vector-icons` (`Ionicons`):
    - Plan My Day: `flash-outline`
    - Fast Capture Inbox: `file-tray-full-outline`
    - Calendar and Schedule: `calendar-outline`
    - Productivity Insights: `bar-chart-outline`
    - Search Workspace: `search-outline`
    - Data Backup and Restore: `save-outline`
    - Account and Cloud Sync: `person-circle-outline`
  - Replace unicode back arrow and button icons with vector chevrons and icons.
  - Preserve all existing accessibility labels and touch target sizes.
  - Done when `MoreScreen` displays vector icons instead of unicode emojis while retaining full accessibility.

- [x] 6. **Monorepo boundary check, unit test coverage, and full verification**
  - Verify that `apps/mobile` contains zero imports from `apps/web` or `apps/windows`.
  - Add navigation unit tests in `apps/mobile/src/navigation/ExpoRouter.test.ts` verifying tab structure, route definitions, badge counts, and vector icons.
  - Run `npm run verify` across the monorepo to confirm all checks, tests, and builds pass.
  - Done when `npm run verify` exits with code 0 across the monorepo.

## Files / areas

- `apps/mobile/package.json`
- `apps/mobile/app.json`
- `apps/mobile/vitest.config.ts`
- `apps/mobile/src/test/expo-router-mock.ts`
- `apps/mobile/src/test/vector-icons-mock.ts`
- `apps/mobile/src/context/AppContext.tsx`
- `apps/mobile/src/context/AppContext.test.ts`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/tasks.tsx`
- `apps/mobile/app/(tabs)/followups.tsx`
- `apps/mobile/app/(tabs)/notes.tsx`
- `apps/mobile/app/(tabs)/more.tsx`
- `apps/mobile/app/task-edit.tsx`
- `apps/mobile/app/note-edit.tsx`
- `apps/mobile/app/plan.tsx`
- `apps/mobile/app/inbox.tsx`
- `apps/mobile/app/calendar.tsx`
- `apps/mobile/app/analytics.tsx`
- `apps/mobile/app/search.tsx`
- `apps/mobile/app/backup.tsx`
- `apps/mobile/app/account.tsx`
- `apps/mobile/src/screens/MoreScreen.tsx`
- `apps/mobile/src/navigation/ExpoRouter.test.ts`

## Data / contracts

- URL Scheme: `taskflow://`
- Tab Routes:
  - `taskflow://tasks` -> Tasks list
  - `taskflow://followups` -> Follow-ups list
  - `taskflow://notes` -> Notes list
  - `taskflow://more` -> More tools hub
- Modal Routes:
  - `taskflow://task-edit` (or `taskflow://task-edit?taskId=<id>`)
  - `taskflow://note-edit` (or `taskflow://note-edit?noteId=<id>`)
  - `taskflow://plan`
  - `taskflow://inbox`
  - `taskflow://calendar`
  - `taskflow://analytics`
  - `taskflow://search`
  - `taskflow://backup`
  - `taskflow://account`
- Badge Contracts:
  - Follow Ups badge: count of open follow-ups where `dueAt <= now` (hidden if 0)
  - More badge: count of inbox captures where `state == 'pending'` (hidden if 0)
- Icon Set: `@expo/vector-icons` Ionicons component.

## Testing

- Unit tests in `apps/mobile/src/context/AppContext.test.ts` for service initialization and provider hook behavior.
- Unit tests in `apps/mobile/src/navigation/ExpoRouter.test.ts` for primary tabs, badge calculations, route parameters, and vector icon names.
- Verification command: `npm run verify` (runs boundary check, mobile typecheck, mobile vitest tests, web lint, web vitest tests, and web production build).

## Notes for the AI

- Monorepo isolation is critical: never import anything from `apps/web` or `apps/windows` into `apps/mobile`.
- Strictly no em dashes, en dashes, or ellipsis in any code, comments, commit messages, or responses.
- Maintain mock support in `apps/mobile/src/test/` so Vitest can execute mobile tests cleanly in Node.
- Keep components focused and strictly typed with no `any` types.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9801,"specSha256":"e21a88f974a0ddddf1fd33a8d71d2d907e891a871828f257079901f4c7e97b88","branch":"refs/heads/feature/expo-router-file-based-navigation-and-vector-icon-migration","head":"3aadab085fe127fc3952b19aa2e0e5fa1a56d366","baseRef":"refs/heads/main","baseCommit":"3aadab085fe127fc3952b19aa2e0e5fa1a56d366","sourceTree":"e2d3f82b6ebb744e472a0feb15376f80da9767bc","absentOptional":[]} -->
