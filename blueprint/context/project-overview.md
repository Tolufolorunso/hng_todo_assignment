# TaskFlow - Project Overview

<!-- blueprint:source-hash 166ae7625adff4ec9d2879ae6320549d8833c9d88a44d603bada2145ca3e14d3 -->

> A differentiated local-first personal productivity suite for web, Android/iOS, and Windows, with optional synchronization and proactive Follow Up reminders.

## Problem

TaskFlow helps people capture work, plan a realistic day, remember commitments, and turn notes into action. The shipped offline browser app and initial mobile foundation are complete. Next come web navigation realignment with anchored popover and command palette, performance polish, official Expo Router file-based mobile architecture with native aesthetics, and the independent Windows client with synchronization.

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

Features 1 through 43 are shipped; Feature 44 is next. Headline capabilities are Follow Up, Plan My Day, actionable notes, fast capture, and unified 4-destination navigation.

### Shipped web product

1. **Task data layer and persistence:** stores typed tasks and notes in IndexedDB with validation.
2. **Task list (create, view, complete):** provides the complete local task workflow.
3. **Edit and delete tasks:** updates and confirmed deletion.
4. **Notes:** standalone note CRUD and search.
5. **Due dates and priorities:** scheduling, urgency, and overdue states.
6. **Search, filter, and sort:** manages local task collections.
7. **Offline-first PWA:** installation, cached operation, connectivity feedback.
8. **Deployment readiness:** verifies public Vercel release.
9. **Modern SaaS design:** responsive dark/light workspace and navigation.
10. **Drag-and-drop task reordering:** persists user task sequence.
11. **Task categories and filtering:** Work, Personal, Urgent, Study, Ideas.
12. **Calendar view:** maps tasks into interactive monthly schedule.
13. **Analytics:** derives completion, category, priority, and productivity insights.
14. **Data backup and restore:** exports and validates portable JSON snapshots.
15. **Theme toggle:** persists dark-default or light presentation.
16. **TaskFlow branding:** product logo, favicon, and clean asset structure.
17. **Footer and showcase:** attribution, social links, and developer profile.
18. **Rich-text notes editor:** sanitized formatted HTML and plain-text excerpts.
19. **Rich-text task descriptions:** formatted task content with safe rendering.
20. **Standalone note reader:** focused reading, metrics, copying, print, PDF export.
21. **SEO and social previews:** metadata, discovery files, deployment headers.
22. **Mobile header and bottom navigation:** touch navigation for narrow viewports.
23. **Fixed footer and scroll clearance:** prevents content collision with docked controls.

### Product direction and web differentiation

24. **Product, notification, and privacy realignment:** documents three clients, accounts, contact privacy, and limits.
25. **Follow Up commitments and recurrence:** one-time and recurring commitments, history, snooze, reschedule, launchers.
26. **Plan My Day:** capacity-aware day planning with explanations from tasks and due follow-ups.
27. **Actionable notes:** creates tasks or follow-ups from note text with backlink context.
28. **Fast capture inbox:** saves text and links offline with minimal input for later triage.

### Product and service foundation

29. **Isolated monorepo layout:** establishes apps/web, apps/mobile, and apps/windows.
30. **Web API and PostgreSQL foundation:** adds /api/v1, migrations, validation, OpenAPI, and health.
31. **Optional accounts and sessions:** email OTP, secure refresh, revocation, logout, and deletion.
32. **Cloud productivity persistence:** stores account-owned entities with validation and change sequencing.
33. **Synchronization and conflicts:** idempotent push/pull, revisions, cursors, tombstones, and conflicts.

### Synchronized web client

34. **Web local-first storage upgrade:** migrates data into workspace-aware IndexedDB with sync metadata.
35. **Web accounts and synchronization:** explicit local-data adoption, sync status, retries, and conflicts.
36. **Closed-app web Follow Up notifications:** push subscriptions, durable dispatch, deduplication, and catch-up.

### Initial mobile milestone

37. **React Native offline foundation:** creates independent task and note workflows on SQLite with backup support.
38. **React Native product and differentiated parity:** core parity plus Plan My Day, notes, Follow Up, notifications, launchers.
39. **React Native API integration and release:** adds auth, sync, secure sessions, conflicts, signed builds, store readiness.

### Web realignment and React Native mobile foundation

40. **Web navigation consolidation and responsive layout refinement:** streamlines web navigation to at most four primary destinations (Tasks, Follow Ups, Notes, and More drawer) to eliminate small-viewport overcrowding.
41. **Expo and React Native mobile foundation with four-tab native navigation:** re-scaffolds apps/mobile with Expo, 4-tab bottom bar (Tasks, Follow Ups, Notes, More), native expo-sqlite, and native primitives (View, Text, Pressable, TextInput, StyleSheet).
42. **React Native product parity and mobile-first workflows:** Follow Up recurrence, direct communication launchers (phone, email, WhatsApp), Plan My Day, Actionable Notes, Calendar, Analytics, expo-notifications, and native themes.
43. **React Native cloud synchronization, accounts, and emulator launch:** secure token storage via expo-secure-store, OTP auth, local data adoption, outbox sync, native conflict resolution, and live verification on Android emulator.

### Web navigation realignment, popover menu, and performance polish

44. **Web anchored popover navigation, mobile bottom sheet, and command palette:** replaces slide-over drawer with anchored floating popover on desktop, interactive draggable bottom sheet on mobile web, keyboard shortcut navigation (G I, G C, G P), and global Cmd+K or Ctrl+K command palette.
45. **Web performance optimization and layout memoization:** eliminates redundant layout re-renders across header, footer, and dialogs; optimizes list rendering and selector subscriptions for instantaneous filter and search response.

### Mobile architecture modernization with Expo Router and native polish

46. **Expo Router file-based navigation and vector icon migration:** re-architects apps/mobile with official Expo Router (app/(tabs)/...), native stack modal screens, persistent scroll state, deep linking, and crisp @expo/vector-icons replacing placeholder emojis.
47. **Mobile native aesthetics, haptics, and FlatList virtualization:** implements iOS inset grouped cards, Apple Settings style More hub, translucent Cupertino blur bars, Android Material 3 elevation and ripple feedback, expo-haptics tactile feedback, and FlatList virtualization.

### Native Windows application

48. **WPF offline foundation:** independent .NET WPF task and note application on SQLite with backup and keyboard use.
49. **WPF product and differentiated parity:** core parity plus Plan My Day, actionable notes, Follow Up, notifications, launchers, fast capture, and accessibility.
50. **WPF API integration and release readiness:** auth, sync, DPAPI-protected sessions, recovery, signed MSIX packaging, and Store readiness.

### Cross-platform hardening

51. **Cross-platform compatibility and operational hardening:** verifies migration recovery, API backward compatibility, recurrence consistency, multi-device convergence, notification permission and delivery failure, account deletion, abuse controls, accessibility, synchronized-mode privacy, backup portability, observability, and release rollback.

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

- A device has one local-only workspace plus separate account caches. Signing in never uploads local content automatically.
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
- **Testing:** Vitest/browser tests for web, mobile vitest unit/device tests, xUnit for Windows.

## Monetization

None planned. Personal productivity and portfolio product. Infrastructure costs budgeted as fixed operations.

## UI/UX

- **Web:** dark-default Linear/Raycast-inspired responsive app. Navigation consolidated to max 4 primary destinations (Tasks, Follow Ups, Notes, More) with anchored floating popover on desktop, draggable bottom sheet on mobile, and global Cmd+K command palette preserving total canvas context.
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
