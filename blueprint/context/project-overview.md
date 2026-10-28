# TaskFlow - Project Overview

<!-- blueprint:source-hash 76e431b485bc2917db276053cb43294ae91befbb50f5a300c82863cec16722b4 -->

> A differentiated local-first personal productivity suite for web, Android/iOS, and Windows, with optional synchronization and proactive Follow Up reminders.

## Problem

TaskFlow helps people capture work, plan a realistic day, remember commitments, and turn notes into action. The cross-platform product, service foundation, synchronization, and UX milestones are complete through Feature 54. Milestone P now repairs confirmed Next.js web regressions in viewport overlays, responsive navigation, accessible interactions, account adoption, workspace isolation, and synchronized data access without changing mobile, Windows, or the public API contract.

## Users

- **Local-only individual:** wants full productivity workflows without registration or upload.
- **Multi-device individual:** optionally syncs and recovers data across platforms.
- **Student or knowledge worker:** turns a large backlog into an achievable day.
- **Customer-facing individual:** remembers customer or personal commitments without a full CRM.
- **Mobile user:** needs touch-friendly capture, reminders, and native actions.
- **Windows user:** needs an installed, keyboard-friendly, accessible app.
- **Not served:** teams, collaborative editors, enterprise administrators, or users requiring end-to-end encrypted cloud sync.

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
- **Non-requirements:** no collaboration, attachments, shared contacts, bulk communication, autonomous sending, general reminders, enterprise controls, telemetry, compliance regime, audit product, or SLA.

## Features

Features 1 through 54 are shipped; Feature 55 is next. Milestone P is a web-only reliability and data-integrity repair milestone.

### Shipped web product

1. **Task data layer:** IndexedDB storage with validation.
2. **Task list:** create, view, complete workflows.
3. **Edit and delete tasks:** updates and confirmed deletion.
4. **Notes:** standalone note CRUD and search.
5. **Due dates and priorities:** urgency and overdue states.
6. **Search, filter, and sort:** manages task collections.
7. **Offline-first PWA:** installation and cached operation.
8. **Deployment readiness:** verifies public Vercel release.
9. **Modern SaaS design:** responsive dark/light workspace.
10. **Drag-and-drop task reordering:** persists task order.
11. **Task categories and filtering:** Work, Personal, Urgent, Study, Ideas.
12. **Calendar view:** maps tasks to monthly schedule.
13. **Analytics:** completion, priority, and productivity insights.
14. **Data backup and restore:** portable JSON snapshots.
15. **Theme toggle:** persists dark-default or light theme.
16. **TaskFlow branding:** vector logo, favicon, and clean assets.
17. **Footer and showcase:** attribution and developer modal.
18. **Rich-text notes editor:** sanitized HTML and plain-text excerpts.
19. **Rich-text task descriptions:** formatted task content.
20. **Standalone note reader:** reading view, metrics, print, PDF export.
21. **SEO and social previews:** metadata and deployment headers.
22. **Mobile header and bottom navigation:** touch navigation.
23. **Fixed footer and scroll clearance:** docked control spacing.

### Product direction and web differentiation

24. **Product, notification, and privacy realignment:** multi-client architecture.
25. **Follow Up commitments and recurrence:** recurring schedules, snooze, launchers.
26. **Plan My Day:** capacity-aware day planning with explanations.
27. **Actionable notes:** creates tasks or follow-ups from note text.
28. **Fast capture inbox:** minimal offline text and link capture.

### Product and service foundation

29. **Isolated monorepo layout:** establishes apps/web, apps/mobile, and apps/windows.
30. **Web API and PostgreSQL foundation:** /api/v1, migrations, OpenAPI, health.
31. **Optional accounts and sessions:** email OTP, refresh rotation, logout, deletion.
32. **Cloud productivity persistence:** account-owned entities with change sequencing.
33. **Synchronization and conflicts:** idempotent push/pull, revisions, tombstones.

### Synchronized web client

34. **Web local-first storage upgrade:** workspace-aware IndexedDB with sync metadata.
35. **Web accounts and synchronization:** adoption, sync status, retries, conflicts.
36. **Closed-app web Follow Up notifications:** push subscriptions, dispatch, catch-up.

### Initial mobile milestone

37. **React Native offline foundation:** SQLite tasks and notes with backup support.
38. **React Native product and differentiated parity:** Plan My Day, Follow Up, launchers.
39. **React Native API integration and release:** auth, sync, secure sessions, store readiness.

### Web realignment and React Native mobile foundation

40. **Web navigation consolidation:** max 4 primary destinations (Tasks, Follow Ups, Notes, More).
41. **Expo and React Native mobile foundation:** 4-tab bar, expo-sqlite, native primitives.
42. **React Native product parity:** Follow Up recurrence, launchers, calendar, analytics.
43. **React Native cloud synchronization:** secure tokens, OTP auth, outbox sync, emulator launch.

### Web navigation realignment, popover menu, and performance polish

44. **Web anchored popover and command palette:** floating popover, bottom sheet, Cmd+K palette.
45. **Web performance optimization:** layout memoization and instantaneous filter response.

### Mobile architecture modernization with Expo Router and native polish

46. **Expo Router file-based navigation:** app/(tabs)/..., persistent state, vector icons.
47. **Mobile native aesthetics and virtualization:** platform aesthetics, haptics, FlatList.

### Native Windows application

48. **WPF offline foundation:** .NET WPF task and note app on SQLite with backup.
49. **WPF product and differentiated parity:** Plan My Day, actionable notes, Follow Up, notifications.
50. **WPF API integration and release readiness:** auth, sync, DPAPI sessions, MSIX packaging.

### Cross-platform hardening

51. **Cross-platform compatibility and operational hardening:** migration recovery, recurrence consistency, sync convergence, notification recovery, cascade deletion, rate limits, and runbook.

### Cross-platform UX polish and parity

52. **Mobile bundling resolution and launch recovery:** fixes Metro bundler module resolution across Expo Router route screens, restores native TypeScript module loading, and verifies error-free launch.
53. **Web usability, modal clearance, and form polish:** eliminates theme flash, expands Quick Add task details, enables safe task detail inspection, fixes popover z-index, constrains search bar width, adds modal scroll bounds, and unpins desktop footer.
54. **Windows desktop parity, navigation highlighting, and visual design:** active sidebar state, labeled and themed forms, TaskFlow icon, richer calendar indicators, and text-formatting parity.

### Web reliability and data integrity

55. **Web responsive overlays, navigation, and interaction hardening:** body-level viewport overlays, centered and short-screen-safe dialogs, working mobile More, responsive header behavior, consistent modal accessibility, repaired navigation interactions, visible mutation failures, accessible task ordering, and browser regression coverage.
56. **Web account adoption, workspace isolation, and synchronization correctness:** reliable post-OTP adoption, workspace-scoped reads and writes through the synchronized repository, outbox-backed account mutations, strict separation of local and account data, and safe workspace transitions across the session lifecycle.

## Architecture boundaries

```text
apps/
  web/       Next.js browser client and /api/v1 backend
  mobile/    Independent Expo and React Native Android/iOS client
  windows/   Independent C#/.NET WPF client
```

- The web UI and API build and deploy together from apps/web; there is no separate API application.
- Clients share no runtime source, models, validators, repositories, sync code, generated SDK, or UI.
- Each app owns dependencies, lockfile, local schema, migrations, tests, version, and release process.
- OpenAPI and behavior fixtures define contracts without shared runtime packages.
- CI rejects cross-app source imports and filters unrelated paths.

## Data model

### Task

- id (string): stable identifier.
- title (string, 1-200 chars): required task name.
- description (taskflow-html-v1, up to 20,000 chars): optional sanitized content.
- completed (boolean), completedAt (RFC 3339 UTC | null): state and analytics timestamp.
- priority (low | medium | high), dueDate (YYYY-MM-DD | null), category (work | personal | urgent | study | ideas | null).
- estimatedMinutes (positive integer | null): optional Plan My Day capacity input.
- sourceNoteId (string | null), sourceExcerpt (string | null): actionable-note link and context.
- createdAt, updatedAt (RFC 3339 UTC): display timestamps.

### Note

- id (string), title (string, 1-200 chars), body (taskflow-html-v1, up to 50,000 chars).
- createdAt, updatedAt (RFC 3339 UTC).
- Backlinks derived from tasks/follow-ups with matching sourceNoteId.

### FollowUp

- id (string): stable series or one-time commitment identifier.
- personName (string, up to 200 chars), commitment (string), details (string | null).
- dueAt (RFC 3339 UTC), timeZone (canonical identifier): occurrence and recurrence context.
- emailAddress, phoneNumber, whatsAppNumber (string | null): launcher targets.
- preferredAction (email | whatsapp | phone | null).
- recurrence (RecurrenceRule | null), status (open | completed | archived).
- sourceNoteId, sourceExcerpt (string | null): optional actionable-note context.
- createdAt, updatedAt (RFC 3339 UTC).

### RecurrenceRule and FollowUpOccurrence

- RecurrenceRule: mode (calendarAnchored | completionRelative), frequency, interval, weekdays/month-day, local time, time zone, end condition.
- Calendar-anchored preserves calendar slots; completion-relative calculates from actual completion.
- Each occurrence has stable ID, parent FollowUp ID, scheduled due time, outcome (completed | skipped | missed | unresolved), resolution time, next due time.
- Snooze affects one occurrence; rescheduling targets one occurrence or the series.

### DailyPlan

- id (string), localDate (YYYY-MM-DD), timeZone (string), availableMinutes (positive integer).
- items (ordered task and occurrence references), acceptedAt, updatedAt (RFC 3339 UTC).
- Recommendation scores and explanations are derived; accepted selection/order is synchronized.

### InboxCapture

- id (string), text (string), sharedUrl (URL | null), sourceAppLabel (string | null).
- capturedAt (RFC 3339 UTC), state (pending | processed | discarded).
- Resulting task, note, or follow-up reference plus processed time.

### TaskOrder

- id ("default"), orderedIds (string[]).
- Unknown IDs ignored; missing tasks append deterministically.

### Workspace and synchronization

- A device has one local-only workspace plus separate account caches, with exactly one active scope presented at a time. Signing in never uploads local content automatically.
- Every main web screen reads and mutates through the workspace-aware repository; account writes enqueue outbox mutations while local-only writes remain device-bound.
- Workspace owns entities, history, outbox, cursor, revisions, tombstones, and conflicts.
- OutboxMutation: mutationId, protocol version, entity type/id, put | delete, base revision, payload.
- Conflict retains local value and server value or tombstone until resolved.
- Cloud revisions control concurrency with opaque change cursors and tombstones.

### Notifications and backup

- Permission, presentation settings, and scheduled IDs remain device-local.
- PushSubscription is account-owned server data; dispatch receipt deduplicates per device.
- Backup v1: tasks and notes (importable everywhere).
- Backup v2: live product entities, history, plans, captures, order, source relationships, metadata.
- Backups exclude credentials, accounts, subscriptions, outbox, cursors, revisions, receipts, tombstones.

## API contract

Lives under apps/web/app/api/v1/:

- Auth: POST /auth/otp/request, /auth/otp/verify, /auth/refresh, /auth/logout.
- Account: GET /account, DELETE /account.
- Data: POST /sync pushes bounded mutations before pulling paginated changes.
- Push: POST /push/subscriptions, DELETE /push/subscriptions/{id}.
- Operations: GET /capabilities, /health, /openapi.json.

Sync returns applied, duplicate, conflict, or invalid per mutation. Server revisions choose winners. Stable occurrence IDs prevent double advancement. Responses use Cache-Control: no-store.

## Tech stack

- **Web and API:** Next.js App Router, React 19, strict TypeScript, Tailwind CSS v4, Route Handlers. Streamlined 4-destination navigation with non-blocking anchored floating popover on desktop, touch bottom sheet on mobile web, and Cmd+K command palette.
- **Web local data:** IndexedDB through idb; version 4 precedes tested migrations.
- **Cloud:** PostgreSQL accessed only by server code inside apps/web.
- **Auth:** API-owned passwordless email OTP with rotating, revocable sessions.
- **Web notifications:** Web Push plus durable scheduled dispatcher.
- **Mobile:** independent React Native app with official Expo Router file-based routing (app/(tabs)/...), native stack modal navigation, @expo/vector-icons, expo-haptics, and pure native primitives (View, Text, Pressable, TextInput, StyleSheet, FlatList) with zero HTML DOM dependencies.
- **Mobile data and native integration:** expo-sqlite, mobile-owned migrations, recurrence, expo-notifications, expo-secure-store, Linking.openURL launchers, share-sheet capture.
- **Windows:** C# WPF on .NET 10 LTS, MVVM, Microsoft.Data.Sqlite, DPAPI, Windows notifications, URI launchers.
- **Rich text:** independent clients conforming to taskflow-html-v1, with final API sanitization.
- **Testing:** Vitest/browser tests for web, mobile Vitest unit/device tests, and xUnit for Windows. Milestone P requires focused browser regression coverage for responsive overlays, modal dismissal and focus behavior, header overflow, navigation actions, adoption, workspace isolation, and synchronized outbox writes.

## Monetization

None planned. Personal productivity and portfolio product. Infrastructure costs budgeted as fixed operations.

## UI/UX

- **Web:** dark-default Linear/Raycast-inspired responsive app. Navigation uses at most four primary destinations (Tasks, Follow Ups, Notes, More), with an anchored desktop popover, viewport-anchored mobile bottom sheet, and global command palette. Global dialogs and sheets mount outside the sticky header through a body-level overlay host, remain centered or bottom-anchored within dynamic viewport bounds, and provide consistent dismissal, focus containment, focus restoration, and scroll behavior.
- **Mobile:** strict 4-tab bottom navigation (Tasks, Follow Ups, Notes, More). File-based Expo Router, platform-native aesthetics (iOS inset grouped cards, Apple Settings style More hub, Cupertino blur; Android Material 3 elevation and ripples), tactile feedback via expo-haptics, virtualized FlatList rendering, safe areas, dynamic text, VoiceOver/TalkBack, local notifications.
- **Plan My Day:** shows capacity, reasons, editable selection/order before acceptance; never silently modifies backlog.
- **Follow Up:** shows who, what, when, and how; keeps due items visible without permission; separate completion, skip, snooze, reschedule, launch.
- **Fast capture:** opens quickly, saves locally with minimal input, confirms success, preserves original text.
- **Windows:** native WPF controls, keyboard navigation, visible focus, Narrator/UI Automation, contrast themes, DPI scaling, fast capture, notifications.
- **Consistency:** terminology, enums, dates, recurrence, planning rules, sync states, backups, privacy, and rich content match across clients; layouts need not be identical.

## Deployment

- **Web/API host:** Vercel project rooted at apps/web, preserving production origin and PWA identity.
- **Health:** /api/v1/health; web and API deploy together.
- **Commands:** npm run dev, npm run build, npm run start, npm run lint, npm run test within apps/web.
- **Server dependencies:** managed PostgreSQL, transactional email/auth, Web Push signing, durable scheduler.
- **Environment:** server credentials remain deployment secrets and never use NEXT_PUBLIC_* unless public.
- **Mobile:** signed Android App Bundle and iOS TestFlight/App Store builds with notification declarations and device checks.
- **Windows:** signed self-contained x64 and Arm64 MSIX packages via Microsoft Store with toast activation verified.
- **Compatibility:** database changes precede dependent clients; additive API fields remain optional; breaking behavior uses new versioned routes.
- **Windows support:** current Windows 11 and in-support Windows 10 Enterprise/IoT LTSC build 17763 or newer.

## Open questions

Approved TODOs to resolve before dependent features:

- Managed PostgreSQL, authentication, transactional email, Web Push, and reminder-dispatch providers.
- Whether selected Vercel plan can run required reminder cadence.
- Production domain and Apple, Google Play, and Microsoft Store developer-account access.
- Platform rich-text editors and exact taskflow-html-v1 allowlist.
- Exact recurrence grammar, limits, end conditions, daylight-saving behavior, and Windows time-zone mapping.
- Default snooze choices, repeat policy, and detailed notification-preview defaults.
- Supported email, WhatsApp, and telephone URI behavior per platform.
- Windows fast-capture entry point and tray justification.
- Retention, account-deletion windows, API rate limits, sync batch sizes, and push dispatch limits.

The plans have no contradictions.
