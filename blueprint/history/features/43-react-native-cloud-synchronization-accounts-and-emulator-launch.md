# Feature: React Native cloud synchronization, accounts, and emulator launch

**From build-plan:** feature 43
**Build attempt:** 1
**Branch:** feature/react-native-cloud-synchronization-accounts-and-emulator-launch
**Status:** verified

## Goal

Independently implement secure authentication token storage via `expo-secure-store`, passwordless email OTP authentication, local data cloud adoption, bidirectional outbox synchronization against the backend API, native conflict resolution modal, lifecycle recovery, and Android emulator launch readiness in `apps/mobile`.

## In scope

- Secure token storage via `expo-secure-store`:
  - Install `expo-secure-store` in `apps/mobile/package.json`.
  - Implement `SecureStorage` service in `apps/mobile/src/services/secureStore.ts` wrapping `expo-secure-store` with in-memory fallback for headless test runners.
  - Configure `AuthService` in `apps/mobile/src/services/auth.ts` to persist and retrieve `auth_access_token` and `auth_refresh_token` using `SecureStorage`.
- Account and synchronization screen refactoring:
  - Refactor `AccountScreen.tsx` to pure React Native components (`View`, `Text`, `TextInput`, `Pressable`, `ScrollView`, `StyleSheet`, `ActivityIndicator`), removing all legacy HTML tags.
  - Unauthenticated workflow: email input with validation, OTP request, 6-digit OTP verification, error handling, and loading indicators.
  - Authenticated workflow: account inspection, session listing with single-session and revoke-all actions, local-to-cloud data adoption trigger and summary, manual sync trigger ("Sync Now") with real-time status, logout, and account deletion with confirmation.
  - Strict `>= 44x44 dp` touch targets across all interactive buttons, inputs, and tab navigation.
- Bidirectional outbox synchronization and conflict resolution:
  - Ensure `SyncEngine` handles push and pull mutations against backend `/api/v1/sync` for tasks, notes, follow-ups, occurrences, daily plans, and inbox items.
  - Wire native `ConflictModal` to resolve server vs local differences directly from the Account screen or sync notification.
- App lifecycle and connectivity recovery:
  - Verify `LifecycleService` listens to React Native `AppState` and network connectivity events to auto-trigger synchronization and catch up on pending follow-ups.
- Android emulator and Expo build readiness:
  - Add missing asset placeholders in `apps/mobile/assets/` (`icon.png`, `splash.png`, `adaptive-icon.png`, `notification-icon.png`) ensuring Android bundler runs cleanly without missing asset crashes.
  - Document and verify `npm run android` execution against local development server and API.
- Monorepo verification:
  - Boundary checks pass (`npm run check:boundaries`).
  - Mobile TypeScript typecheck and Vitest test suite pass.
  - Full repo verification (`npm run verify`) exits with code 0.

## Out of scope

- Windows application implementation (`apps/windows`, Milestone M).
- Web application modifications (`apps/web`).
- Push notification server credentials (APNs / FCM push keys).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Secure token storage integration and AuthService upgrade.
  - Install `expo-secure-store` in `apps/mobile`.
  - Implement `SecureStorage` in `apps/mobile/src/services/secureStore.ts` with in-memory fallback for headless test runners.
  - Configure `AuthService` to store access and refresh tokens via `SecureStorage`.
  - Done when: unit tests in `secureStore.test.ts` and `auth.test.ts` pass and mobile typecheck succeeds.

- [x] 2. Refactor AccountScreen to pure React Native with full OTP and adoption workflows.
  - Refactor `AccountScreen.tsx` using pure React Native components (`View`, `Text`, `TextInput`, `Pressable`, `ScrollView`, `StyleSheet`, `ActivityIndicator`).
  - Implement email OTP request and verification with clear error and loading states.
  - Implement authenticated account views: session management, local data adoption, manual sync trigger, and account deletion.
  - Ensure all touch targets meet or exceed 44x44 dp.
  - Done when: unit tests verify OTP verification, session revocation, and data adoption triggers.

- [x] 3. Android emulator assets, lifecycle recovery, and full verification.
  - Generate required mobile assets in `apps/mobile/assets/` (`icon.png`, `splash.png`, `adaptive-icon.png`, `notification-icon.png`).
  - Verify `SyncEngine` and `LifecycleService` end-to-end sync with conflict resolution.
  - Run `npm run verify` across the monorepo.
  - Done when: `npm run verify` exits with code 0 across the monorepo.

## Files / areas

- `apps/mobile/package.json`: expo-secure-store dependency.
- `apps/mobile/src/services/secureStore.ts`: secure storage abstraction over expo-secure-store.
- `apps/mobile/src/services/secureStore.test.ts`: secure storage unit tests.
- `apps/mobile/src/services/auth.ts`: updated AuthService using SecureStorage.
- `apps/mobile/src/screens/AccountScreen.tsx`: pure React Native account and sync screen.
- `apps/mobile/assets/`: icon, splash, and adaptive icon assets.
- `apps/mobile/vitest.config.ts`: expo-secure-store alias for headless testing.

## Data / contracts

- Secure Storage Key Contract:
  ```ts
  export interface SecureStorageDriver {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    deleteItem(key: string): Promise<void>;
  }
  ```
- Sync Outbox Contract:
  ```ts
  export interface SyncMutation {
    id: string;
    entityType: "task" | "note" | "followup" | "occurrence" | "plan" | "inbox";
    entityId: string;
    operation: "insert" | "update" | "delete";
    clientTimestamp: string;
    payload: string | null;
  }
  ```

## Testing

- Unit tests in `secureStore.test.ts` for get, set, delete operations.
- Unit tests in `auth.test.ts` for OTP request, OTP verify, and secure token lifecycle.
- Unit tests in `syncEngine.test.ts` for outbox push, pull, and conflict handling.
- Full verification via `npm run verify`.

## Notes for the AI

- Maintain zero em dashes, en dashes, or ellipsis characters across all files, code, comments, and specs.
- Do not import code from `apps/web` or `apps/windows`. Mobile code must remain strictly self-contained.
- Zero HTML DOM elements (`div`, `span`, `button`, `input`) in React Native components. Strictly use `react-native` primitives.
- All interactive touch targets must meet or exceed 44x44 dp.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6658,"specSha256":"9a49bf0ef1ad6cd115eb874590709e1a9bcf3e495e3a2befbe7c4bc290026b3c","branch":"refs/heads/feature/react-native-cloud-synchronization-accounts-and-emulator-launch","head":"bdec016468d288bec1d1bb6263ac3d41781f4a31","baseRef":"refs/heads/main","baseCommit":"bdec016468d288bec1d1bb6263ac3d41781f4a31","sourceTree":"db7d8b141758aebd6f0a108aab0c9dd4ed50b780","absentOptional":[]} -->
