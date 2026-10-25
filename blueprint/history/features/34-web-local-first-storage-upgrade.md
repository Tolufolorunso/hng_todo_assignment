# Feature: Web local-first storage upgrade

**From build-plan:** feature 34
**Build attempt:** 1
**Branch:** feature/web-local-first-storage-upgrade
**Status:** verified

## Goal

Upgrade the web client persistence architecture to a workspace-aware local-first repository foundation in IndexedDB (version 9), adding stores for task ordering, outbox mutations, sync cursors, tombstones, and conflicts, with atomic mutation logging, legacy data migration to the default local workspace, and Backup format version 2 with backward-compatible version 1 restore.

## In scope

- IndexedDB Schema Upgrade (`apps/web/lib/db.ts`):
  - Increment `DB_VERSION` from 8 to 9.
  - Create new object stores:
    - `workspaces`: key `id`, storing `{ id, name, type, accountId, createdAt, updatedAt }`.
    - `task_orders`: key `id` (e.g. `default` or `workspaceId`), with index `workspaceId`.
    - `outbox`: key `mutationId`, with indexes `workspaceId` and `[workspaceId, createdAt]`.
    - `sync_cursors`: key `workspaceId`, storing `{ workspaceId, cursor, lastSyncedAt, updatedAt }`.
    - `tombstones`: key `id`, with index `workspaceId`.
    - `conflicts`: key `id`, with index `workspaceId` and `entityId`.
  - Migration from versions 1-8:
    - Seed default workspace with `id: "local"`.
    - Backfill `workspaceId: "local"` on all existing records across `tasks`, `notes`, `followups`, `followup_occurrences`, `daily_plans`, and `inbox_captures`.
    - Add `workspaceId` indexes to all entity stores.
- Web Repository Layer (`apps/web/lib/repository.ts`):
  - Workspace management:
    - Default workspace ID `"local"`.
    - Get and set active workspace ID.
  - Workspace-scoped repository operations for tasks, notes, follow-ups, occurrences, daily plans, inbox captures, and task orders.
  - Atomic outbox mutation recording:
    - When mutations are performed, optionally create an `OutboxMutation` in the same IndexedDB transaction with `mutationId`, `protocolVersion: 1`, `entityType`, `entityId`, `action: "put" | "delete"`, `baseRevision`, `payload`, and `createdAt`.
  - Sync state management:
    - Get and update cursor per workspace.
    - List and dequeue outbox mutations.
    - Record and list tombstones.
    - Record, list, and resolve local conflicts.
- Backup Version 2 & Migration (`apps/web/lib/backup.ts`):
  - Support `version: 2` backup payload containing full product entities (`tasks`, `notes`, `followups`, `followupOccurrences`, `dailyPlans`, `inboxCaptures`, `taskOrders`) with `format: "taskflow-backup-v2"` metadata.
  - Preserve backward compatibility for importing `version: 1` backups into the active workspace.
  - Enforce exclusion of sensitive state: credentials, account IDs, push subscriptions, outbox mutations, cursors, revisions, receipts, tombstones, and auth tokens.
  - Support both `merge` and `replace` restore modes for version 1 and version 2 backups.
- Testing:
  - Unit tests in `apps/web/lib/db.test.ts` verifying database upgrade to version 9, new store creation, and data backfilling.
  - Unit tests in `apps/web/lib/repository.test.ts` verifying workspace isolation, atomic outbox logging, task ordering, tombstone logging, conflict records, and cursor tracking.
  - Unit tests in `apps/web/lib/backup.test.ts` verifying backup v2 export, validation, v1 compatibility, and metadata exclusion.
  - Verification: `npm run verify`.

## Out of scope

- Network synchronization worker and background intervals (scheduled for Feature 35).
- Web sign-in UI and account authentication flow (scheduled for Feature 35).
- Multi-tab BroadcastChannel synchronization (scheduled for Feature 35).
- Push notification subscription management (scheduled for Feature 36).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. IndexedDB schema upgrade to version 9 with workspace stores and migration.
  - Update `apps/web/lib/db.ts` to `DB_VERSION = 9`.
  - Add `workspaces`, `task_orders`, `outbox`, `sync_cursors`, `tombstones`, and `conflicts` object stores.
  - Backfill `workspaceId: "local"` on all existing records and create default `"local"` workspace record.
  - Add `workspaceId` indexes to all productivity stores.
  - Done when: unit tests in `apps/web/lib/db.test.ts` verify store creation, index configuration, and legacy data migration to version 9.

- [x] 2. Web repository boundaries with workspace scoping and atomic outbox logging.
  - Implement `apps/web/lib/repository.ts` providing workspace-scoped access to tasks, notes, follow-ups, occurrences, plans, inbox captures, and task orders.
  - Implement atomic outbox mutation logging within the same IndexedDB transaction for local writes and deletes.
  - Implement cursor tracking, tombstone recording, and conflict storage APIs.
  - Done when: unit tests in `apps/web/lib/repository.test.ts` verify workspace scoping, atomic outbox enqueuing, task order persistence, tombstone generation, conflict tracking, and cursor management.

- [x] 3. Backup format version 2 and backward-compatible import.
  - Update `apps/web/lib/backup.ts` to support version 2 backup format with metadata, full entity sets, and task ordering.
  - Ensure version 1 backup files remain valid and importable in both `merge` and `replace` modes.
  - Verify that outbox, cursors, tombstones, conflicts, and auth credentials are never exported in backups.
  - Done when: unit tests in `apps/web/lib/backup.test.ts` verify v2 export and import, v1 compatibility, and metadata exclusion, and `npm run verify` passes with zero errors.

## Files / areas

- `apps/web/lib/db.ts`: IndexedDB version 9 schema definition, store creation, and migration.
- `apps/web/lib/repository.ts`: web repository boundary, workspace scoping, outbox queue, and sync metadata.
- `apps/web/lib/backup.ts`: backup version 2 export, schema validation, and version 1 backward compatibility.
- `apps/web/lib/db.test.ts`: database schema upgrade and migration tests.
- `apps/web/lib/repository.test.ts`: repository unit tests.
- `apps/web/lib/backup.test.ts`: backup format version 1 and 2 tests.

## Data / contracts

- Outbox Mutation:
  ```json
  {
    "mutationId": "mut_123456",
    "workspaceId": "local",
    "protocolVersion": 1,
    "entityType": "task",
    "entityId": "tsk_abc",
    "action": "put",
    "baseRevision": null,
    "payload": {
      "id": "tsk_abc",
      "title": "Local Task",
      "completed": false
    },
    "createdAt": "2026-10-25T18:00:00.000Z",
    "retryCount": 0
  }
  ```
- Backup Version 2 Payload:
  ```json
  {
    "version": 2,
    "app": "TaskFlow",
    "exportedAt": "2026-10-25T18:00:00.000Z",
    "workspaceId": "local",
    "metadata": {
      "format": "taskflow-backup-v2",
      "exportedFrom": "web",
      "schemaVersion": 9
    },
    "data": {
      "tasks": [],
      "notes": [],
      "followups": [],
      "followupOccurrences": [],
      "dailyPlans": [],
      "inboxCaptures": [],
      "taskOrders": []
    }
  }
  ```
- Local Conflict Record:
  ```json
  {
    "id": "cnf_123456",
    "workspaceId": "local",
    "entityType": "task",
    "entityId": "tsk_abc",
    "baseRevision": 1,
    "serverRevision": 2,
    "currentServerEntity": { "id": "tsk_abc", "title": "Server Task", "revision": 2 },
    "attemptedMutation": { ... },
    "status": "open",
    "detectedAt": "2026-10-25T18:00:00.000Z"
  }
  ```

## Testing

- `apps/web/lib/db.test.ts`:
  - Verify migration from versions 1-8 to version 9 creates all new stores and indexes.
  - Verify legacy tasks, notes, followups, occurrences, plans, and captures receive `workspaceId: "local"`.
- `apps/web/lib/repository.test.ts`:
  - Verify writes to task repository persist entity and append mutation to outbox in single transaction.
  - Verify reads filter by active workspace.
  - Verify task reordering updates `task_orders` and enqueues task order mutation.
  - Verify conflict recording and resolution.
  - Verify cursor retrieval and updates.
- `apps/web/lib/backup.test.ts`:
  - Verify `buildBackupPayload` exports version 2 schema with all entity stores.
  - Verify `parseAndValidateBackup` accepts both valid v1 and v2 payloads and rejects malformed payloads.
  - Verify `restoreDatabaseBackup` imports v1 payload and converts records into active workspace.
  - Verify `restoreDatabaseBackup` imports v2 payload in merge and replace modes.
  - Verify no outbox, cursor, tombstone, or auth state is ever included in backup payloads.
- Full verification: `npm run verify`.

## Notes for the AI

- Writing style: strictly zero em dashes (—), en dashes (–), or ellipsis characters across all code, comments, commit messages, and chat responses.
- Backward compatibility: existing users with database version 8 must smoothly upgrade without losing tasks, notes, follow-ups, daily plans, or inbox captures.
- Isolation: never mix mutations or entities between different workspaces.
- Security: never include authentication tokens, session identifiers, or account secrets in backups.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9202,"specSha256":"36a87adf7feb95b3dd8ee3cd908a91aabd94d351270923f6bd8990cf8ed20e4e","branch":"refs/heads/feature/web-local-first-storage-upgrade","head":"0ed0999c6e0d22dd23101fb503a012b9cdd26ad8","baseRef":"refs/heads/main","baseCommit":"0ed0999c6e0d22dd23101fb503a012b9cdd26ad8","sourceTree":"0c062c0bdc3c8366f823964ff8d8fbf0dae8a423","absentOptional":[]} -->
