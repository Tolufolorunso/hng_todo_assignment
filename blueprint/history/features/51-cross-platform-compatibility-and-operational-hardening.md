# Feature: Cross-Platform Compatibility and Operational Hardening

**From build-plan:** feature 51
**Build attempt:** 1
**Status:** verified
**Branch:** feature/cross-platform-compatibility-and-operational-hardening

## Goal

Harden and verify the entire TaskFlow personal productivity suite across Web, Mobile (React Native / Expo), and Windows (WPF .NET 10). Establish shared behavioral contract test fixtures for recurrence, backup portability, and sync protocol semantics; verify migration failure recovery across all three storage engines; enforce cascade account deletion and rate-limiting abuse controls; validate notification failure handling; guarantee accessibility compliance across all three client experiences; verify content-free operational logging and synchronized-mode privacy; and document production operations, observability, release rollback, and incident recovery procedures.

## In scope

- Shared Non-Runtime Contract Fixtures (`fixtures/`):
  - `fixtures/recurrence.json`: Canonical test vectors for calendar-anchored and completion-relative recurrence schedules across month boundaries, leap years, and daylight-saving transitions.
  - `fixtures/backups/v1-valid.json`: Valid legacy version 1 backup fixture (tasks and notes only).
  - `fixtures/backups/v2-valid.json`: Valid version 2 multi-entity backup fixture (tasks, notes, follow-ups, occurrences, daily plans, inbox captures, task order, source note relationships).
  - `fixtures/backups/v2-corrupted.json`: Corrupted/malformed backup test vectors for rejection verification.
  - `fixtures/sync-protocol.json`: Protocol version 1 mutation, conflict, and receipt test vectors.
- Recurrence Consistency Across All Three Platforms:
  - Web: Vitest fixture runner testing `apps/web/lib/recurrence.ts` against `fixtures/recurrence.json`.
  - Mobile: Vitest fixture runner testing `apps/mobile/src/services/recurrence.ts` against `fixtures/recurrence.json`.
  - Windows: xUnit fixture runner testing `apps/windows/TaskFlow/Services/RecurrenceEngine.cs` against `fixtures/recurrence.json`.
  - Guaranteed identical next occurrence calculation across all clients.
- Backup Portability and Migration Recovery:
  - Cross-client backup round-trip verification: Web export imported by Mobile and Windows; Mobile export imported by Web and Windows; Windows export imported by Web and Mobile.
  - Storage migration failure and idempotency tests:
    - Web: IndexedDB schema migration recovery in `apps/web/lib/db.ts`.
    - Mobile: SQLite migration runner recovery and idempotency across migrations 1, 2, and 3 in `apps/mobile/src/db/database.ts`.
    - Windows: SQLite migration runner recovery and idempotency across migrations 1, 2, and 3 in `apps/windows/TaskFlow/Data/MigrationRunner.cs`.
- Synchronization Hardening and Tombstone Protection:
  - Multi-device simulation tests in `apps/web/server/sync.test.ts`: concurrent mutations, idempotent receipts, conflict detection, cursor pagination.
  - Deletion tombstone verification: verifying that deleted entities cannot be resurrected by stale client put mutations.
- Account Deletion and Abuse Controls:
  - Cascade verification for `DELETE /api/v1/account`: ensuring complete deletion of user tasks, notes, followups, occurrences, plans, inbox captures, task orders, outbox receipts, tombstones, push subscriptions, and sessions.
  - Rate limiting and abuse protection on `POST /api/v1/auth/otp/request` and `POST /api/v1/sync` mitigating brute-force and request flooding.
- Notification Failure and Permission Recovery:
  - Web: 410 Gone / expired push subscription handling in `apps/web/server/push-dispatcher.ts`, clearing invalidated subscriptions and updating delivery state.
  - Mobile: Notification permission denial graceful fallback and overdue catch-up on application resume.
  - Windows: Toast notification registration failure fallback and catch-up on window activation and network recovery.
- Accessibility and Privacy Alignment:
  - Web WCAG 2.1 AA audit: keyboard navigation (`G I`, `G C`, `G P`, `Cmd+K` / `Ctrl+K`), visible focus, ARIA live announcements.
  - Mobile accessibility audit: screen reader labels (`accessibilityLabel`, `accessibilityRole`), touch target compliance (>= 44x44 dp).
  - Windows accessibility audit: Narrator (`AutomationProperties.Name`, `AutomationProperties.HelpText`), high-contrast theme compatibility.
  - Content-free operational logging audit: verify route handlers omit sensitive fields (passwords, OTPs, session tokens, task descriptions, note bodies, contact info) from server logs.
  - Consistent privacy policy declarations across `apps/web/app/privacy/page.tsx`, `apps/mobile/PRIVACY.md`, `apps/windows/PRIVACY.md`, and root `PRIVACY.md`.
- Production Support, Observability, and Rollback Runbook (`docs/OPERATIONS.md`):
  - Health checks and readiness endpoints (`GET /api/v1/health`, `GET /api/v1/capabilities`).
  - Production release and rollback playbooks for Web (Vercel), Mobile (Google Play and App Store), and Windows (Microsoft Store).
  - Database migration deployment and emergency rollback strategy.
  - Operational incident runbooks for sync desynchronization, push delivery failures, and auth outages.

## Out of scope

- Introducing shared runtime code packages between applications (monorepo boundary isolation remains strictly enforced).
- End-to-end encryption or multi-tenant team collaboration.
- Commercial telemetry or analytics tracking libraries.
- Third-party OAuth providers.

## Build loop

- Step review: feature (review after all steps are complete before /complete).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.
- Branch: `feature/cross-platform-compatibility-and-operational-hardening`.

## Build steps

- [x] 1. **Establish shared contract fixtures and verify cross-platform recurrence consistency**
  - Create directory `fixtures/` with `recurrence.json`, `sync-protocol.json`, `backups/v1-valid.json`, `backups/v2-valid.json`, and `backups/v2-corrupted.json`.
  - Define recurrence test cases covering calendar-anchored daily/weekly/monthly rules, completion-relative rules, month boundary rollovers, leap years (Feb 29), and daylight-saving time shifts.
  - Implement contract fixture tests in `apps/web/lib/recurrence.test.ts`, `apps/mobile/src/services/recurrence.test.ts`, and `apps/windows/TaskFlow.Tests/RecurrenceEngineTests.cs`.
  - Done when recurrence fixture tests pass across all three test runners with identical results.

- [x] 2. **Implement cross-platform backup portability and migration recovery tests**
  - Add backup portability tests in Web, Mobile, and Windows suites verifying each client can import fixtures exported by the other two platforms without data loss.
  - Add negative validation tests verifying all three clients reject malformed/corrupted backup files cleanly with informative error messages.
  - Add database migration recovery tests for Web (`apps/web/lib/db.test.ts`), Mobile (`apps/mobile/src/db/database.test.ts`), and Windows (`apps/windows/TaskFlow.Tests/DatabaseMigrationTests.cs`) testing idempotency and recovery from aborted migrations.
  - Done when all backup portability and migration recovery tests pass.

- [x] 3. **Verify multi-device synchronization convergence and tombstone protection**
  - Add multi-device convergence tests in `apps/web/server/sync.test.ts` simulating concurrent client mutations, duplicate receipt replay, and conflicting updates.
  - Verify tombstone resurrection protection ensuring that an entity deleted by one client cannot be recreated or overwritten by a stale put mutation from another client.
  - Add cursor pagination edge-case tests validating that large change sets paginate correctly across client sync loops without skipped records.
  - Done when all synchronization convergence and tombstone tests pass.

- [x] 4. **Harden account deletion cascade and rate-limiting abuse controls**
  - Verify and test `DELETE /api/v1/account` in `apps/web/server/auth-routes.test.ts`, ensuring complete atomic cascade deletion across all PostgreSQL tables.
  - Implement rate limiting in `apps/web/server/rate-limit.ts` for `POST /api/v1/auth/otp/request` and `POST /api/v1/sync` to protect against brute-force attacks and denial-of-service abuse.
  - Add unit and integration tests verifying rate-limit enforcement and generic 429 Too Many Requests responses.
  - Done when account deletion and rate-limiting tests pass.

- [x] 5. **Verify notification failure handling and delivery recovery**
  - Test Web Push 410 Gone / unregistered subscription handling in `apps/web/server/push.test.ts`, verifying that invalid subscriptions are automatically pruned and delivery status surfaces in UI.
  - Verify Mobile notification permission denied handling and local schedule catch-up upon application resume in `apps/mobile/src/services/notifications.test.ts`.
  - Verify Windows notification failure handling and overdue reminder catch-up upon window activation in `apps/windows/TaskFlow.Tests/NetworkRecoveryTests.cs`.
  - Done when notification failure and recovery tests pass across all three applications.

- [x] 6. **Align cross-platform accessibility, privacy policies, and content-free logging**
  - Verify accessibility semantics: Web (WCAG 2.1 AA keyboard focus and ARIA labels), Mobile (VoiceOver/TalkBack attributes and touch target sizes), and Windows (Narrator AutomationProperties and contrast modes).
  - Create root `PRIVACY.md` summarizing the unified TaskFlow privacy commitments (local-first storage, zero telemetry, explicit cloud sync opt-in, content-free server logs), and align platform privacy documents.
  - Perform operational logging audit in `apps/web/server/` to ensure no sensitive fields (task content, note bodies, contact targets, OTP codes, session tokens) are emitted to logs.
  - Add test guarding content-free logging in `apps/web/server/routes.test.ts`.
  - Done when accessibility, privacy, and logging verification tests pass.

- [x] 7. **Create production operations runbook and run full monorepo verification**
  - Create `docs/OPERATIONS.md` containing operational procedures for health monitoring (`/api/v1/health`), release deployment, release rollback, database disaster recovery, and incident response playbooks.
  - Run `npm run check:boundaries` verifying zero cross-application imports.
  - Run `npm run verify` across the monorepo ensuring Mobile, Web, and Windows test suites and builds pass cleanly.
  - Done when `npm run verify` exits with code 0 and documentation is complete.

## Files / areas

- `fixtures/recurrence.json`
- `fixtures/sync-protocol.json`
- `fixtures/backups/v1-valid.json`
- `fixtures/backups/v2-valid.json`
- `fixtures/backups/v2-corrupted.json`
- `apps/web/lib/recurrence.test.ts`
- `apps/web/lib/backup.test.ts`
- `apps/web/lib/db.test.ts`
- `apps/web/server/sync.test.ts`
- `apps/web/server/auth-routes.test.ts`
- `apps/web/server/rate-limit.ts`
- `apps/web/server/push.test.ts`
- `apps/web/server/push-dispatcher.ts`
- `apps/web/server/routes.test.ts`
- `apps/mobile/src/services/recurrence.test.ts`
- `apps/mobile/src/services/backup.test.ts`
- `apps/mobile/src/db/database.test.ts`
- `apps/mobile/src/services/notifications.test.ts`
- `apps/windows/TaskFlow.Tests/RecurrenceEngineTests.cs`
- `apps/windows/TaskFlow.Tests/SyncEngineTests.cs`
- `apps/windows/TaskFlow.Tests/DatabaseMigrationTests.cs`
- `apps/windows/TaskFlow.Tests/NetworkRecoveryTests.cs`
- `PRIVACY.md`
- `docs/OPERATIONS.md`

## Data / contracts

- Recurrence Contract:
  - Calendar-anchored rule: retains wall-clock time and weekday across months, leap days, and daylight saving changes.
  - Completion-relative rule: next occurrence calculated from completed timestamp + interval duration.
- Backup Portability Contract:
  - Version 1 schema: tasks and notes.
  - Version 2 schema: tasks, notes, followups, occurrences, daily plans, inbox captures, task order, source note backlinks.
  - Strictly excludes tokens, credentials, push endpoints, cursors, tombstones.
- Sync Protocol v1 Hardening:
  - Stale revision put/delete results in explicit conflict status.
  - Tombstones prevent resurrection of deleted entities.
  - Mutation receipts are idempotent and reproducible across retries.
- Rate Limiting Contract:
  - `POST /api/v1/auth/otp/request`: limited by IP address and email target. Returns 429 when threshold exceeded.
  - `POST /api/v1/sync`: bounded payload size and request frequency limits.

## Testing

- Cross-platform recurrence consistency verified against `fixtures/recurrence.json` in Web, Mobile, and Windows test runners.
- Cross-platform backup portability verified against `fixtures/backups/` in all three runners.
- Database migration idempotency and failure recovery verified in all three storage layers.
- Multi-device sync convergence, receipt replay, and tombstone protection verified in `server/sync.test.ts`.
- Account cascade deletion and rate-limiting verified in web server test suite.
- Web push 410 Gone handling and client recovery verified.
- Monorepo gate: `npm run verify` (boundary check, mobile typecheck + tests, web lint + tests + build, windows test + build).

## Notes for the AI

- Monorepo isolation is mandatory: no application may import source code from another application.
- Strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, or docs.
- Use strict TypeScript and C# nullable types.
- Ensure all tests run offline without external network dependencies.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13531,"specSha256":"3a3f942c9ba479453001b43579f9dff41e85a5b5fd8100ba94455bfac166a57c","branch":"refs/heads/feature/cross-platform-compatibility-and-operational-hardening","head":"bf5e13fe3729516f895af906f0148f8e18574451","baseRef":"refs/heads/main","baseCommit":"bf5e13fe3729516f895af906f0148f8e18574451","sourceTree":"6f5078df08d6b6ffe27d9b139dee28d00c8b03ec","absentOptional":[]} -->
