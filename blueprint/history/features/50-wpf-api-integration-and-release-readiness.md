# Feature: WPF API Integration and Release Readiness

**From build-plan:** feature 50
**Build attempt:** 1
**Branch:** feature/wpf-api-integration-and-release-readiness
**Status:** verified

## Goal

Connect the native Windows WPF client (`apps/windows`) to the TaskFlow backend API, providing passwordless email OTP authentication, DPAPI-protected session credential storage, bidirectional cloud synchronization for all supported entities (tasks, notes, follow-ups, occurrences, daily plans, inbox captures, and task order), conflict resolution, network recovery, local data adoption, MSIX packaging configuration, and Microsoft Store release documentation.

## In scope

- SQLite Migration 3 (`003_SyncEngine.sql`):
  - Table `outbox` with columns `id`, `mutation_id`, `protocol_version`, `entity_type`, `entity_id`, `action`, `base_revision`, `payload`, `created_at`.
  - Table `sync_cursors` with columns `workspace_id`, `cursor`, `updated_at`.
  - Table `conflicts` with columns `id`, `workspace_id`, `entity_type`, `entity_id`, `local_value`, `server_value`, `server_revision`, `created_at`.
  - Table `tombstones` with columns `id`, `workspace_id`, `entity_type`, `entity_id`, `deleted_at`.
  - Table `server_revisions` with columns `entity_type`, `entity_id`, `server_revision`, `PRIMARY KEY (entity_type, entity_id)`.
  - Migration discovery and sequential execution in `MigrationRunner.cs`.
- Outbox and Sync Storage (`SyncRepository.cs`):
  - Outbox enqueue, peek batch, and remove mutations.
  - Transactional outbox logging integration across all entity repositories (`TaskRepository`, `NoteRepository`, `FollowUpRepository`, `DailyPlanRepository`, `InboxRepository`, `TaskOrderRepository`).
  - Cursor tracking, server revision indexing, tombstone recording, and conflict persistence.
- DPAPI Session Credential Storage (`DpapiSessionStore.cs`, `ISessionStore.cs`):
  - Secure credential storage using `System.Security.Cryptography.ProtectedData` with `DataProtectionScope.CurrentUser`.
  - Encrypted storage and retrieval of access tokens, refresh tokens, user identifiers, email address, and token expiration.
- Windows Auth API Client (`IAuthService.cs`, `AuthService.cs`):
  - Passwordless email OTP request (`POST /api/v1/auth/otp/request`).
  - OTP verification (`POST /api/v1/auth/otp/verify`) returning access and refresh tokens.
  - Automatic and reactive token refresh (`POST /api/v1/auth/refresh`).
  - Logout (`POST /api/v1/auth/logout`) and session revocation (`DELETE /api/v1/auth/sessions/{id}`).
  - Account info query (`GET /api/v1/account`) and account deletion (`DELETE /api/v1/account`).
- Windows Synchronization Engine (`ISyncEngine.cs`, `SyncEngine.cs`):
  - Bidirectional sync loop calling `POST /api/v1/sync` with protocol version 1:
    - Push batch of queued outbox mutations with base revisions.
    - Process mutation receipts: `applied` (dequeues mutation and updates server revision), `duplicate` (dequeues mutation), `conflict` (stores conflict record and dequeues mutation to prevent retry loop), `invalid` (logs rejection).
    - Pull batch: queries server changes with `sinceRevision > cursor`, applies updates or deletions to local SQLite tables without echoing outbox records.
    - Updates cursor to `nextCursor` and paginates while `hasMore` is true.
  - Sync state machine (`idle`, `syncing`, `offline`, `error`, `conflict`).
- Local Data Adoption and Conflict Resolution (`AdoptionService.cs`, `IConflictService.cs`):
  - Local data adoption upon initial account sign-in: prompts user to adopt existing local-only tasks, notes, follow-ups, daily plans, inbox captures, and task order by queueing them into outbox.
  - Conflict resolution: inspect conflicts, allow user to "Keep Local" (re-enqueues mutation with server revision as base) or "Keep Server" (overwrites local item with server value and discards conflict).
- Network and Notification Recovery (`NetworkRecoveryService.cs`):
  - Listen to network availability changes (`NetworkChange.NetworkAddressChanged` / `NetworkAvailabilityChanged`) and trigger sync catch-up when coming back online.
  - Window activation / resume sync check and due follow-up notification refresh.
- Account and Sync UI in Desktop WPF:
  - Account modal / dialog accessible from sidebar with sign-in, OTP verification, and authenticated profile view.
  - Sync status indicator badge in sidebar header (reflecting `idle`, `syncing`, `offline`, `error`, `conflict`).
  - Manual "Sync Now" button and local data adoption prompt.
  - Conflict resolution dialog comparing local and server fields side by side.
  - Active session list and account deletion confirmation.
- MSIX Packaging and Release Documentation:
  - `Package.appxmanifest` template for x64 and Arm64 MSIX packaging.
  - `apps/windows/PRIVACY.md`: Windows App privacy policy and data safety declarations.
  - `apps/windows/RELEASE.md`: Signed production packaging protocol, developer certificate instructions, and Store submission checklist.
- Automated Testing Suite:
  - Migration 3 schema integrity and index tests.
  - DPAPI encryption and round-trip decryption tests.
  - Auth client request and response parsing tests.
  - SyncEngine push, pull, receipt handling, and pagination tests.
  - Conflict resolution and local adoption unit tests.
  - Monorepo boundary verification and full verify suite.

## Out of scope

- Modifying existing web or mobile code.
- Multi-user collaboration, real-time WebSockets, or shared tenant workspaces.
- Third-party social login providers (Google, Microsoft, Apple OAuth).
- Commercial in-app purchases or subscription billing.

## Build loop

- Step review: feature (review after all steps are complete before /complete).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.
- Branch: `feature/wpf-api-integration-and-release-readiness`.

## Build steps

- [x] 1. **Implement SQLite Migration 3 and sync repository infrastructure**
  - Create embedded SQL migration `003_SyncEngine.sql` creating `outbox`, `sync_cursors`, `conflicts`, `tombstones`, and `server_revisions` tables with indexes.
  - Update `MigrationRunner.cs` to execute migration 3 in sequence.
  - Create domain models `OutboxMutationItem`, `SyncCursorItem`, `ConflictItem`, `TombstoneItem`, and `ServerRevisionItem`.
  - Create `ISyncRepository` and `SyncRepository` implementing outbox queueing, cursor persistence, revision tracking, conflict storage, and tombstone recording.
  - Update entity repositories to log outbox mutations transactionally when mutations occur.
  - Add unit tests in `TaskFlow.Tests` verifying migration 3, outbox queueing, and revision updates.
  - Done when migration 3 tests and sync repository unit tests pass.

- [x] 2. **Implement DPAPI session credential store and Auth API client**
  - Create `ISessionStore` and `DpapiSessionStore` using `System.Security.Cryptography.ProtectedData` for secure Windows user-bound credential storage.
  - Create `IAuthService` and `AuthService` using `HttpClient` to communicate with `apps/web` API endpoints:
    - `POST /api/v1/auth/otp/request`
    - `POST /api/v1/auth/otp/verify`
    - `POST /api/v1/auth/refresh`
    - `POST /api/v1/auth/logout`
    - `GET /api/v1/auth/sessions` & `DELETE /api/v1/auth/sessions/{id}`
    - `GET /api/v1/account` & `DELETE /api/v1/account`
  - Add unit tests in `TaskFlow.Tests` verifying DPAPI round-trip encryption, OTP flow, token refresh, and session revocation.
  - Done when DPAPI and auth client unit tests pass cleanly.

- [x] 3. **Implement Windows Synchronization Engine**
  - Create `ISyncEngine` and `SyncEngine` executing the protocol version 1 sync loop against `POST /api/v1/sync`:
    - Push batch of queued outbox mutations with base revisions.
    - Process mutation receipts: `applied`, `duplicate`, `conflict`, and `invalid`.
    - Pull batch of server changes where `revision > cursor` and update local SQLite entities.
    - Advance cursor to `nextCursor` and paginate while `hasMore` is true.
  - Implement sync state machine (`idle`, `syncing`, `offline`, `error`, `conflict`) and retry backoff.
  - Add unit tests in `TaskFlow.Tests` verifying push/pull cycles, receipt handling, and cursor pagination with mock HTTP responses.
  - Done when all SyncEngine unit tests pass.

- [x] 4. **Implement local data adoption and conflict resolution**
  - Create `IAdoptionService` and `AdoptionService` to inspect existing local entities on sign-in and enqueue them into the outbox.
  - Create `IConflictService` and `ConflictService` providing "Keep Local" (re-queues with server revision as base) and "Keep Server" (replaces local entity with server payload) resolutions.
  - Add unit tests in `TaskFlow.Tests` verifying adoption mutation generation and conflict resolution actions.
  - Done when adoption and conflict resolution unit tests pass.

- [x] 5. **Implement network connectivity listener and notification recovery**
  - Create `INetworkRecoveryService` and `NetworkRecoveryService` using `System.Net.NetworkInformation.NetworkChange` to monitor connectivity.
  - Re-trigger background sync catch-up when transitioning from offline to online.
  - Re-check overdue and due follow-ups upon window activation or network reconnection.
  - Add unit tests in `TaskFlow.Tests` verifying network status changes and recovery dispatch.
  - Done when network recovery unit tests pass.

- [x] 6. **Implement Account and Sync ViewModels and desktop UI**
  - Create `AccountViewModel` managing email input, OTP code input, login/logout, session list, and account deletion.
  - Create `ConflictViewModel` managing pending conflicts, diff presentation, and resolution commands.
  - Update `MainViewModel` to integrate `AccountViewModel`, `SyncEngine`, and sync status indicator.
  - Update `MainWindow.xaml` with Account navigation destination/dialog, sync status badge, and conflict modal.
  - Add comprehensive ViewModel tests in `TaskFlow.Tests`.
  - Done when all ViewModels compile and pass unit tests.

- [x] 7. **Configure MSIX packaging, release documentation, and monorepo verification**
  - Add `Package.appxmanifest` template for x64 and Arm64 packaging.
  - Create `apps/windows/PRIVACY.md` detailing privacy protections, local-first storage, and optional cloud sync.
  - Create `apps/windows/RELEASE.md` documenting self-contained build, certificate signing, and Microsoft Store submission commands.
  - Run `npm run check:boundaries` to verify zero cross-application imports.
  - Run `npm run verify` across the monorepo to ensure mobile, web, and windows suites pass.
  - Done when `npm run verify` exits with code 0.

## Files / areas

- `apps/windows/TaskFlow/Data/Migrations/003_SyncEngine.sql`
- `apps/windows/TaskFlow/Data/MigrationRunner.cs`
- `apps/windows/TaskFlow/Models/OutboxMutationItem.cs`
- `apps/windows/TaskFlow/Models/SyncCursorItem.cs`
- `apps/windows/TaskFlow/Models/ConflictItem.cs`
- `apps/windows/TaskFlow/Models/TombstoneItem.cs`
- `apps/windows/TaskFlow/Models/ServerRevisionItem.cs`
- `apps/windows/TaskFlow/Models/SessionCredentials.cs`
- `apps/windows/TaskFlow/Repositories/ISyncRepository.cs`
- `apps/windows/TaskFlow/Repositories/SyncRepository.cs`
- `apps/windows/TaskFlow/Repositories/TaskRepository.cs`
- `apps/windows/TaskFlow/Repositories/NoteRepository.cs`
- `apps/windows/TaskFlow/Repositories/FollowUpRepository.cs`
- `apps/windows/TaskFlow/Repositories/DailyPlanRepository.cs`
- `apps/windows/TaskFlow/Repositories/InboxRepository.cs`
- `apps/windows/TaskFlow/Repositories/TaskOrderRepository.cs`
- `apps/windows/TaskFlow/Services/ISessionStore.cs`
- `apps/windows/TaskFlow/Services/DpapiSessionStore.cs`
- `apps/windows/TaskFlow/Services/IAuthService.cs`
- `apps/windows/TaskFlow/Services/AuthService.cs`
- `apps/windows/TaskFlow/Services/ISyncEngine.cs`
- `apps/windows/TaskFlow/Services/SyncEngine.cs`
- `apps/windows/TaskFlow/Services/IAdoptionService.cs`
- `apps/windows/TaskFlow/Services/AdoptionService.cs`
- `apps/windows/TaskFlow/Services/IConflictService.cs`
- `apps/windows/TaskFlow/Services/ConflictService.cs`
- `apps/windows/TaskFlow/Services/INetworkRecoveryService.cs`
- `apps/windows/TaskFlow/Services/NetworkRecoveryService.cs`
- `apps/windows/TaskFlow/ViewModels/AccountViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/ConflictViewModel.cs`
- `apps/windows/TaskFlow/ViewModels/MainViewModel.cs`
- `apps/windows/TaskFlow/MainWindow.xaml`
- `apps/windows/TaskFlow/MainWindow.xaml.cs`
- `apps/windows/TaskFlow/Package.appxmanifest`
- `apps/windows/PRIVACY.md`
- `apps/windows/RELEASE.md`
- `apps/windows/TaskFlow.Tests/SyncRepositoryTests.cs`
- `apps/windows/TaskFlow.Tests/DpapiSessionStoreTests.cs`
- `apps/windows/TaskFlow.Tests/AuthServiceTests.cs`
- `apps/windows/TaskFlow.Tests/SyncEngineTests.cs`
- `apps/windows/TaskFlow.Tests/AdoptionServiceTests.cs`
- `apps/windows/TaskFlow.Tests/NetworkRecoveryTests.cs`
- `apps/windows/TaskFlow.Tests/AccountViewModelTests.cs`

## Data / contracts

- Sync Engine Protocol (Version 1):
  - Request: `POST /api/v1/sync` with `{ protocolVersion: 1, workspaceId, mutations: OutboxMutation[], sinceRevision: cursor, limit: 50 }`.
  - Mutation: `{ mutationId, protocolVersion: 1, entityType, entityId, action: "put" | "delete", baseRevision, payload }`.
  - Response: `{ status: "ok", receipts: MutationReceipt[], changes: ServerChange[], nextCursor: number, hasMore: boolean }`.
  - Mutation receipt outcomes: `applied`, `duplicate`, `conflict`, `invalid`.
- DPAPI Session Store Contract:
  - Encrypts byte array payload using `ProtectedData.Protect(data, optionalEntropy: null, DataProtectionScope.CurrentUser)`.
  - Decrypts byte array payload using `ProtectedData.Unprotect(data, optionalEntropy: null, DataProtectionScope.CurrentUser)`.
  - Stores access token, refresh token, user ID, email, and expiry timestamp in local application data directory.
- Local Data Adoption Contract:
  - When a user signs in for the first time on a device with local data, the app offers to adopt local entities into the account.
  - Adoption enqueues put mutations for all existing non-deleted local tasks, notes, follow-ups, daily plans, inbox captures, and task orders with `baseRevision: null`.
- Conflict Resolution Contract:
  - Keep Local: re-enqueues mutation with server revision as `baseRevision` and clears local conflict record.
  - Keep Server: updates local SQLite entity with `server_value` and clears local conflict record.
- Network Recovery Contract:
  - Network status monitored via `NetworkChange.NetworkAvailabilityChanged`.
  - When connection transitions to available, triggers an immediate background sync cycle if user is authenticated.

## Testing

- Unit tests in `SyncRepositoryTests.cs` verifying outbox operations, transaction boundary integration, and cursor persistence.
- Unit tests in `DpapiSessionStoreTests.cs` verifying secure encryption and decryption of session credentials.
- Unit tests in `AuthServiceTests.cs` verifying OTP request, token exchange, and refresh requests with mocked HTTP handlers.
- Unit tests in `SyncEngineTests.cs` verifying mutation push, change pull, receipt handling, and pagination.
- Unit tests in `AdoptionServiceTests.cs` and `NetworkRecoveryTests.cs` for entity queueing and reconnect triggers.
- Unit tests in `AccountViewModelTests.cs` for state transitions, validation, and command execution.
- Monorepo gate: `npm run verify` (boundary check, mobile typecheck + tests, web lint + tests + build, windows test + build).

## Notes for the AI

- Monorepo isolation is mandatory: never import or reference source files from `apps/web` or `apps/mobile` in `apps/windows`.
- Strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, or docs.
- Use strict C# nullable reference types (`<Nullable>enable</Nullable>`) and keep builds free of warnings.
- Keep ViewModels decoupled from Views so all logic is verifiable with xUnit.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":15941,"specSha256":"f5bc7df0991aa6b1b484d3341a4f46fd9b98690d29f06fd50cc25a5c954899b0","branch":"refs/heads/feature/wpf-api-integration-and-release-readiness","head":"f76b1be3a10daab073a6f8073f1383a8a9771be6","baseRef":"refs/heads/main","baseCommit":"f76b1be3a10daab073a6f8073f1383a8a9771be6","sourceTree":"4633c6af2dab479fbe2e32772713737886bf8561","absentOptional":[]} -->
