# Feature: Web accounts and synchronization

**From build-plan:** feature 35
**Build attempt:** 1
**Branch:** feature/web-accounts-and-synchronization
**Status:** verified

## Goal

Connect the Next.js web client to the backend account and synchronization infrastructure, providing optional email OTP sign-in, explicit local-data adoption into personal account workspaces, an offline-resilient bidirectional sync engine with exponential backoff retries, conflict resolution, multi-tab BroadcastChannel coordination, and service-worker API route caching exclusions.

## In scope

- Service Worker API Exclusions (`apps/web/public/sw.js`):
  - Exclude all `/api/` route requests from Service Worker caching and intercepting to ensure API requests and streaming sync responses always hit the live network.
- Web Authentication & Session Client (`apps/web/lib/auth.ts`, `apps/web/types/auth.ts`):
  - Client-side API functions for:
    - Requesting email OTP via `POST /api/v1/auth/otp/request`.
    - Verifying email OTP via `POST /api/v1/auth/otp/verify` and storing session access token.
    - Refreshing access token via `POST /api/v1/auth/refresh` on token expiration.
    - Logging out via `POST /api/v1/auth/logout`.
    - Listing active sessions via `GET /api/v1/auth/sessions` and revoking via `DELETE /api/v1/auth/sessions/:id` or `POST /api/v1/auth/sessions/revoke-all`.
    - Inspecting account info via `GET /api/v1/account` and deleting account via `DELETE /api/v1/account`.
  - React authentication hook/context (`useAuth`) providing `user`, `session`, `token`, `isAuthenticated`, `signIn`, `verifyOtp`, `signOut`, and `refreshSession`.
- Explicit Local-Data Adoption Flow (`apps/web/lib/adoption.ts`):
  - Detect when an anonymous user with records in `"local"` workspace signs in.
  - Present an explicit adoption choice:
    - "Adopt local data into account": copies all tasks, notes, follow-ups, occurrences, daily plans, inbox captures, and task orders into the user's account-scoped workspace and enqueues outbox mutations for initial cloud synchronization.
    - "Keep local separate / Start fresh": switches active workspace to the new account workspace while keeping local data intact in `"local"`.
  - Preserve `"local"` workspace data until initial synchronization succeeds.
- Web Client Synchronization Engine (`apps/web/lib/sync.ts`):
  - Sync cycle for the active workspace:
    - Outbox push: reads pending mutations from `outbox` store (up to 100), builds `SyncRequest` with `protocolVersion: 1`, and posts to `POST /api/v1/sync`.
    - Receipt processing: on `applied` or `duplicate`, dequeues mutation from outbox. On `conflict`, records a `LocalConflictRecord`.
    - Change pull: queries server change stream for modifications where `revision > cursor`.
    - Entity application: applies server updates and deletion tombstones directly to IndexedDB entity stores without re-logging outbox mutations.
    - Cursor advance: updates `sync_cursors` with `nextCursor`.
    - Pagination: iterates until `hasMore` is false.
  - Sync scheduler and triggers:
    - Mutation-triggered debounced sync.
    - Interval sync (every 30 seconds when tab is active and authenticated).
    - Window online event trigger.
    - Manual "Sync Now" trigger.
  - Retries and backoff:
    - Exponential backoff on network errors and 503 unavailable responses (1s, 2s, 4s, 8s, up to 30s max).
  - Sync status state machine:
    - States: `idle`, `syncing`, `offline`, `error`, `conflict`.
- Multi-Tab Coordination (`apps/web/lib/broadcast.ts`):
  - Uses browser-native `BroadcastChannel` with channel name `taskflow_web_sync`.
  - Broadcasts and handles events: `DATA_MUTATED`, `SYNC_STARTED`, `SYNC_COMPLETED`, `WORKSPACE_CHANGED`, `AUTH_CHANGED`.
  - Coordinates sync runs across browser tabs to prevent simultaneous duplicate pushes.
- User Interface Components:
  - Account / Sign-In Modal (`apps/web/components/auth/AccountModal.tsx`):
    - Email entry, OTP input, loading states, validation error feedback, session list, and account deletion dialog.
  - Local Data Adoption Dialog (`apps/web/components/auth/DataAdoptionModal.tsx`):
    - Explains adoption clearly and provides explicit "Adopt Local Data" and "Start Fresh" buttons.
  - Sync Status Indicator & Menu (`apps/web/components/sync/SyncStatusIndicator.tsx`):
    - Displays current sync state (`idle`, `syncing`, `offline`, `error`, `conflict`) and last synced timestamp in `AppHeader.tsx`.
    - Includes "Sync Now" button.
  - Conflict Resolution Modal (`apps/web/components/sync/ConflictModal.tsx`):
    - Displays conflicting fields between local and server versions.
    - Provides actions: "Keep Server Version" or "Keep Local Version".
- Testing:
  - Unit tests in `apps/web/lib/auth.test.ts` verifying OTP request, verify, session refresh, and token management.
  - Unit tests in `apps/web/lib/adoption.test.ts` verifying data migration from local workspace into account workspace.
  - Unit tests in `apps/web/lib/sync.test.ts` verifying outbox push, receipt processing, change pull application, cursor updates, conflict handling, and retry backoff.
  - Unit tests in `apps/web/lib/broadcast.test.ts` verifying multi-tab broadcast messaging.
  - Full verification: `npm run verify`.

## Out of scope

- Closed-app Web Push notification subscription management and background dispatcher (scheduled for Feature 36).
- React Native mobile authentication and SQLite synchronization (scheduled for Milestone L, Features 37-39).
- Windows WPF authentication and SQLite synchronization (scheduled for Milestone M, Features 40-42).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Service worker API exclusions, Web authentication client, and session state.
  - Update `apps/web/public/sw.js` to exclude `/api/` paths from caching.
  - Implement `apps/web/lib/auth.ts` with OTP request, OTP verify, session refresh, logout, session management, and React auth state hook/provider.
  - Implement Account / Sign-In Modal (`apps/web/components/auth/AccountModal.tsx`).
  - Done when: unit tests in `apps/web/lib/auth.test.ts` verify OTP flows, session refresh, session storage, and logout.

- [x] 2. Client synchronization engine, local data adoption, and multi-tab coordination.
  - Implement local data adoption flow in `apps/web/lib/adoption.ts` (copying local data into account workspace).
  - Implement client sync engine in `apps/web/lib/sync.ts` (pushing outbox, handling receipts, pulling change stream, applying updates/tombstones, updating cursors, retries with exponential backoff).
  - Implement multi-tab event coordination via `BroadcastChannel` in `apps/web/lib/broadcast.ts`.
  - Done when: unit tests in `apps/web/lib/sync.test.ts`, `apps/web/lib/adoption.test.ts`, and `apps/web/lib/broadcast.test.ts` pass verifying push/pull cycles, receipt handling, cursor advances, conflict recording, and tab events.

- [x] 3. Header integration, sync status indicator, conflict resolution UI, and verification.
  - Integrate Account and Sync status into `AppHeader.tsx` (sync indicator with states: `idle`, `syncing`, `offline`, `error`, `conflict`, and Account dropdown/modal).
  - Implement Conflict Resolution Modal (`apps/web/components/sync/ConflictModal.tsx`) allowing resolution between server and local versions.
  - Run `npm run verify` ensuring boundary checks, zero lint errors, all tests passing, and successful production build.
  - Done when: `npm run verify` exits with code 0 across all applications and tests.

## Files / areas

- `apps/web/public/sw.js`: service worker fetch handler with `/api/` exclusion.
- `apps/web/types/auth.ts`: web client authentication types.
- `apps/web/lib/auth.ts`: authentication API client, token storage, and session refresh.
- `apps/web/lib/adoption.ts`: explicit local data adoption into account workspace.
- `apps/web/lib/sync.ts`: web client synchronization engine, outbox push, change pull, and backoff.
- `apps/web/lib/broadcast.ts`: multi-tab BroadcastChannel synchronization coordination.
- `apps/web/components/auth/AccountModal.tsx`: sign-in, OTP verification, session management, and account deletion dialog.
- `apps/web/components/auth/DataAdoptionModal.tsx`: local data adoption confirmation dialog.
- `apps/web/components/sync/SyncStatusIndicator.tsx`: header sync state badge and manual sync trigger.
- `apps/web/components/sync/ConflictModal.tsx`: interactive conflict comparison and resolution modal.
- `apps/web/components/app/AppHeader.tsx`: header integration for account and sync status.
- `apps/web/lib/auth.test.ts`: authentication client unit tests.
- `apps/web/lib/adoption.test.ts`: local data adoption unit tests.
- `apps/web/lib/sync.test.ts`: synchronization engine unit tests.
- `apps/web/lib/broadcast.test.ts`: BroadcastChannel unit tests.

## Data / contracts

- Auth State:
  ```ts
  interface AuthState {
    user: { id: string; email: string } | null;
    session: { id: string; expiresAt: string } | null;
    token: string | null;
    status: "idle" | "loading" | "authenticated" | "unauthenticated";
  }
  ```

- Sync State:
  ```ts
  type SyncStatus = "idle" | "syncing" | "offline" | "error" | "conflict";
  interface SyncState {
    status: SyncStatus;
    lastSyncedAt: string | null;
    pendingMutationsCount: number;
    unresolvedConflictsCount: number;
    errorMessage?: string | null;
  }
  ```

- Multi-Tab Broadcast Message:
  ```ts
  type SyncBroadcastEvent =
    | { type: "DATA_MUTATED"; workspaceId: string }
    | { type: "SYNC_STARTED"; workspaceId: string }
    | { type: "SYNC_COMPLETED"; workspaceId: string }
    | { type: "WORKSPACE_CHANGED"; workspaceId: string }
    | { type: "AUTH_CHANGED"; accountId: string | null };
  ```

## Testing

- `apps/web/lib/auth.test.ts`:
  - Request OTP sends email to API.
  - Verify OTP stores token and updates user state.
  - Refresh session requests new token on 401 or timer.
  - Logout clears auth state and revokes session.
- `apps/web/lib/adoption.test.ts`:
  - Copies all entities from `local` to account workspace.
  - Enqueues outbox mutations with action `put` for every adopted item.
  - Preserves original `local` workspace records intact.
- `apps/web/lib/sync.test.ts`:
  - Pushes pending outbox mutations and dequeues on `applied` receipt.
  - Records local conflict when receipt status is `conflict`.
  - Applies change stream updates and deletion tombstones to local stores.
  - Updates sync cursor to server `nextCursor`.
  - Retries with exponential backoff on network errors or 503 responses.
- `apps/web/lib/broadcast.test.ts`:
  - Broadcasts mutation and sync completion events to other tabs.
- Full verification: `npm run verify`.

## Notes for the AI

- Writing style: strictly zero em dashes (—), en dashes (–), or ellipsis characters across all code, comments, commit messages, and chat responses.
- Privacy & Tenancy: anonymous local data is never automatically uploaded; the user must explicitly choose adoption.
- Resilience: sync operations must survive network disconnections and server 503 unavailability without losing local edits.
- Non-blocking: background sync must never freeze the UI thread or prevent local IndexedDB reads and writes.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11455,"specSha256":"cb109a6de458e9be33c6f2657b1c36f61feab851db1505eb5859e6472737996c","branch":"refs/heads/feature/web-accounts-and-synchronization","head":"d64d2cf3dc5c9670e0a153ef65b1f4e84d55d433","baseRef":"refs/heads/main","baseCommit":"d64d2cf3dc5c9670e0a153ef65b1f4e84d55d433","sourceTree":"28d0b943f2b2592168bb768751b1abe65922a64c","absentOptional":[]} -->
