# Feature: Optional accounts and session lifecycle

**From build-plan:** feature 31
**Build attempt:** 1
**Branch:** feature/optional-accounts-and-session-lifecycle
**Status:** verified

## Goal

Implement secure, platform-neutral email one-time password (OTP) authentication, session lifecycle management, token refresh rotation, session revocation, and account inspection/deletion for TaskFlow across web, mobile, and Windows clients without compromising the offline-first IndexedDB foundation.

## In scope

- Database schema migration for authentication:
  - Add `apps/web/server/db/migrations/002_auth_otp_codes.sql` creating `otp_codes` table with email, hashed code, expiration timestamp, attempt counter, and indexes.
- Core server authentication and token engine (`apps/web/server/auth.ts`):
  - Cryptographically secure 6-digit numeric OTP generation using `node:crypto`.
  - Secure code hashing and constant-time verification using SHA-256.
  - OTP attempt limiting (maximum 5 attempts before invalidation) and 10-minute expiration.
  - HMAC-SHA256 signed access tokens (short-lived, 15 minutes) containing account ID, session ID, and expiration.
  - Opaque cryptographically random refresh tokens (long-lived, 30 days) stored as SHA-256 hashes in `sessions`.
  - Single-use refresh token rotation with reuse detection (invalidating compromised session families).
  - Pluggable email sender interface with safe development fallback (console logging or debug response in non-production environments).
  - Request authentication middleware `authenticateRequest` extracting and verifying Bearer tokens.
- Versioned Route Handlers under `apps/web/app/api/v1/`:
  - `POST /api/v1/auth/otp/request`: validates email, enforces rate limiting, generates and sends/logs OTP code.
  - `POST /api/v1/auth/otp/verify`: validates code, creates account if new, creates session, issues access and refresh tokens.
  - `POST /api/v1/auth/refresh`: validates refresh token, rotates refresh credential, and issues fresh access token.
  - `POST /api/v1/auth/logout`: revokes current active session.
  - `GET /api/v1/auth/sessions`: lists active sessions for the authenticated account.
  - `DELETE /api/v1/auth/sessions/[id]`: revokes a specific session belonging to the account.
  - `POST /api/v1/auth/sessions/revoke-all`: revokes all other sessions for the account.
  - `GET /api/v1/account`: retrieves profile details and active session summary.
  - `DELETE /api/v1/account`: soft deletes the account and revokes all active sessions.
- Documentation and configuration:
  - Update `apps/web/server/openapi.ts` covering all authentication and account routes.
  - Update `apps/web/.env.example` and `AGENTS.md` documenting `AUTH_SECRET` and authentication contracts.
- Testing:
  - Unit tests in `apps/web/server/auth.test.ts` for token generation, verification, OTP lifecycle, and attempt enforcement.
  - Route tests in `apps/web/server/auth-routes.test.ts` testing all authentication and account endpoints.
  - Full verification: `npm run verify` (boundary check, lint, tests, build).

## Out of scope

- Cloud tasks/notes/plans synchronization push/pull batches (scheduled for Feature 32 and 33).
- Web-push notifications and device token registration (scheduled for Milestone K / Feature 36).
- Third-party OAuth providers (Google, GitHub, Apple; passwordless email OTP is the primary chosen authentication model).
- External transactional email vendor lock-in (SES/Resend/SendGrid adapters can be added via the pluggable sender interface when credentials exist).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. OTP schema migration and server authentication engine.
  - Create migration `apps/web/server/db/migrations/002_auth_otp_codes.sql` for OTP code tracking with indexes.
  - Implement token generation, signature, and verification helpers in `apps/web/server/auth.ts` using `node:crypto`.
  - Implement OTP generation, hashing, attempt verification, and expiration logic.
  - Implement session creation, refresh token hashing, and rotation verification.
  - Done when: unit tests in `apps/web/server/auth.test.ts` verify token signing, expiration, OTP attempt limits, and session helpers.

- [x] 2. Authentication Route Handlers: OTP Request, OTP Verify, and Refresh Rotation.
  - Implement `POST /api/v1/auth/otp/request` in `apps/web/app/api/v1/auth/otp/request/route.ts` with rate limiting and pluggable delivery.
  - Implement `POST /api/v1/auth/otp/verify` in `apps/web/app/api/v1/auth/otp/verify/route.ts` with account creation and token issuance.
  - Implement `POST /api/v1/auth/refresh` in `apps/web/app/api/v1/auth/refresh/route.ts` with refresh token rotation and replay prevention.
  - Done when: unit tests in `apps/web/server/auth-routes.test.ts` verify request flow, rate limits, invalid code rejections, and refresh rotation.

- [x] 3. Session lifecycle and account management Route Handlers.
  - Implement `authenticateRequest` helper in `apps/web/server/auth.ts` supporting standard `Authorization: Bearer <token>` headers.
  - Implement `POST /api/v1/auth/logout` in `apps/web/app/api/v1/auth/logout/route.ts`.
  - Implement `GET /api/v1/auth/sessions` and `POST /api/v1/auth/sessions/revoke-all` in `apps/web/app/api/v1/auth/sessions/route.ts`.
  - Implement `DELETE /api/v1/auth/sessions/[id]` in `apps/web/app/api/v1/auth/sessions/[id]/route.ts`.
  - Implement `GET /api/v1/account` and `DELETE /api/v1/account` in `apps/web/app/api/v1/account/route.ts`.
  - Done when: tests verify authenticated session listing, session revocation, current session protection, account profile inspection, and account deletion.

- [x] 4. OpenAPI documentation, configuration, and verification.
  - Update `apps/web/server/openapi.ts` with complete schemas and endpoint definitions for all authentication and account operations.
  - Update `apps/web/.env.example` and `AGENTS.md` documenting auth endpoints, environment variables, and client integration rules.
  - Run `npm run verify` ensuring boundary compliance, zero lint errors, all tests passing, and successful production build.
  - Done when: `npm run verify` exits with code 0 across all applications and tests.

## Files / areas

- `apps/web/server/db/migrations/002_auth_otp_codes.sql`: OTP code table migration.
- `apps/web/server/auth.ts`: authentication engine, token signing, OTP management, and session repository.
- `apps/web/app/api/v1/auth/otp/request/route.ts`: OTP request endpoint.
- `apps/web/app/api/v1/auth/otp/verify/route.ts`: OTP verification and login endpoint.
- `apps/web/app/api/v1/auth/refresh/route.ts`: token refresh rotation endpoint.
- `apps/web/app/api/v1/auth/logout/route.ts`: session logout endpoint.
- `apps/web/app/api/v1/auth/sessions/route.ts`: list sessions and bulk revoke endpoint.
- `apps/web/app/api/v1/auth/sessions/[id]/route.ts`: single session revoke endpoint.
- `apps/web/app/api/v1/account/route.ts`: account inspection and deletion endpoint.
- `apps/web/server/openapi.ts`: OpenAPI 3.1 specification.
- `apps/web/.env.example`: configuration template for `AUTH_SECRET`.
- `AGENTS.md`: documented authentication routes and conventions.
- `apps/web/server/auth.test.ts`: core authentication and token engine tests.
- `apps/web/server/auth-routes.test.ts`: Route Handler integration tests.

## Data / contracts

- Access Token Payload:
  ```json
  {
    "sub": "<account_id>",
    "sid": "<session_id>",
    "email": "user@example.com",
    "iat": 1729860000,
    "exp": 1729860900
  }
  ```
- OTP Request Body (`POST /api/v1/auth/otp/request`):
  ```json
  {
    "email": "user@example.com"
  }
  ```
- OTP Request Response:
  ```json
  {
    "success": true,
    "message": "Verification code sent if account is eligible",
    "expiresInSeconds": 600
  }
  ```
- OTP Verify Body (`POST /api/v1/auth/otp/verify`):
  ```json
  {
    "email": "user@example.com",
    "code": "123456",
    "clientPlatform": "web | mobile | windows"
  }
  ```
- OTP Verify Response:
  ```json
  {
    "accessToken": "ey...",
    "refreshToken": "7f8a...",
    "expiresIn": 900,
    "account": {
      "id": "acc_123",
      "email": "user@example.com",
      "createdAt": "2026-10-25T16:00:00.000Z"
    }
  }
  ```
- Refresh Request Body (`POST /api/v1/auth/refresh`):
  ```json
  {
    "refreshToken": "7f8a..."
  }
  ```
- Account Response (`GET /api/v1/account`):
  ```json
  {
    "account": {
      "id": "acc_123",
      "email": "user@example.com",
      "createdAt": "2026-10-25T16:00:00.000Z",
      "updatedAt": "2026-10-25T16:00:00.000Z",
      "activeSessionsCount": 2
    }
  }
  ```

## Testing

- Unit tests in `apps/web/server/auth.test.ts`:
  - Token signing with HMAC-SHA256, signature verification, and expiration rejection.
  - OTP generation format (6 numeric digits), hashing, constant-time verification.
  - OTP attempt limiting (invalidating after 5 failed attempts).
  - Refresh token hashing and rotation logic.
- Route Handler tests in `apps/web/server/auth-routes.test.ts`:
  - `POST /api/v1/auth/otp/request`: email validation, rate limiting headers, success response.
  - `POST /api/v1/auth/otp/verify`: valid code creates session and account, invalid code returns 400/401 problem details.
  - `POST /api/v1/auth/refresh`: successful rotation, rejection of revoked or expired tokens, replay protection.
  - `POST /api/v1/auth/logout`: revokes session.
  - `GET /api/v1/auth/sessions`: returns active sessions with current session flag.
  - `DELETE /api/v1/auth/sessions/[id]`: revokes specified session.
  - `GET /api/v1/account` and `DELETE /api/v1/account`: inspection and deletion behavior.
- Full verification: `npm run verify`.

## Notes for the AI

- Writing style: strictly zero em dashes (—), en dashes (–), or ellipsis characters.
- Cryptography: use native `node:crypto` standard library (`randomBytes`, `createHmac`, `createHash`, `timingSafeEqual`). Avoid heavy third-party authentication dependencies.
- Constant time comparisons: always use `crypto.timingSafeEqual` when comparing hashes to prevent timing attacks.
- Graceful offline fallback: when `DATABASE_URL` is unconfigured, return standard RFC 7807 problem details with `DATABASE_UNAVAILABLE` error code so client applications can distinguish missing backend infrastructure from authentication failure.
- Platform neutrality: all tokens and session management operations must be fully accessible via standard HTTP JSON APIs with `Authorization: Bearer <token>` headers, enabling seamless support for web, mobile, and Windows apps.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10779,"specSha256":"02d58c73ba55722847792df89f4d57d0d71fc22486b268ad062e6345b600f1fe","branch":"refs/heads/feature/optional-accounts-and-session-lifecycle","head":"725817af99a3b19a8bfe1e41d9e082b5def1de32","baseRef":"refs/heads/main","baseCommit":"725817af99a3b19a8bfe1e41d9e082b5def1de32","sourceTree":"e8d0902bb73ef65694e72491961e888b6de372d8","absentOptional":[]} -->
