# Feature: Cloud productivity persistence

**From build-plan:** feature 32
**Build attempt:** 1
**Branch:** feature/cloud-productivity-persistence
**Status:** verified

## Goal

Provide account-scoped PostgreSQL persistence and versioned Route Handlers for tasks, notes, follow-ups, occurrence history, daily plans, inbox captures, and task-order documents, enforcing strict ownership boundaries, HTML sanitization, recurrence validation, monotonic revisions, and deletion tombstones.

## In scope

- Database schema migration:
  - Add `apps/web/server/db/migrations/003_task_orders.sql` creating `task_orders` table with foreign key to accounts, JSONB task IDs array, revision counter, and timestamp.
- Server productivity persistence module (`apps/web/server/productivity.ts`):
  - Strict tenant scoping: every query is scoped by `account_id` so accounts can never read, modify, or delete another account's entities.
  - Change sequencing and revisions: incrementing revision counters per entity mutation and advancing account cursor in `sync_revisions`.
  - Deletion tombstones: recording entity deletion events in `tombstones` table with account ID, entity type, deletion timestamp, and revision.
  - HTML sanitization: running rich-text descriptions and note bodies through `sanitizeHtml` to whitelist formatting tags and strip scripts/event-handlers.
  - Recurrence validation for follow-ups (frequency, interval, weekdays, end dates).
  - Validation rules matching entity limits (task titles max 200 chars, note bodies max 50000 chars, inbox text max 20000 chars).
  - Full CRUD operations for:
    - Tasks (`createTask`, `getTask`, `listTasks`, `updateTask`, `deleteTask`).
    - Notes (`createNote`, `getNote`, `listNotes`, `updateNote`, `deleteNote`).
    - Follow-ups and occurrence history (`createFollowUp`, `getFollowUp`, `listFollowUps`, `updateFollowUp`, `deleteFollowUp`, `recordFollowUpOccurrence`, `listOccurrenceHistory`).
    - Daily plans (`upsertDailyPlan`, `getDailyPlanByDate`, `listDailyPlans`).
    - Inbox captures (`createInboxCapture`, `getInboxCapture`, `listInboxCaptures`, `updateInboxCapture`, `deleteInboxCapture`).
    - Task orders (`getTaskOrder`, `setTaskOrder`).
- Versioned Route Handlers under `apps/web/app/api/v1/`:
  - Tasks:
    - `GET /api/v1/tasks`: list account tasks with optional category/status filters.
    - `POST /api/v1/tasks`: create new account task.
    - `GET /api/v1/tasks/[id]`: retrieve single task.
    - `PATCH /api/v1/tasks/[id]`: update task fields.
    - `DELETE /api/v1/tasks/[id]`: delete task and record tombstone.
    - `GET /api/v1/tasks/order`: retrieve custom task ordering array.
    - `PUT /api/v1/tasks/order`: update custom task ordering array.
  - Notes:
    - `GET /api/v1/notes`: list account notes.
    - `POST /api/v1/notes`: create note with sanitized HTML body.
    - `GET /api/v1/notes/[id]`: retrieve single note.
    - `PATCH /api/v1/notes/[id]`: update note with sanitized body.
    - `DELETE /api/v1/notes/[id]`: delete note and record tombstone.
  - Follow-ups & Occurrences:
    - `GET /api/v1/followups`: list account follow-ups.
    - `POST /api/v1/followups`: create follow-up with recurrence validation.
    - `GET /api/v1/followups/[id]`: retrieve single follow-up.
    - `PATCH /api/v1/followups/[id]`: update follow-up fields.
    - `DELETE /api/v1/followups/[id]`: delete follow-up and record tombstone.
    - `GET /api/v1/followups/[id]/occurrences`: list completed occurrence history.
    - `POST /api/v1/followups/[id]/occurrences`: log completed occurrence.
  - Daily Plans:
    - `GET /api/v1/plans`: list recent daily plans.
    - `PUT /api/v1/plans`: create or update daily plan for a specific date.
    - `GET /api/v1/plans/[date]`: retrieve plan for date.
  - Inbox Captures:
    - `GET /api/v1/inbox`: list account inbox captures.
    - `POST /api/v1/inbox`: create rapid capture.
    - `GET /api/v1/inbox/[id]`: retrieve capture.
    - `PATCH /api/v1/inbox/[id]`: update capture state or target link.
    - `DELETE /api/v1/inbox/[id]`: delete capture and record tombstone.
- OpenAPI Specification & Documentation:
  - Update `apps/web/server/openapi.ts` documenting all productivity endpoints, request/response models, and error responses.
  - Update `AGENTS.md` documenting new route handlers.
- Testing:
  - Unit tests in `apps/web/server/productivity.test.ts` for database operations, HTML sanitization, recurrence validation, and tombstone tracking.
  - Route tests in `apps/web/server/productivity-routes.test.ts` testing authenticated CRUD, authorization barriers, and validation rejections.
  - Full verification: `npm run verify`.

## Out of scope

- Downstream batch synchronization engine and cursor pagination (scheduled for Feature 33).
- Conflict resolution strategies for concurrent multi-device sync (scheduled for Feature 33).
- Client-side IndexedDB bidirectional sync worker (scheduled for Milestone K / Feature 34).
- Automatic AI categorization or OCR processing of productivity items.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Task order migration and productivity persistence engine.
  - Create migration `apps/web/server/db/migrations/003_task_orders.sql` for custom task ordering document.
  - Implement productivity data layer in `apps/web/server/productivity.ts` with strict `account_id` query constraints.
  - Implement HTML sanitization on rich-text task descriptions and note bodies using `sanitizeHtml`.
  - Implement recurrence rule validation for recurring commitments.
  - Implement revision sequencing and deletion tombstone logging.
  - Done when: unit tests in `apps/web/server/productivity.test.ts` verify tenant scoping, input sanitization, revision incrementing, tombstone recording, and unconfigured database handling.

- [x] 2. Authenticated Route Handlers for Tasks, Notes, and Task Orders.
  - Implement `GET /api/v1/tasks` and `POST /api/v1/tasks` in `apps/web/app/api/v1/tasks/route.ts`.
  - Implement `GET /api/v1/tasks/[id]`, `PATCH /api/v1/tasks/[id]`, and `DELETE /api/v1/tasks/[id]` in `apps/web/app/api/v1/tasks/[id]/route.ts`.
  - Implement `GET /api/v1/tasks/order` and `PUT /api/v1/tasks/order` in `apps/web/app/api/v1/tasks/order/route.ts`.
  - Implement `GET /api/v1/notes` and `POST /api/v1/notes` in `apps/web/app/api/v1/notes/route.ts`.
  - Implement `GET /api/v1/notes/[id]`, `PATCH /api/v1/notes/[id]`, and `DELETE /api/v1/notes/[id]` in `apps/web/app/api/v1/notes/[id]/route.ts`.
  - Done when: unit tests in `apps/web/server/productivity-routes.test.ts` verify authenticated access, validation rejection, 401 unauthenticated protection, and 404 on missing/foreign items.

- [x] 3. Authenticated Route Handlers for Follow-ups, Occurrences, Daily Plans, and Inbox Captures.
  - Implement `GET /api/v1/followups` and `POST /api/v1/followups` in `apps/web/app/api/v1/followups/route.ts`.
  - Implement `GET /api/v1/followups/[id]`, `PATCH /api/v1/followups/[id]`, and `DELETE /api/v1/followups/[id]` in `apps/web/app/api/v1/followups/[id]/route.ts`.
  - Implement `GET /api/v1/followups/[id]/occurrences` and `POST /api/v1/followups/[id]/occurrences` in `apps/web/app/api/v1/followups/[id]/occurrences/route.ts`.
  - Implement `GET /api/v1/plans` and `PUT /api/v1/plans` in `apps/web/app/api/v1/plans/route.ts`.
  - Implement `GET /api/v1/plans/[date]` in `apps/web/app/api/v1/plans/[date]/route.ts`.
  - Implement `GET /api/v1/inbox` and `POST /api/v1/inbox` in `apps/web/app/api/v1/inbox/route.ts`.
  - Implement `GET /api/v1/inbox/[id]`, `PATCH /api/v1/inbox/[id]`, and `DELETE /api/v1/inbox/[id]` in `apps/web/app/api/v1/inbox/[id]/route.ts`.
  - Done when: integration tests verify follow-up recurrence validation, occurrence logging, daily plan date scoping, and inbox capture processing status updates.

- [x] 4. OpenAPI documentation, configuration, and verification.
  - Update `apps/web/server/openapi.ts` with complete schemas and endpoint definitions for all productivity resources.
  - Update `AGENTS.md` documenting new Route Handlers.
  - Run `npm run verify` ensuring boundary compliance, zero lint errors, all tests passing, and successful production build.
  - Done when: `npm run verify` exits with code 0 across all applications and tests.

## Files / areas

- `apps/web/server/db/migrations/003_task_orders.sql`: task order table migration.
- `apps/web/server/productivity.ts`: cloud productivity persistence module.
- `apps/web/app/api/v1/tasks/route.ts`: tasks collection Route Handler.
- `apps/web/app/api/v1/tasks/[id]/route.ts`: individual task Route Handler.
- `apps/web/app/api/v1/tasks/order/route.ts`: task order Route Handler.
- `apps/web/app/api/v1/notes/route.ts`: notes collection Route Handler.
- `apps/web/app/api/v1/notes/[id]/route.ts`: individual note Route Handler.
- `apps/web/app/api/v1/followups/route.ts`: follow-ups collection Route Handler.
- `apps/web/app/api/v1/followups/[id]/route.ts`: individual follow-up Route Handler.
- `apps/web/app/api/v1/followups/[id]/occurrences/route.ts`: follow-up occurrence history Route Handler.
- `apps/web/app/api/v1/plans/route.ts`: daily plans collection Route Handler.
- `apps/web/app/api/v1/plans/[date]/route.ts`: single date daily plan Route Handler.
- `apps/web/app/api/v1/inbox/route.ts`: inbox captures collection Route Handler.
- `apps/web/app/api/v1/inbox/[id]/route.ts`: individual inbox capture Route Handler.
- `apps/web/server/openapi.ts`: OpenAPI 3.1 specification.
- `AGENTS.md`: documented API endpoints and architectural guidelines.
- `apps/web/server/productivity.test.ts`: persistence layer unit tests.
- `apps/web/server/productivity-routes.test.ts`: Route Handler integration tests.

## Data / contracts

- Task Entity (`tasks` table):
  ```json
  {
    "id": "tsk_123",
    "title": "Document API endpoints",
    "description": "<p>Include headers and responses</p>",
    "completed": false,
    "priority": "high",
    "dueDate": "2026-10-30",
    "category": "Engineering",
    "estimatedMinutes": 45,
    "sourceNoteId": null,
    "sourceExcerpt": null,
    "revision": 1,
    "createdAt": "2026-10-25T16:00:00.000Z",
    "updatedAt": "2026-10-25T16:00:00.000Z",
    "completedAt": null
  }
  ```
- Note Entity (`notes` table):
  ```json
  {
    "id": "not_123",
    "title": "Architecture Overview",
    "body": "<h1>Overview</h1><p>Relational persistence</p>",
    "revision": 1,
    "createdAt": "2026-10-25T16:00:00.000Z",
    "updatedAt": "2026-10-25T16:00:00.000Z"
  }
  ```
- FollowUp Entity (`followups` table):
  ```json
  {
    "id": "fol_123",
    "personName": "Alex Morgan",
    "commitment": "Review PR feedback",
    "details": null,
    "dueAt": "2026-10-28T14:00:00.000Z",
    "timeZone": "UTC",
    "emailAddress": "alex@example.com",
    "phoneNumber": null,
    "whatsappNumber": null,
    "preferredAction": "email",
    "recurrence": {
      "frequency": "weekly",
      "interval": 1,
      "weekDays": [3]
    },
    "status": "open",
    "revision": 1,
    "createdAt": "2026-10-25T16:00:00.000Z",
    "updatedAt": "2026-10-25T16:00:00.000Z"
  }
  ```
- Task Order Entity (`task_orders` table):
  ```json
  {
    "taskIds": ["tsk_1", "tsk_2", "tsk_3"],
    "revision": 1,
    "updatedAt": "2026-10-25T16:00:00.000Z"
  }
  ```
- Tombstone Entry (`tombstones` table):
  ```json
  {
    "id": "tsk_123",
    "entityType": "task | note | followup | daily_plan | inbox_capture",
    "deletedAt": "2026-10-25T16:30:00.000Z",
    "revision": 2
  }
  ```

## Testing

- Unit tests in `apps/web/server/productivity.test.ts`:
  - Enforce tenant boundaries (user cannot read or mutate another user's entity).
  - Verify rich-text sanitization cleans unsafe tags and preserves allowed formatting.
  - Verify recurrence validation rejects invalid frequency or days.
  - Verify revision incrementing and tombstone recording on entity deletion.
- Route Handler tests in `apps/web/server/productivity-routes.test.ts`:
  - 401 Unauthorized returned when no Bearer token provided.
  - 400 Bad Request returned on schema validation failures (e.g. title too long).
  - 404 Not Found returned when accessing an item owned by another account.
  - 503 Database Unavailable returned when `DATABASE_URL` is unconfigured.
- Full verification: `npm run verify`.

## Notes for the AI

- Writing style: strictly zero em dashes (—), en dashes (–), or ellipsis characters.
- Tenant isolation: never query an entity table without `WHERE account_id = $...`.
- Reentrancy and resilience: when `DATABASE_URL` is omitted, Route Handlers must return standard 503 RFC 7807 problem details with `DATABASE_UNAVAILABLE` code without throwing uncaught exceptions.
- Zero dependencies: reuse existing sanitization (`lib/html.ts`) and validation utilities (`server/validation.ts`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13004,"specSha256":"a8b3bc809a38538c6dc272adc2f5261adc97da4bcc14f7a11ca58db593a7f4ca","branch":"refs/heads/feature/cloud-productivity-persistence","head":"82d3fda469369f1fee002d812cb7b1503762cdf5","baseRef":"refs/heads/main","baseCommit":"82d3fda469369f1fee002d812cb7b1503762cdf5","sourceTree":"7ec8b5cf6e305bdae9e7256539c912e59137d526","absentOptional":[]} -->
