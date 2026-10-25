# Feature: Extremely fast capture inbox

**From build-plan:** feature 28
**Build attempt:** 1
**Branch:** feature/extremely-fast-capture-inbox
**Status:** verified

## Goal

Provide a frictionless, offline-first inbox for capturing text and links in seconds from anywhere in the app, with global keyboard shortcut activation, compact capture interface, installed PWA share target handling, and idempotent processing into tasks, notes, or follow-ups.

## In scope

- Data layer and schema upgrades:
  - Upgrade IndexedDB schema to version 8 in `lib/db.ts` with `inbox_captures` object store indexed on `state`, `capturedAt`, and `updatedAt`.
  - Define `InboxCapture` types in `types/inbox.ts`: `id`, `text`, `sharedUrl`, `sourceAppLabel`, `capturedAt`, `state` (`pending | processed | discarded`), `targetType` (`task | note | followup`), `targetId`, `processedAt`, and `discardedAt`.
  - Add input validation in `lib/validation.ts` for capture text, URL format, source label, and states.
  - Implement CRUD and lifecycle helpers in `lib/inbox.ts`: `createCapture`, `listCaptures`, `getPendingCapturesCount`, `updateCapture`, `discardCapture`, `deleteCapture`, and idempotent `processCapture` (converting to Task, Note, or Follow Up).
  - Update `lib/backup.ts` to export and restore `inboxCaptures` with full schema validation and count reporting.
- Fast capture interface:
  - Create `components/inbox/FastCaptureModal.tsx`: compact modal supporting rapid text/link entry, auto URL detection, and `Ctrl+Enter` / `Cmd+Enter` instant save with zero delays.
  - Global keyboard shortcut handler (`Alt+C` or pressing `c` when no input/textarea is focused) and Header Quick Capture launcher button.
- Dedicated Inbox screen and PWA share target:
  - Create route `app/inbox/page.tsx` and screen component `components/inbox/InboxScreen.tsx`.
  - Handle Web Share Target query params (`?title=...&text=...&url=...` and `?capture=true`) on `/inbox` for automatic capture handling.
  - Update `app/manifest.ts` with `share_target` configuration and quick-capture shortcut.
  - Display pending, processed, and discarded items with search, state filtering, and "Inbox Zero" empty state.
  - Support converting any pending capture into a Task, Note, or Follow-up with prefilled fields, linking back to the original capture.
- Navigation and badge integration:
  - Add Inbox to navigation in `components/app/AppHeader.tsx` and `components/app/MobileNavBar.tsx`.
  - Display live pending capture badge count on navigation items.
- Testing:
  - Unit tests in `lib/inbox.test.ts`, `lib/validation.test.ts`, `lib/backup.test.ts`, and `lib/db.test.ts`.
  - Full verification: `npm run test`, `npm run lint`, `npm run build`.

## Out of scope

- Multi-user collaboration, real-time sync, or server storage (scheduled for Milestone J / Feature 32).
- Automatic OCR or audio transcription of media attachments.
- Automatic AI classification of inbox entries into categories.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Schema, models, validation, and inbox data layer.
  - Define `InboxCapture` and action types in `types/inbox.ts`.
  - Upgrade IndexedDB schema to version 8 in `lib/db.ts` with `inbox_captures` store.
  - Add capture validation rules in `lib/validation.ts`.
  - Implement `createCapture`, `listCaptures`, `getPendingCapturesCount`, `discardCapture`, `deleteCapture`, and idempotent `processCapture` in `lib/inbox.ts`.
  - Update `lib/backup.ts` to export and restore `inboxCaptures`.
  - Done when: unit tests in `lib/inbox.test.ts`, `lib/validation.test.ts`, `lib/db.test.ts`, and `lib/backup.test.ts` pass via `npm run test`.

- [x] 2. Fast capture modal and global keyboard shortcut.
  - Create `components/inbox/FastCaptureModal.tsx` for compact text/link input, auto URL detection, and immediate save.
  - Implement global keyboard listener (`Alt+C`) and Quick Capture button in `components/app/AppHeader.tsx`.
  - Done when: pressing the shortcut or clicking Quick Capture opens the modal, saves immediately to IndexedDB on `Ctrl+Enter`, and shows confirmation feedback.

- [x] 3. Inbox screen, conversion workflow, and PWA share target.
  - Create `app/inbox/page.tsx` and `components/inbox/InboxScreen.tsx` with filtering (Pending, Processed, Discarded), search, and item cards.
  - Support converting any capture into a Task, Note, or Follow-up with prefilled contents and preservation of the original text.
  - Add `share_target` and shortcuts configuration in `app/manifest.ts`.
  - Handle query params in `InboxScreen.tsx` to process incoming share links and text cleanly.
  - Done when: shared parameters populate or create captures, items can be converted into tasks/notes/follow-ups, and the resulting entities link back to the capture.

- [x] 4. Navigation integration, badge counters, and full verification.
  - Update `AppHeader.tsx` and `MobileNavBar.tsx` to include Inbox with live pending badge count.
  - Verify complete workflow across desktop and mobile views.
  - Done when: `npm run test`, `npm run lint`, and `npm run build` pass with zero errors.

## Files / areas

- `types/inbox.ts`: capture data models, states, and conversion action contracts.
- `lib/db.ts`: upgrade `DB_VERSION` to 8 and add `inbox_captures` store.
- `lib/validation.ts`: capture text and format validation.
- `lib/inbox.ts`: capture persistence, query, and idempotent conversion logic.
- `lib/backup.ts`: export and restore round-trip support for inbox captures.
- `app/manifest.ts`: Web App Manifest `share_target` and shortcut definitions.
- `components/inbox/FastCaptureModal.tsx`: compact rapid-entry modal.
- `components/inbox/InboxScreen.tsx`: inbox view, filters, search, and conversion dialogs.
- `app/inbox/page.tsx`: inbox route page.
- `components/app/AppHeader.tsx`: header navigation and quick-capture button.
- `components/app/MobileNavBar.tsx`: mobile bottom navigation item with badge.

## Data / contracts

- `InboxCapture`:
  - `id`: string (UUID).
  - `text`: string (captured content, max 20000 characters).
  - `sharedUrl`: string | null (extracted or shared URL, if present).
  - `sourceAppLabel`: string | null (e.g. "Web Share", "Quick Capture", "Clipboard").
  - `capturedAt`: string (ISO RFC 3339 UTC timestamp).
  - `state`: `"pending"` | `"processed"` | `"discarded"`.
  - `targetType`: `"task"` | `"note"` | `"followup"` | null.
  - `targetId`: string | null.
  - `processedAt`: string | null.
  - `discardedAt`: string | null.
  - `createdAt`: string.
  - `updatedAt`: string.

## Testing

- Unit tests in `lib/inbox.test.ts` testing capture creation, listing, count queries, and idempotent processing into task, note, and follow-up.
- Unit tests in `lib/validation.test.ts` covering capture text length, URL format, and state transitions.
- Unit tests in `lib/db.test.ts` verifying version 8 upgrade and store creation.
- Unit tests in `lib/backup.test.ts` verifying export and restore round-trips for inbox captures.
- Full regression suite: `npm run test`, `npm run lint`, `npm run build`.

## Notes for the AI

- Writing style: strictly zero em dashes (—), en dashes (–), or ellipsis characters.
- Fast capture performance: modal must open instantly with input auto-focused, without waiting on network or background processes.
- Idempotency: re-running conversion for the same capture must return the existing target without creating duplicate tasks, notes, or follow-ups.
- Preservation: converting or discarding a capture must never delete or mutate the original captured text.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7772,"specSha256":"4f5a1b37a26843e3e11e6997e9ebff58f39be105f7251d1fb746c425068e5ee1","branch":"refs/heads/feature/extremely-fast-capture-inbox","head":"1166f87dbd316e2748b8dc2b1e347fa64983a846","baseRef":"refs/heads/main","baseCommit":"1166f87dbd316e2748b8dc2b1e347fa64983a846","sourceTree":"099c3054823ae135d25bb67e0716ddfd13ca2bdf","absentOptional":[]} -->
