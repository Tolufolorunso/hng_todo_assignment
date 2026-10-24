# TaskFlow - Project Overview

<!-- blueprint:source-hash a9fa5adaec4b9bf305999e0e412b09e51d19d56294a2193087d65f2c2d93ede3 -->

> A differentiated local-first personal productivity suite for web, Android/iOS, and Windows, with optional synchronization and proactive Follow Up reminders.

## Problem

TaskFlow helps people capture work, plan a realistic day, remember commitments, and turn notes into action. The shipped offline browser app remains isolated to one profile. Next come the four differentiating capabilities and independent mobile and Windows clients with optional synchronization.

## Users

- **Local-only individual** - wants full productivity workflows without registration or upload.
- **Multi-device individual** - optionally syncs and recovers data across platforms.
- **Student or knowledge worker** - turns a large backlog into an achievable day.
- **Customer-facing individual** - remembers customer or personal commitments without a full CRM.
- **Mobile user** - needs touch-friendly capture, reminders, and actions.
- **Windows user** - needs an installed, keyboard-friendly, accessible app.
- **Not served** - teams, collaborative editors, enterprise administrators, marketing automation, or users requiring end-to-end encrypted cloud sync.

## Usage model

- **Tenancy:** one personal workspace per local scope or account; no shared workspaces.
- **Scale:** several thousand tasks, notes, captures, follow-ups, and history entries per user; planning and analytics stay local.
- **Connectivity:** intermittent. Every client writes locally first and survives offline restarts.
- **Reachability:** the Next.js API is public; local databases stay device-bound and never connect directly to PostgreSQL.
- **Trust:** client, capture, backup, rich-text, contact, and launcher data is untrusted. The API authenticates, authorizes, validates, and sanitizes cloud mutations.
- **Privacy:** local-only content is never uploaded. Synchronized content, including contact details, is stored in PostgreSQL without end-to-end encryption. Notification previews are generic unless details are enabled.
- **Notifications:** mobile and Windows schedule local reminders without an account or network. Closed-app web reminders require an account, push subscription, connectivity, and browser support. Delivery is best effort.
- **Availability:** background execution is not required for sync correctness. Opening a client catches up with due and overdue follow-ups.
- **Compatibility:** API v1 supports at least the previous supported native release; shared fixtures protect recurrence behavior.
- **Non-requirements:** no collaboration, attachments, shared contacts, bulk communication, autonomous sending, general reminders, enterprise controls, behavioral telemetry, compliance regime, audit product, or service-level agreement.

## Features

Features 1 through 23 are shipped; Feature 24 is next. The headline capabilities are Follow Up, Plan My Day, actionable notes, and fast capture.

### Shipped web product

1. **Task data layer and persistence** - stores typed tasks and notes in IndexedDB with validation and tests.
2. **Task list: create, view, and complete** - provides the first complete local task workflow.
3. **Edit and delete tasks** - supports updates and confirmed deletion.
4. **Notes** - provides standalone note CRUD and search.
5. **Due dates and priorities** - adds scheduling, urgency, and overdue states.
6. **Search, filter, and sort for tasks** - makes local task collections manageable.
7. **Offline-first PWA** - adds installation, cached operation, and connectivity feedback.
8. **Deployment readiness and live URL** - verifies and documents the public Vercel release.
9. **Modern SaaS design and widescreen layout** - establishes the responsive dark/light workspace and navigation.
10. **Drag-and-drop task reordering** - persists a user-defined task sequence.
11. **Task categories and filtering** - adds Work, Personal, Urgent, Study, and Ideas organization.
12. **Calendar view** - maps due tasks into an interactive monthly schedule.
13. **Analytics** - derives completion, category, priority, and productivity insights.
14. **Data backup and restore** - exports and validates portable JSON snapshots.
15. **Theme toggle** - persists dark-default or light presentation without theme flash.
16. **TaskFlow branding** - adds the product logo and favicon and removes starter assets.
17. **Footer and developer showcase** - adds attribution, social links, and developer information.
18. **Rich-text notes editor** - persists sanitized formatted note HTML and plain-text excerpts.
19. **Rich-text task descriptions** - adds formatted task content with safe rendering and excerpts.
20. **Standalone note reader** - adds focused reading, metrics, copying, printing, and PDF export.
21. **SEO, social previews, and Vercel configuration** - prepares metadata, discovery files, and deployment headers.
22. **Mobile header and bottom navigation** - makes web navigation usable on narrow touch screens.
23. **Fixed footer and scroll clearance** - prevents content from colliding with docked controls.

### Product direction and web differentiation

24. **Product, notification, and privacy realignment** - documents the three clients, optional accounts, contact-data privacy, notification limits, support policy, and non-goals.
25. **Follow Up commitments and recurrence** - adds one-time and recurring commitments, history, overdue handling, snooze, rescheduling, in-app reminders, and communication launchers.
26. **Plan My Day** - proposes an explained capacity-aware day from tasks, due follow-ups, available time, and optional effort estimates.
27. **Actionable notes** - creates tasks or follow-ups from selected note content while preserving source context.
28. **Fast capture inbox** - saves text and links offline with minimal friction, then processes them into tasks, notes, or follow-ups.

### Product and service foundation

29. **Isolated monorepo layout** - moves the web app into `apps/web` and establishes independent mobile and Windows roots.
30. **Web API and PostgreSQL foundation** - adds `/api/v1`, migrations, validation, OpenAPI, health, capabilities, limits, and server security.
31. **Optional accounts and sessions** - adds email OTP, secure refresh, revocation, logout, account inspection, and deletion.
32. **Cloud productivity persistence** - stores account-owned product entities with validation, sanitization, recurrence checks, and change sequencing.
33. **Synchronization and conflicts** - adds idempotent push/pull, revisions, cursors, tombstones, stable occurrences, pagination, and recoverable conflicts.

### Synchronized web client

34. **Web local-first storage upgrade** - migrates current data into workspace-aware IndexedDB with sync metadata and backup v2 support.
35. **Web accounts and synchronization** - adds explicit local-data adoption, sync status, retries, conflicts, multi-tab coordination, and safe service-worker behavior.
36. **Closed-app web Follow Up notifications** - adds push subscriptions, privacy controls, durable dispatch, deduplication, routing, and overdue catch-up.

### React Native Android and iOS

37. **React Native offline foundation** - creates independent task and note workflows on SQLite with backup and offline restart support.
38. **React Native product and differentiated parity** - implements core parity plus Plan My Day, actionable notes, recurring Follow Up, local notifications, launchers, and fast capture.
39. **React Native API integration and release** - adds auth, sync, secure sessions, conflicts, lifecycle recovery, signed builds, and store readiness.

### Native Windows application

40. **WPF offline foundation** - creates the independent .NET WPF task and note application on SQLite with backup and keyboard use.
41. **WPF product and differentiated parity** - implements core parity plus Plan My Day, actionable notes, recurring Follow Up, notifications, launchers, fast capture, and accessibility.
42. **WPF API integration and release** - adds auth, sync, DPAPI-protected sessions, recovery, signed MSIX packaging, and Store readiness.

### Cross-platform hardening

43. **Compatibility and operational hardening** - verifies migration, recurrence, convergence, notification failure, deletion, abuse controls, accessibility, privacy, portability, monitoring, and rollback.

## Architecture boundaries

```text
apps/
  web/       Next.js browser client and /api/v1 backend
  mobile/    Independent React Native Android/iOS client
  windows/   Independent C#/.NET WPF client
```

- The web UI and API build and deploy together from `apps/web`; there is no separate API application.
- Clients share no runtime source, models, validators, repositories, sync code, generated SDK, or UI.
- Each app owns dependencies, lockfile, local schema, migrations, tests, version, and release process.
- OpenAPI and behavior fixtures define contracts without shared runtime packages.
- CI rejects cross-app source imports and filters unrelated paths.

## Data model

### Task

- `id` (`string`) - stable identifier.
- `title` (`string`, 1 to 200 characters) - required task name.
- `description` (`taskflow-html-v1`, up to 20,000 characters) - optional sanitized content.
- `completed` (`boolean`), `completedAt` (`RFC 3339 UTC | null`) - state and analytics timestamp.
- `priority` (`low | medium | high`), `dueDate` (`YYYY-MM-DD | null`), `category` (`work | personal | urgent | study | ideas | null`).
- `estimatedMinutes` (`positive integer | null`) - optional Plan My Day capacity input.
- `sourceNoteId` (`string | null`), `sourceExcerpt` (`string | null`) - actionable-note link and durable context.
- `createdAt`, `updatedAt` (`RFC 3339 UTC`) - display timestamps, never conflict winners.

### Note

- `id` (`string`), `title` (`string`, 1 to 200 characters), `body` (`taskflow-html-v1`, up to 50,000 characters).
- `createdAt`, `updatedAt` (`RFC 3339 UTC`).
- Backlinks are derived from tasks and follow-ups whose `sourceNoteId` matches. Deleting a note does not delete those actions.

### FollowUp

- `id` (`string`) - stable series or one-time commitment identifier.
- `personName` (`string`, up to 200 characters), `commitment` (`string`), `details` (`string | null`).
- `dueAt` (`RFC 3339 UTC`), `timeZone` (`canonical identifier`) - current occurrence and calendar recurrence context.
- `emailAddress`, `phoneNumber`, `whatsAppNumber` (`string | null`) - validated launcher targets.
- `preferredAction` (`email | whatsapp | phone | null`).
- `recurrence` (`RecurrenceRule | null`), `status` (`open | completed | archived`).
- `sourceNoteId`, `sourceExcerpt` (`string | null`) - optional actionable-note context.
- `createdAt`, `updatedAt` (`RFC 3339 UTC`).
- Contact targets belong to the follow-up; there is no separate address book in this phase.

### RecurrenceRule and FollowUpOccurrence

- `RecurrenceRule` records `mode` (`calendarAnchored | completionRelative`), frequency, interval, relevant weekday or month-day fields, local wall-clock time, canonical time zone, and optional end condition.
- Calendar-anchored recurrence preserves calendar slots across late completion and daylight-saving changes.
- Completion-relative recurrence calculates the next due time from actual completion.
- Each occurrence has a stable ID, parent Follow Up ID, scheduled due time, outcome (`completed | skipped | missed | unresolved`), resolution time, and calculated next due time.
- Snooze affects one occurrence; rescheduling explicitly targets one occurrence or the series. One unresolved occurrence remains overdue instead of generating an unbounded stack.

### DailyPlan

- `id` (`string`), `localDate` (`YYYY-MM-DD`), `timeZone` (`string`), `availableMinutes` (`positive integer`).
- `items` (ordered task and Follow Up occurrence references), `acceptedAt`, `updatedAt` (`RFC 3339 UTC`).
- Recommendation scores and explanations are derived; accepted selection and order are user-owned synchronized data.

### InboxCapture

- `id` (`string`), `text` (`string`), `sharedUrl` (`URL | null`), `sourceAppLabel` (`string | null`).
- `capturedAt` (`RFC 3339 UTC`), `state` (`pending | processed | discarded`).
- Optional resulting task, note, or Follow Up reference plus processed/discarded time.
- Processing and target creation are idempotent.

### TaskOrder

- `id` (`"default"`), `orderedIds` (`string[]`).
- Unknown or deleted IDs are ignored; missing tasks append deterministically. One reorder creates one mutation.

### Workspace and synchronization

- A device has one local-only workspace plus separate account caches. Signing in never merges or uploads local content automatically.
- A workspace owns tasks, notes, follow-ups, occurrence history, daily plans, inbox captures, task order, preferences, outbox, cursor, revisions, tombstones, and conflicts.
- An `OutboxMutation` has `mutationId`, protocol version, entity type/id, `put | delete`, opaque base revision, and optional payload. It is committed atomically with the local write.
- A `Conflict` retains the attempted local value and current server value or tombstone until the user resolves it.
- Cloud revisions control concurrency. Opaque change cursors, tombstones, and mutation receipts provide pagination, deletion safety, and idempotency.

### Notifications and backup

- Native permission, presentation settings, and scheduled-notification IDs remain device-local.
- An authenticated `PushSubscription` is account-owned server data; a dispatch receipt deduplicates an occurrence per device but cannot prove display.
- Backup v1 contains existing tasks and notes and remains importable everywhere.
- Backup v2 contains live product entities, history, plans, pending captures, task order, source-note relationships, format/version metadata, and origin metadata.
- Backups exclude credentials, account IDs, subscriptions, notification schedule IDs, outbox, cursors, revisions, receipts, tombstones, and internal auth state.

## API contract

The API lives under `apps/web/app/api/v1/`:

- Auth: `POST /auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, and `/auth/logout`.
- Account: `GET /account` and `DELETE /account`.
- Data: `POST /sync` pushes bounded mutations before pulling paginated changes.
- Push: `POST /push/subscriptions` and `DELETE /push/subscriptions/{id}`.
- Contract and operations: `GET /capabilities`, `/health`, and `/openapi.json`.

Sync returns `applied`, `duplicate`, `conflict`, or `invalid` per mutation. Server revisions, not client clocks, choose winners. Stable occurrence IDs prevent two devices from silently advancing one recurring follow-up twice. Private responses use `Cache-Control: no-store`; the service worker bypasses private API and auth responses.

## Tech stack

- **Web and API:** Next.js App Router, React, strict TypeScript, Tailwind CSS v4, and Route Handlers.
- **Web local data:** IndexedDB through `idb`; version 4 precedes tested product and workspace migrations.
- **Cloud:** PostgreSQL accessed only by server code inside `apps/web`.
- **Auth:** API-owned passwordless email OTP with rotating, revocable sessions; provider is unresolved.
- **Web notifications:** standard Web Push plus a durable scheduled dispatcher; implementation is unresolved.
- **Mobile:** independent React Native Android/iOS app with Expo development builds unless a native dependency requires bare React Native.
- **Mobile data and reminders:** SQLite, mobile-owned migrations, recurrence, local notifications, secure credential storage, share-sheet capture, and app shortcuts.
- **Windows:** C# WPF on .NET 10 LTS, MVVM, `Microsoft.Data.Sqlite`, DPAPI, Windows notifications, and URI launchers.
- **Rich text:** independently implemented clients conforming to `taskflow-html-v1`, with final API sanitization.
- **Testing:** Vitest/browser tests for web, mobile unit/device tests, xUnit/UI Automation for Windows, and shared contract fixtures.

## Monetization

None is planned. TaskFlow remains a personal productivity and portfolio product. Database, email, push, scheduling, domain, signing, and store-account costs still require budgeting.

## UI/UX

- **Web:** retain the dark-default Linear/Raycast-inspired responsive app at `/`, `/notes`, `/notes/[id]`, `/calendar`, and `/analytics`; add Follow Up, Plan My Day, inbox, actionable-note, account, sync, notification, and conflict experiences.
- **Plan My Day:** show capacity, reasons, and editable selection/order before acceptance; never silently change backlog data.
- **Follow Up:** show who, what, when, and how; keep due items visible without permission; separate completion, skip, snooze, reschedule, and launch actions.
- **Fast capture:** open quickly, save locally with minimal input, confirm success, and preserve original text.
- **Mobile:** use native phone/tablet navigation, safe areas, dynamic text, VoiceOver/TalkBack, accessible ordering, share capture, and local notifications.
- **Windows:** use native WPF controls, keyboard navigation, visible focus, Narrator/UI Automation, contrast themes, DPI scaling, fast capture, and accessible notifications.
- **Consistency:** terminology, enums, dates, recurrence, planning rules, sync states, backups, privacy, and rich content match across clients; layouts need not be identical.

## Deployment

- **Web/API host:** one Vercel project rooted at `apps/web`, preserving the current production origin and PWA identity unless durable reminder dispatch proves incompatible with the selected plan.
- **Health:** `/api/v1/health`; web and API deploy together.
- **Commands after the move:** `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, and `npm run test` within `apps/web`.
- **Server dependencies:** managed PostgreSQL, transactional email/auth, Web Push signing, and a durable scheduler or protected dispatcher.
- **Environment:** server credentials remain deployment secrets and never use `NEXT_PUBLIC_*` unless genuinely public.
- **Reminder operations:** dispatch is idempotent with content-free logs; failed delivery may invalidate a subscription without deleting its Follow Up.
- **Mobile:** signed Android App Bundle and iOS TestFlight/App Store builds with notification declarations and physical-device checks.
- **Windows:** signed self-contained x64 and Arm64 MSIX packages, preferably through Microsoft Store, with toast activation tested on supported Windows versions.
- **Compatibility:** database changes precede dependent clients; additive API fields remain optional; breaking behavior uses a new versioned route.
- **Windows support:** current Windows 11 and in-support Windows 10 Enterprise/IoT LTSC build 17763 or newer; unsupported consumer Windows 10 is best effort.

## Open questions

These approved TODOs do not change the build order but must be resolved before dependent features:

- Managed PostgreSQL, authentication, transactional email, Web Push, and durable reminder-dispatch providers or implementations.
- Whether the selected Vercel plan can run the required reminder cadence.
- Permanent production domain and Apple, Google Play, and Microsoft Store developer-account access.
- Platform rich-text editors and the exact `taskflow-html-v1` allowlist.
- Exact recurrence grammar, limits, end conditions, daylight-saving behavior, and Windows time-zone mapping.
- Default snooze choices, repeat policy, and detailed notification-preview defaults.
- Supported email, WhatsApp, and telephone URI behavior per platform.
- Exact Windows fast-capture entry point and whether tray behavior is justified.
- Retention and account-deletion completion windows, API rate limits, sync batch sizes, and push dispatch limits.

The plans have no contradictions.
