# Feature: Expo and React Native mobile foundation with four-tab native navigation

**From build-plan:** feature 41
**Build attempt:** 1
**Branch:** feature/expo-and-react-native-mobile-foundation-with-four-tab-native-navigation
**Status:** verified

## Goal

Establish a clean, robust React Native and Expo foundation for TaskFlow Mobile in `apps/mobile`, configured with official Expo and React Native packages, native UI primitives (`View`, `Text`, `Pressable`, `TextInput`, `FlatList`, `StyleSheet`) with zero HTML/DOM dependencies, `expo-sqlite` persistence with an in-memory test fallback, a strict four-destination native bottom navigation bar (Tasks, Follow Ups, Notes, More), and functional native Task and Note CRUD workflows.

## In scope

- Native Expo and React Native environment:
  - Add official React Native and Expo dependencies to `apps/mobile/package.json` (`react-native`, `expo`, `expo-sqlite`, `@types/react-native`).
  - Configure `apps/mobile` entry point and scripts (`npm run start`, `npm run android`, `npm run ios`, `npm run typecheck`, `npm run test`).
- Native primitives design system:
  - Implement pure React Native primitives in `apps/mobile/src/components/primitives.tsx` using `View`, `Text`, `Pressable`, `TextInput`, and `StyleSheet`.
  - Accessible touch targets strictly >= 44x44 dp with accessibility roles (`accessibilityRole="button"`, `accessibilityLabel`).
  - Native badge component, empty state indicator, input fields, and card containers.
- Native SQLite database driver:
  - Update `apps/mobile/src/db/driver.ts` to implement `ExpoSqliteDatabase` wrapping `expo-sqlite`'s `openDatabaseAsync` with asynchronous querying and transaction handling.
  - Maintain `InMemorySqliteDatabase` for headless node/vitest tests so `npm run test` executes quickly and deterministically in CI and local test runs without requiring a physical device or emulator.
- Strict four-tab native navigation:
  - Refactor `apps/mobile/src/navigation/Navigator.tsx` and `types/navigation.ts` to strictly support 4 primary bottom tabs: Tasks, Follow Ups, Notes, and More.
  - Sized for mobile touch targets (>= 44x44 dp) with dynamic badge counters on Follow Ups and More.
  - Native "More" screen (`apps/mobile/src/screens/MoreScreen.tsx`) presenting secondary productivity destinations (Plan My Day, Inbox, Calendar, Analytics, Search, Backup, Account, Theme Toggle) with clean native touch rows.
- Core native Task and Note CRUD:
  - Refactor `TasksScreen.tsx`, `TaskEditScreen.tsx`, `NotesScreen.tsx`, and `NoteEditScreen.tsx` to use native React Native components (`View`, `Text`, `TextInput`, `Pressable`, `FlatList`, `StyleSheet`), removing all HTML DOM tags (`div`, `button`, `span`, `input`, etc.).
  - Refactor `TaskItemCard.tsx` and `NoteItemCard.tsx` using React Native components.
  - Support creating, editing, completing, and deleting tasks.
  - Support creating, editing, and deleting notes.
- Testing and monorepo verification:
  - Unit tests for navigation state and tab transitions.
  - Unit tests for native Task and Note repositories with SQLite driver.
  - Zero cross-app boundary violations (`npm run check:boundaries`).
  - Mobile typecheck (`npm --prefix apps/mobile run typecheck`) and tests (`npm --prefix apps/mobile run test`) pass.
  - Full repo verification (`npm run verify`) passes.

## Out of scope

- Mobile Follow Up recurrence logic, direct communication launchers (phone, email, WhatsApp), Plan My Day, Actionable Notes, and local closed-app push notifications (deferred to Feature 42).
- Mobile cloud sync, email OTP auth, secure store, and Android emulator launch (deferred to Feature 43).
- Web application modifications (`apps/web`).
- Windows application modifications (`apps/windows`).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Expo and React Native dependencies and native SQLite driver.
  - Configure `apps/mobile/package.json` with `react-native`, `expo`, `expo-sqlite`, `@types/react-native`.
  - Implement `ExpoSqliteDatabase` in `apps/mobile/src/db/driver.ts` supporting `expo-sqlite` and preserve `InMemorySqliteDatabase` for testing.
  - Done when: `npm --prefix apps/mobile run typecheck` passes and database unit tests pass.

- [x] 2. Native UI primitives and strict four-tab navigation.
  - Refactor `apps/mobile/src/components/primitives.tsx` using `View`, `Text`, `Pressable`, `TextInput`, and `StyleSheet`.
  - Refactor `apps/mobile/src/types/navigation.ts` and `Navigator.tsx` to strictly 4 bottom tabs: Tasks, Follow Ups, Notes, More.
  - Implement `MoreScreen.tsx` housing secondary destinations (Plan, Inbox, Calendar, Analytics, Search, Backup, Account).
  - Done when: unit tests verify four-tab routing and tab switching logic, and touch targets meet or exceed 44x44 dp.

- [x] 3. Pure React Native Task and Note screens and full verification.
  - Refactor `TasksScreen.tsx`, `TaskEditScreen.tsx`, `NotesScreen.tsx`, and `NoteEditScreen.tsx` using pure React Native primitives.
  - Refactor `TaskItemCard.tsx` and `NoteItemCard.tsx` using React Native components.
  - Run `npm run verify` ensuring boundary checks pass, mobile typecheck and tests pass, web lint/test/build succeed.
  - Done when: `npm run verify` exits with code 0 across the monorepo.

## Files / areas

- `apps/mobile/package.json`: React Native, Expo, and expo-sqlite dependencies and scripts.
- `apps/mobile/src/db/driver.ts`: ExpoSqliteDatabase implementation and test driver.
- `apps/mobile/src/components/primitives.tsx`: native TouchButton, Badge, TextInput, EmptyState.
- `apps/mobile/src/types/navigation.ts`: four-tab navigation types and screen unions.
- `apps/mobile/src/navigation/Navigator.tsx`: 4-tab native bottom bar and header.
- `apps/mobile/src/screens/MoreScreen.tsx`: secondary workflows screen.
- `apps/mobile/src/screens/TasksScreen.tsx`: native task list screen.
- `apps/mobile/src/screens/TaskEditScreen.tsx`: native task editor screen.
- `apps/mobile/src/screens/NotesScreen.tsx`: native notes list screen.
- `apps/mobile/src/screens/NoteEditScreen.tsx`: native note editor screen.
- `apps/mobile/src/components/TaskItemCard.tsx`: native task card component.
- `apps/mobile/src/components/NoteItemCard.tsx`: native note card component.

## Data / contracts

- Navigation model:
  ```ts
  export type MobileTab = "tasks" | "followups" | "notes" | "more";
  ```
- Native Primitives:
  ```ts
  export interface TouchButtonProps {
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    disabled?: boolean;
    accessibilityLabel?: string;
  }
  ```

## Testing

- Unit tests in `apps/mobile/src/navigation/Navigator.test.ts` for tab transitions and 4-tab model.
- Unit tests in `apps/mobile/src/db/database.test.ts` for SQLite driver and migrations.
- Unit tests in `apps/mobile/src/storage/taskRepository.test.ts` and `noteRepository.test.ts`.
- Full verification via `npm run verify`.

## Notes for the AI

- Maintain zero em dashes, en dashes, or ellipsis characters across all files, code, comments, and specs.
- Do not import code from `apps/web` or `apps/windows`. Mobile code must remain strictly self-contained.
- Zero HTML DOM elements (`div`, `span`, `button`, `input`) in React Native components. Strictly use `react-native` primitives.
- All interactive touch targets must meet or exceed 44x44 dp.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7598,"specSha256":"c867f7f301bbc5bbc985a37436dd1d43b43d0f66c4a165d89bd2a08735503415","branch":"refs/heads/feature/expo-and-react-native-mobile-foundation-with-four-tab-native-navigation","head":"58111d37fd1cee16f401b67950d8f798a17dc740","baseRef":"refs/heads/main","baseCommit":"58111d37fd1cee16f401b67950d8f798a17dc740","sourceTree":"500b5390efdbd27138efd156d7b2574af8e6bc5b","absentOptional":[]} -->
