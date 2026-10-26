# Feature: React Native API integration and release readiness

**From build-plan:** feature 39
**Build attempt:** 1
**Branch:** feature/react-native-api-integration-and-release-readiness
**Status:** verified

## Goal

Connect the independent React Native mobile client to the TaskFlow backend API, providing passwordless email OTP authentication, secure session management, bidirectional synchronization for all supported entities (tasks, notes, followups, occurrences, daily plans, inbox captures, and task order), conflict resolution, Android and iOS lifecycle recovery, signed build configuration, and store privacy readiness.

## In scope

- Database Migration 3 (`003_sync_engine` in `apps/mobile/src/db/migrations.ts`):
  - `outbox` table (`id` TEXT PRIMARY KEY, `mutation_id` TEXT NOT NULL, `protocol_version` INTEGER NOT NULL, `entity_type` TEXT NOT NULL, `entity_id` TEXT NOT NULL, `action` TEXT NOT NULL, `base_revision` INTEGER, `payload` TEXT, `created_at` TEXT NOT NULL).
  - `sync_cursors` table (`workspace_id` TEXT PRIMARY KEY, `cursor` INTEGER NOT NULL, `updated_at` TEXT NOT NULL).
  - `conflicts` table (`id` TEXT PRIMARY KEY, `workspace_id` TEXT NOT NULL, `entity_type` TEXT NOT NULL, `entity_id` TEXT NOT NULL, `local_value` TEXT, `server_value` TEXT, `server_revision` INTEGER NOT NULL, `created_at` TEXT NOT NULL).
  - `tombstones` table (`id` TEXT PRIMARY KEY, `workspace_id` TEXT NOT NULL, `entity_type` TEXT NOT NULL, `entity_id` TEXT NOT NULL, `deleted_at` TEXT NOT NULL).
  - `server_revisions` table (`entity_type` TEXT NOT NULL, `entity_id` TEXT NOT NULL, `server_revision` INTEGER NOT NULL, PRIMARY KEY (entity_type, entity_id)).
- Mobile Outbox and Storage Integration (`apps/mobile/src/storage/syncRepository.ts`):
  - Outbox enqueue, dequeue, and listing functions.
  - Transactional outbox logging for repositories (tasks, notes, followups, occurrences, daily plans, inbox captures, and task order).
  - Cursor tracking, conflict storage, and tombstone recording.
- Remote Authentication and Session Management (`apps/mobile/src/services/auth.ts`, `apps/mobile/src/types/auth.ts`):
  - Remote email OTP request via `POST /api/v1/auth/otp/request`.
  - OTP verification via `POST /api/v1/auth/otp/verify` with access and refresh token receipt.
  - Proactive and 401-triggered token refresh via `POST /api/v1/auth/refresh`.
  - Logout via `POST /api/v1/auth/logout`.
  - Active session inspection via `GET /api/v1/auth/sessions` and revocation.
  - Account inspection and deletion via `/api/v1/account`.
  - Secure credential storage abstraction for tokens and session metadata.
  - Explicit local data adoption helper: on initial sign-in, prompt to adopt existing local entities into cloud account via outbox mutations.
- Mobile Synchronization Engine (`apps/mobile/src/services/syncEngine.ts`, `apps/mobile/src/types/sync.ts`):
  - Bidirectional sync cycle calling `POST /api/v1/sync` with protocol version 1:
    - Outbox push batch with base revisions.
    - Mutation receipt processing: `applied` (dequeues mutation, updates server revision), `duplicate` (dequeues mutation), `conflict` (records local conflict, dequeues mutation to prevent loop), `invalid` (records error).
    - Change pull: fetches server changes where revision > cursor, applies entity updates/tombstones directly to SQLite without re-logging outbox mutations.
    - Advances cursor to `nextCursor` and paginates while `hasMore` is true.
  - Conflict resolution: "Keep Server Version" (overwrites local with server value) vs "Keep Local Version" (enqueues new outbox mutation with server revision as base revision).
  - Sync scheduler with state machine (`idle`, `syncing`, `offline`, `error`, `conflict`) and exponential backoff retry on network failures.
- Android and iOS Lifecycle Recovery (`apps/mobile/src/services/lifecycle.ts`):
  - App state listener (active, background, inactive) to detect app foregrounding and trigger token validation and sync catch-up.
  - Network connectivity state listener to detect reconnect and resume sync.
- Mobile UI Integration:
  - Account Screen (`apps/mobile/src/screens/AccountScreen.tsx`):
    - Email entry, OTP code entry, loading states, validation error feedback.
    - Local data adoption prompt ("Adopt into Cloud Account" vs "Start Fresh").
    - Authenticated profile view (email, session info, sync state, "Sync Now" button, active sessions, sign-out, account deletion).
  - Conflict Resolution Modal (`apps/mobile/src/components/ConflictModal.tsx`):
    - Side-by-side comparison of local vs server fields and resolution actions.
  - Navigation update (`apps/mobile/src/navigation/Navigator.tsx`):
    - Add Account tab with sync status indicator badge.
- Release Readiness and Privacy Documentation:
  - `apps/mobile/app.json`: Expo and React Native configuration for Android and iOS (bundle ID `com.taskflow.app`, version 1.0.0, permissions, icons).
  - `apps/mobile/PRIVACY.md`: Apple App Store privacy nutrition label and Google Play Data Safety declaration.
  - `apps/mobile/RELEASE.md`: Signed production build guide (.aab, .ipa) and physical device validation protocol.
- Testing:
  - Unit tests in `apps/mobile/src/storage/sync.test.ts` for schema migration 3, outbox queueing, cursor persistence, and tombstone handling.
  - Unit tests in `apps/mobile/src/services/auth.test.ts` for OTP request, verify, refresh rotation, and local data adoption.
  - Unit tests in `apps/mobile/src/services/syncEngine.test.ts` for push/pull cycles, receipt handling, conflict recording, and resolution.
  - Monorepo boundary check and full verification via `npm run verify`.

## Out of scope

- Windows WPF authentication and SQLite synchronization (scheduled for Milestone M, Features 40 to 42).
- Push notification subscription management on mobile (mobile uses local SQLite-driven reminders).
- Multi-user collaboration, shared workspaces, or third-party OAuth providers.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Schema migration 3 (`003_sync_engine`), outbox repository, and sync storage.
  - Add Migration 3 to `apps/mobile/src/db/migrations.ts` creating `outbox`, `sync_cursors`, `conflicts`, `tombstones`, and `server_revisions` tables.
  - Implement `SyncRepository` in `apps/mobile/src/storage/syncRepository.ts` for outbox CRUD, cursor persistence, tombstone tracking, and conflict storage.
  - Update `TaskRepository`, `NoteRepository`, `FollowUpRepository`, `DailyPlanRepository`, and `InboxRepository` to optionally accept `enqueueOutbox` and transactional context.
  - Done when: unit tests in `apps/mobile/src/storage/sync.test.ts` pass verifying migration 3, outbox operations, cursor tracking, and tombstone persistence.

- [x] 2. Remote authentication client, secure session storage, and bidirectional synchronization engine.
  - Implement `apps/mobile/src/services/auth.ts` and `apps/mobile/src/types/auth.ts` handling OTP request, verification, token refresh, logout, session inspection, and local data adoption.
  - Implement `apps/mobile/src/services/syncEngine.ts` and `apps/mobile/src/types/sync.ts` handling outbox push, receipt processing, change pull, cursor advance, conflict recording, conflict resolution, and exponential backoff.
  - Done when: unit tests in `apps/mobile/src/services/auth.test.ts` and `apps/mobile/src/services/syncEngine.test.ts` pass verifying authentication flows, token refresh, sync cycles, receipt processing, and conflict resolution.

- [x] 3. UI integration, lifecycle recovery, release readiness assets, and full verification.
  - Implement `AccountScreen.tsx`, `ConflictModal.tsx`, and integrate the Account tab and sync badge into `Navigator.tsx`.
  - Implement lifecycle and network recovery listeners in `apps/mobile/src/services/lifecycle.ts`.
  - Add `apps/mobile/app.json`, `apps/mobile/PRIVACY.md`, and `apps/mobile/RELEASE.md` for signed builds and store readiness.
  - Run `npm run verify` ensuring boundary checks pass, all tests pass, and web production build succeeds.
  - Done when: `npm run verify` exits with code 0 across the entire repository.

## Files / areas

- `apps/mobile/src/db/migrations.ts`: database migration 3 with sync tables.
- `apps/mobile/src/types/sync.ts`: sync protocol types, outbox records, receipts, and conflict types.
- `apps/mobile/src/types/auth.ts`: mobile authentication types, session credentials, and adoption choices.
- `apps/mobile/src/storage/syncRepository.ts`: outbox, cursor, tombstone, and conflict repository.
- `apps/mobile/src/storage/taskRepository.ts`: transactional outbox logging support.
- `apps/mobile/src/storage/noteRepository.ts`: transactional outbox logging support.
- `apps/mobile/src/storage/followUpRepository.ts`: transactional outbox logging support.
- `apps/mobile/src/storage/dailyPlanRepository.ts`: transactional outbox logging support.
- `apps/mobile/src/storage/inboxRepository.ts`: transactional outbox logging support.
- `apps/mobile/src/services/auth.ts`: authentication API client, token storage, and session lifecycle.
- `apps/mobile/src/services/syncEngine.ts`: bidirectional push/pull sync engine and conflict resolver.
- `apps/mobile/src/services/lifecycle.ts`: app state and network recovery listeners.
- `apps/mobile/src/screens/AccountScreen.tsx`: sign-in, OTP verification, sync status, and account settings screen.
- `apps/mobile/src/components/ConflictModal.tsx`: conflict comparison and resolution modal.
- `apps/mobile/src/navigation/Navigator.tsx`: account tab and sync status badge integration.
- `apps/mobile/app.json`: Android and iOS app metadata, permissions, and build configuration.
- `apps/mobile/PRIVACY.md`: store privacy disclosures and data safety declarations.
- `apps/mobile/RELEASE.md`: release guide for signed Android and iOS builds and physical device verification.
- `apps/mobile/src/storage/sync.test.ts`: sync storage unit tests.
- `apps/mobile/src/services/auth.test.ts`: authentication client unit tests.
- `apps/mobile/src/services/syncEngine.test.ts`: sync engine and conflict unit tests.

## Data / contracts

- Auth State:
  ```ts
  interface MobileAuthState {
    user: { id: string; email: string } | null;
    session: { id: string; expiresAt: string } | null;
    accessToken: string | null;
    refreshToken: string | null;
    status: "idle" | "loading" | "authenticated" | "unauthenticated";
  }
  ```

- Sync State:
  ```ts
  type MobileSyncStatus = "idle" | "syncing" | "offline" | "error" | "conflict";
  interface MobileSyncState {
    status: MobileSyncStatus;
    lastSyncedAt: string | null;
    pendingMutationsCount: number;
    unresolvedConflictsCount: number;
    errorMessage?: string | null;
  }
  ```

- Outbox Mutation:
  ```ts
  interface OutboxRecord {
    id: string;
    mutationId: string;
    protocolVersion: number;
    entityType: "task" | "note" | "followup" | "followup_occurrence" | "daily_plan" | "inbox_capture" | "task_order";
    entityId: string;
    action: "put" | "delete";
    baseRevision: number | null;
    payload: string | null;
    createdAt: string;
  }
  ```

## Testing

- Unit tests for migration 3 and sync repository operations in `apps/mobile/src/storage/sync.test.ts`.
- Unit tests for remote OTP authentication, token refresh, and data adoption in `apps/mobile/src/services/auth.test.ts`.
- Unit tests for sync push, pull, receipt processing, and conflict resolution in `apps/mobile/src/services/syncEngine.test.ts`.
- Monorepo isolation boundary check via `node scripts/check-boundaries.mjs`.
- Full project verification via `npm run verify`.

## Notes for the AI

- Maintain strict monorepo isolation: do not import anything from `apps/web` or `apps/windows`.
- Do not use em dashes, en dashes, or ellipsis characters in code, comments, or documentation.
- All touch targets in `AccountScreen` and `ConflictModal` must be at least 44x44 dp with visible focus and accessible labels.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":12139,"specSha256":"90b4ba979189fb92969348cdb43bfe3c6a9704deabd2e9f0f80816b360e02588","branch":"refs/heads/feature/react-native-api-integration-and-release-readiness","head":"8720ca7c6258cfc64b222d4a28924e4d3518a4db","baseRef":"refs/heads/main","baseCommit":"8720ca7c6258cfc64b222d4a28924e4d3518a4db","sourceTree":"bfcbddf19efd5e689f61072d3d03794845b3a3de","absentOptional":[]} -->
