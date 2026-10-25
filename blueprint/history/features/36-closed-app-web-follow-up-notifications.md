# Feature: Closed-app web Follow Up notifications

**From build-plan:** feature 36
**Build attempt:** 1
**Branch:** feature/closed-app-web-follow-up-notifications
**Status:** verified

## Goal

Add closed-app web push notification capabilities for Follow Up commitments on the web client, supporting authenticated push subscriptions, notification privacy controls (generic versus detailed preview), a durable scheduled background dispatcher with idempotent per-occurrence delivery receipts, service-worker push and notificationclick handling with direct communication launcher routing, expired-subscription feedback handling, and overdue catch-up on application activation.

## In scope

- Push Subscriptions Schema and Persistence:
  - Add PostgreSQL migration `005_push_subscriptions.sql` creating:
    - `push_subscriptions`: stores `id`, `account_id`, `endpoint`, `keys_p256dh`, `keys_auth`, `user_agent`, `preview_mode` ('generic' | 'detailed'), `is_active`, `created_at`, `updated_at`, and `revoked_at`.
    - `notification_dispatches`: stores `id`, `account_id`, `followup_id`, `occurrence_id`, `subscription_id`, `dispatched_at`, and `status`. Includes unique constraint on `(account_id, followup_id, occurrence_id, subscription_id)` to guarantee idempotent per-occurrence delivery.
- Web Push & Dispatcher Server Modules:
  - Server push module `apps/web/server/push.ts`:
    - Subscription CRUD operations: create/update subscription, list active subscriptions for an account, delete subscription, and mark subscription expired.
    - Testable `PushSender` seam (`setPushSender`, `resetPushSender`) with default VAPID-compliant sender and mockable test behavior.
    - VAPID environment configuration (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
  - Durable scheduled dispatcher `apps/web/server/push-dispatcher.ts`:
    - `dispatchDueNotifications`: scans open follow-ups due at or before the current time across accounts with active subscriptions.
    - Resolves occurrence identifier and checks `notification_dispatches` to prevent duplicate sends.
    - Formats notification payload based on subscription `preview_mode`:
      - Generic (default): title "TaskFlow Commitment Due", body "You have a Follow Up commitment due." (preserves privacy on lock screens).
      - Detailed: title "Follow up: {personName}", body "{commitment}".
    - Delivers payload via `pushSender`. On HTTP 404 or 410 Gone, marks subscription as inactive/revoked (`expired-subscription feedback`).
    - Records dispatch receipt in `notification_dispatches`.
- Push API Route Handlers:
  - `POST /api/v1/push/subscriptions`: Authenticated. Saves or updates a browser push subscription for the active account.
  - `GET /api/v1/push/subscriptions`: Authenticated. Returns all active push subscriptions for the active account.
  - `DELETE /api/v1/push/subscriptions/[id]`: Authenticated. Deletes or revokes a push subscription.
  - `POST /api/v1/push/dispatch`: Protected by cron secret or authenticated admin/user token. Runs the durable scheduled dispatcher for due follow-ups.
  - Update `GET /api/v1/capabilities` and `apps/web/server/openapi.ts` to expose push capabilities.
- Service Worker Push & Click Handling (`apps/web/public/sw.js`):
  - `push` event listener:
    - Parses JSON push payload with fallback to text.
    - Calls `self.registration.showNotification` with badge, icon, tag, action buttons, and custom data payload.
  - `notificationclick` event listener:
    - Closes notification.
    - If action or click target specifies a communication launcher (`mailto:`, `tel:`, `https://wa.me/`), opens launcher URI.
    - If action or click target specifies Follow Up navigation, focuses an existing open window matching origin and navigates to `/followups?id={followupId}`, or opens a new window.
- Client-Side Push Notification Manager (`apps/web/lib/notifications.ts`, `apps/web/types/notifications.ts`):
  - Browser support and permission detection (`Notification.permission`).
  - Subscription lifecycle: `requestNotificationPermission`, `subscribeToPush`, `unsubscribeFromPush`, `updateNotificationPrivacy`.
  - Synchronization of subscription status with server and persistence of device-local preferences in storage.
  - Overdue catch-up detector: on app start or tab focus, inspects due follow-ups and identifies unacknowledged overdue commitments.
- User Interface Controls:
  - Notification section in `AccountModal.tsx`:
    - Push notification toggle switch.
    - Browser permission status indicator (Granted, Denied, Unsupported).
    - Privacy control radio group: Generic Preview (default) vs Detailed Preview.
    - Test notification button for immediate delivery verification.
    - Clear feedback on subscription expiration or revoked permissions.
  - Overdue Follow-up alert banner in `FollowUpsScreen.tsx`:
    - Displays high-priority alert for overdue follow-ups upon app activation.
    - Provides quick action launchers (Email, Call, WhatsApp, View, Complete).
- Tests & Validation:
  - Unit tests for push server module and dispatcher in `apps/web/server/push.test.ts`.
  - Unit tests for push route handlers in `apps/web/server/push-routes.test.ts`.
  - Unit tests for client notification helpers in `apps/web/lib/notifications.test.ts`.
  - Full verification suite (`npm run verify`).

## Out of scope

- Native mobile push via APNs or FCM (handled in Milestone L: React Native).
- Native Windows toast notifications (handled in Milestone M: WPF).
- Third-party commercial push aggregators (OneSignal, Pusher).
- Autonomous sending of emails or phone calls on behalf of the user (launchers only open the user's native client).
- Cross-account notification sharing.

## Build loop

- Step review: `feature` (all steps reviewed together at the end before `/complete`).
- Checkpoint commits: `disabled`.
- Verify gate: `npm run verify` runs before review handoff.

## Build steps

- [x] 1. **Database Schema for Push Subscriptions and Dispatch Receipts**
   - Create migration `apps/web/server/db/migrations/005_push_subscriptions.sql` creating `push_subscriptions` and `notification_dispatches` tables with foreign keys to `accounts` and `followups`, unique constraints, and indexes.
   - Run database migration to ensure schema compatibility.
   - Done when migration executes cleanly and tables exist in database client.

- [x] 2. **Server Push Module and Test Seam**
   - Create `apps/web/server/push.ts` with TypeScript types, VAPID key helpers, subscription CRUD operations, and `PushSender` seam (`setPushSender`, `resetPushSender`).
   - Implement `apps/web/server/push-dispatcher.ts` with `dispatchDueNotifications` handling due Follow Up queries, privacy preview formatting, idempotent dispatch receipt tracking, and expired subscription invalidation.
   - Add unit tests in `apps/web/server/push.test.ts` covering subscription management, dispatcher execution, privacy formats, and idempotency.
   - Done when `npm --prefix apps/web run test apps/web/server/push.test.ts` passes.

- [x] 3. **Push API Route Handlers and OpenAPI Documentation**
   - Implement `apps/web/app/api/v1/push/subscriptions/route.ts` (GET, POST), `apps/web/app/api/v1/push/subscriptions/[id]/route.ts` (DELETE), and `apps/web/app/api/v1/push/dispatch/route.ts` (POST).
   - Update `apps/web/app/api/v1/capabilities/route.ts` and `apps/web/server/openapi.ts` to document push subscription endpoints.
   - Add unit tests in `apps/web/server/push-routes.test.ts` covering authentication, validation, rate limiting, and dispatcher invocation.
   - Done when `npm --prefix apps/web run test apps/web/server/push-routes.test.ts` passes.

- [x] 4. **Service Worker Push and Notification Click Event Handling**
   - Update `apps/web/public/sw.js` with `push` and `notificationclick` listeners.
   - Implement notification display with actions ("Open", "Launch") and custom data payload.
   - Implement click handler routing to direct launcher URIs or app window navigation to `/followups?id={followupId}`.
   - Done when service worker script syntax is validated and build compiles.

- [x] 5. **Client-Side Notification Manager and Overdue Catch-up Logic**
   - Create `apps/web/types/notifications.ts` and `apps/web/lib/notifications.ts` with permission queries, service worker subscription calls, local storage persistence, and overdue catch-up detection.
   - Add unit tests in `apps/web/lib/notifications.test.ts`.
   - Done when `npm --prefix apps/web run test apps/web/lib/notifications.test.ts` passes.

- [x] 6. **UI Integration: Notification Settings and Overdue Alert Banner**
   - Add Push Notification controls and privacy preview radio options to `apps/web/components/auth/AccountModal.tsx`.
   - Add overdue Follow Up banner and quick action launchers to `apps/web/components/followups/FollowUpsScreen.tsx`.
   - Verify UI states: disabled, active, permission-denied, generic preview, detailed preview, and overdue catch-up banner.
   - Done when UI renders without errors, reflects live permission/subscription state, and passes ESLint.

- [x] 7. **Full Verification**
   - Run `npm run verify` across the monorepo (boundary checks, lint, all unit tests, and Next.js production build).
   - Done when all verification gates pass cleanly with zero errors.

## Files / areas

- `apps/web/server/db/migrations/005_push_subscriptions.sql` - database schema for subscriptions and dispatch receipts.
- `apps/web/server/push.ts` - server push subscription storage and push sender seam.
- `apps/web/server/push-dispatcher.ts` - durable scheduled dispatcher for due Follow Up occurrences.
- `apps/web/server/push.test.ts` - unit tests for push and dispatcher logic.
- `apps/web/app/api/v1/push/subscriptions/route.ts` - subscription API endpoints (GET, POST).
- `apps/web/app/api/v1/push/subscriptions/[id]/route.ts` - subscription deletion endpoint (DELETE).
- `apps/web/app/api/v1/push/dispatch/route.ts` - scheduled dispatcher trigger endpoint (POST).
- `apps/web/server/push-routes.test.ts` - unit tests for push API routes.
- `apps/web/app/api/v1/capabilities/route.ts` - capabilities response with push features.
- `apps/web/server/openapi.ts` - OpenAPI schema definitions for push endpoints.
- `apps/web/public/sw.js` - service worker push and notificationclick event handlers.
- `apps/web/types/notifications.ts` - client notification interfaces and payload types.
- `apps/web/lib/notifications.ts` - client notification management and overdue detection.
- `apps/web/lib/notifications.test.ts` - client notification unit tests.
- `apps/web/components/auth/AccountModal.tsx` - notification settings and privacy toggle UI.
- `apps/web/components/followups/FollowUpsScreen.tsx` - overdue commitment banner and launchers.

## Data / contracts

- `PushSubscriptionRecord`:
  - `id`: string (UUID or push_ prefix)
  - `accountId`: string
  - `endpoint`: string (valid HTTP/HTTPS push service URL)
  - `keysP256dh`: string
  - `keysAuth`: string
  - `userAgent`: string | null
  - `previewMode`: "generic" | "detailed"
  - `isActive`: boolean
  - `createdAt`: ISO 8601 string
  - `updatedAt`: ISO 8601 string
  - `revokedAt`: ISO 8601 string | null
- `NotificationDispatchRecord`:
  - `id`: string
  - `accountId`: string
  - `followupId`: string
  - `occurrenceId`: string
  - `subscriptionId`: string
  - `dispatchedAt`: ISO 8601 string
  - `status`: "delivered" | "failed" | "expired"
- `WebPushPayload`:
  - `title`: string
  - `body`: string
  - `icon`: string
  - `tag`: string
  - `data`:
    - `followupId`: string
    - `occurrenceId`: string
    - `personName`: string
    - `commitment`: string
    - `preferredAction`: string | null
    - `launcherUri`: string | null
    - `url`: string

## Testing

- Logic tests via Vitest:
  - `apps/web/server/push.test.ts`:
    - Push subscription creation, retrieval, and revocation.
    - Idempotent delivery verification (subsequent runs skip already-dispatched occurrences).
    - Privacy preview formatting (generic suppresses personal names and commitments; detailed includes them).
    - Expired subscription handling (404/410 marks subscription inactive).
  - `apps/web/server/push-routes.test.ts`:
    - Unauthenticated request returns 401 Unauthorized.
    - Invalid subscription payload returns 400 Bad Request.
    - Successful registration returns 201 Created.
    - Dispatcher endpoint triggers scheduled dispatch and returns metrics.
  - `apps/web/lib/notifications.test.ts`:
    - Browser permission detection and state mapping.
    - Overdue Follow Up calculation and catch-up detection.
    - Payload formatting and launcher URL integration.
- Gate: `npm run verify` (boundary checks, lint, all vitest tests, and Next.js build).

## Notes for the AI

- Maintain strict compliance with repository rules: zero em dashes, en dashes, or ellipsis characters.
- Follow the existing test seam pattern from `apps/web/server/auth.ts` (`activeEmailSender` / `setEmailSender` / `resetEmailSender`) for `PushSender` in `apps/web/server/push.ts`.
- Ensure Service Worker fetch exclusions remain intact so `/api/` requests are never cached or intercepted.
- Keep notification delivery best-effort with content-free operational logging.
- Stop after planning; do not implement in `/feature`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":13288,"specSha256":"e2f812116e7d5f83eb9586375695a4c4711ee492ec100568c31cb98c37b685b8","branch":"refs/heads/feature/closed-app-web-follow-up-notifications","head":"56c82916cf288ec3d104a8500a24d7a2f99ae663","baseRef":"refs/heads/main","baseCommit":"56c82916cf288ec3d104a8500a24d7a2f99ae663","sourceTree":"794dbbb65fbc494dc8c85555d0a236c5590c228e","absentOptional":[]} -->
