# Feature: Web API and PostgreSQL foundation

**From build-plan:** feature 30
**Build attempt:** 1
**Branch:** feature/web-api-and-postgresql-foundation
**Status:** verified

## Goal

Establish the server-side API foundation and PostgreSQL persistence layer inside `apps/web`, providing versioned `/api/v1` Route Handlers, database connection pooling and schema migrations, structured RFC 7807 error handling and validation, an OpenAPI 3.1 contract specification, health and capabilities endpoints, rate limiting, and deployment configuration.

## In scope

- PostgreSQL database layer inside `apps/web/server/db/`:
  - Connection pool manager in `apps/web/server/db/client.ts` with connection verification and graceful offline/unconfigured handling when `DATABASE_URL` is omitted.
  - Initial schema migration `001_initial_schema.sql` defining relational tables for accounts, sessions, tasks, notes, follow-ups, occurrence history, daily plans, inbox captures, sync revisions, and deletion tombstones with indexes and foreign keys.
  - Idempotent migration runner in `apps/web/server/db/migrate.ts` tracking applied versions in `schema_migrations`.
  - Database migration script `npm run db:migrate` in `apps/web/package.json` and delegating root `package.json`.
- Structured API response and error formatting:
  - Error shapes in `apps/web/server/errors.ts` returning standard problem details with code, message, field-level details, and timestamps.
  - Request parsing and schema validation utilities in `apps/web/server/validation.ts`.
- Rate limiting and security controls:
  - Sliding-window rate limiter in `apps/web/server/rate-limit.ts` providing standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`) and HTTP 429 responses.
  - Standard CORS and security headers for API responses.
- Versioned public Route Handlers:
  - `GET /api/v1/health` in `apps/web/app/api/v1/health/route.ts`: returns service status, timestamp, uptime, and database connectivity.
  - `GET /api/v1/capabilities` in `apps/web/app/api/v1/capabilities/route.ts`: exposes API version `1.0.0`, protocol capabilities, entity limits, and supported authentication mechanisms.
  - `GET /api/v1/openapi.json` in `apps/web/app/api/v1/openapi.json/route.ts`: serves valid OpenAPI 3.1 documentation covering the full planned `/api/v1` surface.
- Configuration and documentation:
  - Environment configuration template `apps/web/.env.example`.
  - Updated `AGENTS.md` documenting API routes and migration commands.
- Testing:
  - Server unit tests in `apps/web/server/*.test.ts` for database client fallback, migration runner, rate limiting, error responses, and route handlers.
  - Full verification: `npm run verify` (boundary check, lint, tests, build).

## Out of scope

- OTP email authentication logic or session cookies (scheduled for Milestone J / Feature 31).
- Cloud data CRUD endpoints or synchronization push/pull batches (scheduled for Milestone J / Feature 32 and 33).
- Web-push reminder scheduling and dispatcher (scheduled for Milestone K / Feature 36).
- Heavy ORMs or external migration tools (Prisma, Drizzle, etc.; lightweight native SQL migrations satisfy established requirements with zero extra abstraction layers).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. PostgreSQL connection pooling, initial schema migrations, and migration runner.
  - Install `pg` and `@types/pg` in `apps/web`.
  - Create connection manager in `apps/web/server/db/client.ts` with connection verification and safe fallback when `DATABASE_URL` is unset.
  - Write `apps/web/server/db/migrations/001_initial_schema.sql` defining cloud tables (`accounts`, `sessions`, `tasks`, `notes`, `followups`, `occurrence_history`, `daily_plans`, `inbox_captures`, `sync_revisions`, `tombstones`).
  - Implement migration runner in `apps/web/server/db/migrate.ts` with schema version tracking.
  - Add `db:migrate` script in `apps/web/package.json` and root `package.json`.
  - Done when: unit tests in `apps/web/server/db.test.ts` verify migration SQL syntax, tracking logic, and client fallback.

- [x] 2. Structured errors, request validation, and rate limiting.
  - Create `apps/web/server/errors.ts` for consistent JSON error responses with stable error codes.
  - Create `apps/web/server/validation.ts` for request payload, query, and parameter validation.
  - Create `apps/web/server/rate-limit.ts` providing sliding-window rate limiting with standard response headers.
  - Done when: unit tests in `apps/web/server/api.test.ts` verify error serialization, validation failures, and rate limit enforcement.

- [x] 3. Versioned Route Handlers: health, capabilities, and OpenAPI documentation.
  - Implement `apps/web/app/api/v1/health/route.ts` reporting API status and database health.
  - Implement `apps/web/app/api/v1/capabilities/route.ts` reporting API version, supported features, and entity limits.
  - Implement `apps/web/app/api/v1/openapi.json/route.ts` and specification module `apps/web/server/openapi.ts`.
  - Done when: all three route handlers return valid JSON responses with appropriate headers and HTTP status codes.

- [x] 4. Configuration, documentation, and full monorepo verification.
  - Add `apps/web/.env.example` with documented environment variables.
  - Update `AGENTS.md` with API routes and migration commands.
  - Done when: `npm run verify` (boundary check, lint, tests, build) passes with zero errors.

## Files / areas

- `apps/web/server/db/client.ts`: PostgreSQL connection pool and health check.
- `apps/web/server/db/migrations/001_initial_schema.sql`: relational schema definition.
- `apps/web/server/db/migrate.ts`: migration runner and schema version tracker.
- `apps/web/server/errors.ts`: RFC 7807 problem detail response helper.
- `apps/web/server/validation.ts`: request validation utilities.
- `apps/web/server/rate-limit.ts`: sliding-window rate limiter.
- `apps/web/server/openapi.ts`: OpenAPI 3.1 document definition.
- `apps/web/app/api/v1/health/route.ts`: health check endpoint.
- `apps/web/app/api/v1/capabilities/route.ts`: capabilities endpoint.
- `apps/web/app/api/v1/openapi.json/route.ts`: OpenAPI document endpoint.
- `apps/web/.env.example`: server environment variable template.
- `package.json`: root delegation script for `db:migrate`.
- `AGENTS.md`: documented API endpoints and commands.

## Data / contracts

- Error Response Contract:
  ```json
  {
    "error": {
      "code": "BAD_REQUEST | NOT_FOUND | RATE_LIMITED | DATABASE_UNAVAILABLE | INTERNAL_ERROR",
      "message": "Human readable explanation",
      "details": null,
      "timestamp": "2026-10-25T15:00:00.000Z"
    }
  }
  ```
- Health Response Contract (`GET /api/v1/health`):
  ```json
  {
    "status": "ok | degraded",
    "version": "1.0.0",
    "timestamp": "2026-10-25T15:00:00.000Z",
    "database": {
      "status": "connected | unconfigured | disconnected",
      "latencyMs": 5
    }
  }
  ```
- Capabilities Response Contract (`GET /api/v1/capabilities`):
  ```json
  {
    "version": "1.0.0",
    "protocolVersion": 1,
    "auth": ["otp"],
    "entities": ["tasks", "notes", "followups", "plans", "inbox"],
    "limits": {
      "taskTitleMaxLength": 200,
      "taskDescriptionMaxLength": 20000,
      "noteTitleMaxLength": 200,
      "noteBodyMaxLength": 50000,
      "followupNameMaxLength": 200,
      "inboxTextMaxLength": 20000
    }
  }
  ```

## Testing

- Unit tests in `apps/web/server/db.test.ts` for database connection, health checks, and migration runner.
- Unit tests in `apps/web/server/api.test.ts` for error formatting, request validation, and rate limiter.
- Route tests in `apps/web/server/routes.test.ts` for `/api/v1/health`, `/api/v1/capabilities`, and `/api/v1/openapi.json`.
- Full verification: `npm run verify`.

## Notes for the AI

- Writing style: strictly zero em dashes (—), en dashes (–), or ellipsis characters.
- Server isolation: all database connections and migrations must run only on the server, never bundled into client components.
- Zero client breakage: when `DATABASE_URL` is not configured, web UI and client routes must continue working offline with IndexedDB.
- Idempotent migrations: running migrations multiple times must execute safely without re-applying existing versions.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8547,"specSha256":"a9acf00420c6feeef65606d2a72ada841c8cede024721c859ac3f9c8231aa828","branch":"refs/heads/feature/web-api-and-postgresql-foundation","head":"383fa25159d90fbdf5d14c07bfffaa63fec8689b","baseRef":"refs/heads/main","baseCommit":"383fa25159d90fbdf5d14c07bfffaa63fec8689b","sourceTree":"89a46873aad5f963b84d77fdb4ee5775d218cd85","absentOptional":[]} -->
