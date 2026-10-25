# Feature: Synchronization and conflict engine

**From build-plan:** feature 33
**Build attempt:** 1
**Branch:** feature/synchronization-and-conflict-engine
**Status:** verified

## Goal

Provide a robust, account-scoped batch synchronization and conflict resolution engine via `POST /api/v1/sync`, allowing client devices to push bounded local mutations and pull paginated cloud updates across all productivity entity types with monotonic revision tracking, idempotency receipts, deletion tombstones, and recoverable conflict detection.

## In scope

- Database migration:
  - Add `apps/web/server/db/migrations/004_sync_mutation_receipts.sql` creating `sync_mutation_receipts` table with `account_id`, `mutation_id`, `entity_type`, `entity_id`, `action`, `status` (`applied`, `duplicate`, `conflict`, `invalid`), `applied_revision`, `conflict_details`, and `created_at` timestamp.
- Synchronization Engine (`apps/web/server/sync.ts`):
  - Strict tenant boundary: all mutations, receipts, entity lookups, and change streams are scoped by `account_id`.
  - Batch validation & limits: enforce maximum 100 mutations per push batch, maximum 200 items per pull page, and protocol version 1.
  - Idempotent mutation processing:
    - Deduplicate requests by checking existing mutation IDs in `sync_mutation_receipts`. If previously processed, replay the existing receipt without duplicate mutations or revision bumps.
  - Concurrency & conflict detection:
    - Compare incoming mutation `baseRevision` against current entity `revision`.
    - If current server entity revision is strictly greater than client `baseRevision`, record and return a `conflict` receipt containing the current server entity and current server revision, preserving the server state without clobbering.
    - If `baseRevision` matches (or entity does not exist for create), apply the mutation:
      - `put`: validate, sanitize HTML, write entity, advance revision cursor via `sync_revisions`, record receipt with status `applied`.
      - `delete`: delete entity from table, insert tombstone in `tombstones` table, advance revision cursor, record receipt with status `applied`.
  - Stable occurrence handling:
    - Guard follow-up occurrence completion mutations against duplicate logs for the same scheduled occurrence.
  - Paginated change stream (pull):
    - Query entities modified with `revision > cursor` and tombstones with `revision > cursor` across tasks, notes, follow-ups, daily plans, inbox captures, task orders, and tombstones.
    - Slice results up to the requested limit (default 100, max 200).
    - Return `nextCursor` (highest revision observed) and `hasMore` flag.
- Versioned Route Handler (`apps/web/app/api/v1/sync/route.ts`):
  - `POST /api/v1/sync`: authenticated via Bearer token, enforces `Cache-Control: no-store, private` header, validates request body schema, and handles database unavailability with RFC 7807 503 details.
- OpenAPI Specification & Documentation:
  - Update `apps/web/server/openapi.ts` documenting `POST /sync` with comprehensive `SyncRequest`, `SyncMutation`, `SyncReceipt`, `SyncResponse`, and `SyncChanges` schemas.
  - Update `AGENTS.md` documenting `/api/v1/sync`.
- Testing:
  - Unit tests in `apps/web/server/sync.test.ts` testing mutation application, idempotency replaying, stale baseRevision conflict detection, tombstone creation, and cursor pagination.
  - Route tests in `apps/web/server/sync-routes.test.ts` testing 401 unauthenticated access, 400 bad request validation, 503 database unavailable, and private cache headers.
  - Full verification: `npm run verify`.

## Out of scope

- Client-side IndexedDB bidirectional sync worker and outbox management (scheduled for Feature 34 / 35).
- Web closed-app push notification dispatching (scheduled for Feature 36).
- Custom multi-way three-way merge algorithms (TaskFlow preserves server state and returns server entity on conflict for client-side resolution).
- Real-time WebSocket subscriptions or Server-Sent Events.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Mutation receipts migration and sync engine core.
  - Create migration `apps/web/server/db/migrations/004_sync_mutation_receipts.sql`.
  - Implement sync module in `apps/web/server/sync.ts` with tenant scoping, mutation deduplication, concurrency checking, conflict recording, and change cursor queries.
  - Done when: unit tests in `apps/web/server/sync.test.ts` verify idempotent replaying, conflict detection on stale baseRevision, tombstone generation, and cursor pagination.

- [x] 2. Authenticated Sync Route Handler.
  - Implement `POST /api/v1/sync` in `apps/web/app/api/v1/sync/route.ts`.
  - Enforce Bearer token authentication, body schema validation, batch limits, and `Cache-Control: no-store, private` response header.
  - Done when: integration tests in `apps/web/server/sync-routes.test.ts` verify 401 rejection, 400 schema validation, 503 database unconfigured handling, and response header compliance.

- [x] 3. OpenAPI specification, documentation, and verification.
  - Update `apps/web/server/openapi.ts` with complete schemas and endpoint definitions for `POST /sync`.
  - Update `AGENTS.md` documenting the `/api/v1/sync` endpoint.
  - Run `npm run verify` ensuring boundary compliance, zero lint errors, all tests passing, and successful production build.
  - Done when: `npm run verify` exits with code 0 across all applications and tests.

## Files / areas

- `apps/web/server/db/migrations/004_sync_mutation_receipts.sql`: mutation receipts table migration.
- `apps/web/server/sync.ts`: synchronization and conflict detection module.
- `apps/web/app/api/v1/sync/route.ts`: batch sync Route Handler.
- `apps/web/server/openapi.ts`: OpenAPI 3.1 specification for sync schemas.
- `AGENTS.md`: documented API endpoints.
- `apps/web/server/sync.test.ts`: sync engine unit tests.
- `apps/web/server/sync-routes.test.ts`: sync route integration tests.

## Data / contracts

- Sync Request:
  ```json
  {
    "protocolVersion": 1,
    "mutations": [
      {
        "mutationId": "mut_abc123",
        "entityType": "task",
        "entityId": "tsk_456",
        "action": "put",
        "baseRevision": 2,
        "payload": {
          "title": "Updated Task",
          "completed": true
        }
      }
    ],
    "cursor": 10,
    "limit": 100
  }
  ```
- Sync Response:
  ```json
  {
    "protocolVersion": 1,
    "receipts": [
      {
        "mutationId": "mut_abc123",
        "status": "applied",
        "entityType": "task",
        "entityId": "tsk_456",
        "appliedRevision": 11
      }
    ],
    "changes": {
      "tasks": [],
      "notes": [],
      "followups": [],
      "occurrences": [],
      "plans": [],
      "inbox": [],
      "taskOrder": null,
      "tombstones": []
    },
    "nextCursor": 11,
    "hasMore": false,
    "serverTime": "2026-10-25T18:00:00.000Z"
  }
  ```
- Conflict Receipt:
  ```json
  {
    "mutationId": "mut_conflict1",
    "status": "conflict",
    "entityType": "task",
    "entityId": "tsk_456",
    "conflictDetails": {
      "message": "Entity was modified on the server after client base revision",
      "serverRevision": 10,
      "currentServerEntity": {
        "id": "tsk_456",
        "title": "Server Version",
        "revision": 10
      }
    }
  }
  ```

## Testing

- Unit tests in `apps/web/server/sync.test.ts`:
  - Mutation idempotency: duplicate mutation ID returns previously recorded receipt without advancing cursor.
  - Conflict detection: baseRevision lower than server entity revision returns conflict receipt with server entity.
  - Mutation application: valid put/delete advances revision and persists changes.
  - Deletion tombstone propagation: entity delete creates tombstone returned in change stream.
  - Cursor pagination: changes with revision greater than cursor are returned up to limit with `nextCursor`.
- Route tests in `apps/web/server/sync-routes.test.ts`:
  - 401 Unauthorized returned when unauthenticated.
  - 400 Bad Request returned on invalid mutation structure or exceeding batch limit (100).
  - 503 Database Unavailable returned when database is unconfigured.
  - `Cache-Control: no-store, private` header verified on response.
- Full verification: `npm run verify`.

## Notes for the AI

- Writing style: strictly zero em dashes (—), en dashes (–), or ellipsis characters.
- Tenant isolation: every query on entity tables, receipts, or tombstones must include `WHERE account_id = $...`.
- Resilience: gracefully return 503 RFC 7807 problem details when database is unconfigured.
- Concurrency: server revisions, not client clocks, decide winners.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8887,"specSha256":"817376c3148c2978694e7420ea46ae3859c5052c6c4b45faca5860e5f3eadefa","branch":"refs/heads/feature/synchronization-and-conflict-engine","head":"882373a55104a6b0c13e60080f0847a0a813f319","baseRef":"refs/heads/main","baseCommit":"882373a55104a6b0c13e60080f0847a0a813f319","sourceTree":"9198ad7518678add246e7dfcb6c35bfb1ce5fefa","absentOptional":[]} -->
