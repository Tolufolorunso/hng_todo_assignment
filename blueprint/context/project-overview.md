# TaskFlow - Project Overview

<!-- blueprint:source-hash 8f46a9bf0d3da8786bb10da319bc9de505d398ffdf18e679f115e31fd024bad0 -->

> A differentiated local-first personal productivity suite for web, Android/iOS, and Windows, with optional synchronization and proactive Follow Up reminders.

## Problem

TaskFlow helps people capture work, plan a realistic day, remember commitments, and turn notes into action. The cross-platform foundation, API, synchronization engine, mobile app, web reliability, and initial Windows modular view refactoring are complete through Feature 61.

Milestone R stabilizes the Windows desktop client (`apps/windows`) by resolving confirmed navigation, control, and layout regressions from Milestone Q and aligning the core desktop screens to the exact visual standards of the Next.js web application captured in `websample/` and user reference screenshots. This includes fixing sidebar active tab highlight triggers, restoring inoperable WYSIWYG commands (Bold, Italic, Underline, Lists, Alignments, Undo/Redo), enforcing consistent 12px vertical card margins across ListBox items, containing layout overflow in the Analytics dashboard, and achieving full 2-column web parity for Tasks, Follow Ups, and Calendar views.

## Users

- **Local-only individual:** wants full productivity workflows without registration or upload.
- **Multi-device individual:** optionally syncs and recovers data across platforms.
- **Student or knowledge worker:** turns a large backlog into an achievable day.
- **Customer-facing individual:** remembers customer or personal commitments without a full CRM.
- **Mobile user:** needs touch-friendly capture, reminders, and native actions.
- **Windows user:** needs an installed, keyboard-friendly desktop app with Web-grade aesthetics and reliable text formatting.
- **Not served:** teams, collaborative editors, enterprise administrators, or users requiring E2EE sync.

## Usage model

- **Tenancy:** one personal workspace per local scope or account; no shared workspaces.
- **Scale:** several thousand tasks, notes, captures, follow-ups, and history entries per user; planning and analytics stay local.
- **Connectivity:** intermittent. Every client writes locally first and survives offline restarts.
- **Reachability:** the Next.js API is public; local databases stay device-bound and never connect directly to PostgreSQL.
- **Trust:** client, capture, backup, rich-text, contact, and launcher data is untrusted. The API validates and sanitizes cloud mutations.
- **Privacy:** local-only content is never uploaded. Synchronized content is stored in PostgreSQL without end-to-end encryption. Notification previews are generic unless details are enabled.
- **Notifications:** mobile and Windows schedule local reminders without an account or network. Closed-app web reminders require an account, push subscription, and connectivity.
- **Availability:** background execution is not required for sync correctness. Opening a client catches up with due and overdue follow-ups.
- **Compatibility:** API v1 supports at least the previous native release; shared fixtures protect recurrence behavior.
- **Non-requirements:** no collaboration, attachments, shared contacts, bulk messaging, enterprise controls, telemetry, or compliance SLA.

## Features

Features 1 through 61 are shipped; Milestone R (Features 62 through 63) is next.

### Shipped features (Milestones A - Q)

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
24. **Product, notification, and privacy realignment:** multi-client architecture.
25. **Follow Up commitments and recurrence:** recurring schedules, snooze, launchers.
26. **Plan My Day:** capacity-aware day planning with explanations.
27. **Actionable notes:** creates tasks or follow-ups from note text.
28. **Fast capture inbox:** minimal offline text and link capture.
29. **Isolated monorepo layout:** establishes apps/web, apps/mobile, apps/windows.
30. **Web API and PostgreSQL foundation:** /api/v1, migrations, OpenAPI, health.
31. **Optional accounts and sessions:** email OTP, refresh rotation, logout, deletion.
32. **Cloud productivity persistence:** account-owned entities with change sequencing.
33. **Synchronization and conflicts:** idempotent push/pull, revisions, tombstones.
34. **Web local-first storage upgrade:** workspace-aware IndexedDB with sync metadata.
35. **Web accounts and synchronization:** adoption, sync status, retries, conflicts.
36. **Closed-app web Follow Up notifications:** push subscriptions, dispatch, catch-up.
37. **React Native offline foundation:** SQLite tasks and notes with backup support.
38. **React Native product and differentiated parity:** Plan My Day, Follow Up, launchers.
39. **React Native API integration and release:** auth, sync, secure sessions, store readiness.
40. **Web navigation consolidation:** max 4 primary destinations (Tasks, Follow Ups, Notes, More).
41. **Expo and React Native mobile foundation:** 4-tab bar, expo-sqlite, native primitives.
42. **React Native product parity:** Follow Up recurrence, launchers, calendar, analytics.
43. **React Native cloud synchronization:** secure tokens, OTP auth, outbox sync, emulator launch.
44. **Web anchored popover and command palette:** floating popover, bottom sheet, Cmd+K palette.
45. **Web performance optimization:** layout memoization and instantaneous filter response.
46. **Expo Router file-based navigation:** app/(tabs)/..., persistent state, vector icons.
47. **Mobile native aesthetics and virtualization:** platform aesthetics, haptics, FlatList.
48. **WPF offline foundation:** .NET WPF task and note app on SQLite with backup.
49. **WPF product and differentiated parity:** Plan My Day, actionable notes, Follow Up, notifications.
50. **WPF API integration and release readiness:** auth, sync, DPAPI sessions, MSIX packaging.
51. **Cross-platform compatibility and operational hardening:** migration recovery, sync convergence, runbook.
52. **Mobile bundling resolution and launch recovery:** fixes Metro resolution and native TS loading.
53. **Web usability, modal clearance, and form polish:** eliminates theme flash, modal bounds, footer flow.
54. **Windows desktop parity, navigation highlighting, and visual design:** active sidebar, icons, calendar pins.
55. **Web responsive overlays, navigation, and interaction hardening:** body-level portals, dialog bounds, mobile sheet.
56. **Web account adoption, workspace isolation, and synchronization correctness:** post-OTP adoption, sync outbox.
57. **Windows design system, color tokens, and modular view architecture:** shared theme dictionaries adopting Web Tailwind tokens, and modular UserControls preserving shell.
58. **Windows WYSIWYG rich-text editor and HTML conversion engine:** `WysiwygEditorControl` wrapping `RichTextBox` with ribbon toolbar and `taskflow-html-v1` conversion.
59. **Windows Tasks view parity and task modal dialog:** Web-matching task cards and focused Task Modal dialog.
60. **Windows Notes view parity, rich editor, and document reader:** modern note cards, Document Reader view, and WYSIWYG note editing.
61. **Windows Follow Ups, Plan My Day, Calendar, Analytics, and Inbox parity:** contact initials avatar cards, branded launchers, recurrence badges, capacity budgeting meter, month grid with agenda, analytics metric cards.

### Milestone R: Windows UI stabilization and usability recovery (active roadmap)

62. **Windows Shell Navigation, Layout Containment, and WYSIWYG Command Stabilization:** repair sidebar active tab highlight triggers, route `WysiwygEditorControl` ribbon commands with proper target and focus handling for bold/italic/underline/lists/alignments/history, enforce consistent 12px vertical card margins across ListBox items, and encapsulate view containers with bounded scrolling to prevent layout bleed and overlap.
63. **Windows Web Parity Overhaul for Tasks, Follow Ups, and Calendar Views:** rebuild Tasks into the Web 2-column Workspace layout with collapsible Quick Add details, search/filter rows, and Today/Metrics sidebar; reconstruct Follow Ups header, filter tabs, action toolbar cards, and modal dialog to match `websample/followup page.png` and `create followup.png`; and restructure Calendar into the Web 2-column layout matching `websample/calender.png` with Monday-first grid and Today schedule drawer.

## Architecture boundaries

```text
apps/
  web/       Next.js browser client and /api/v1 backend
  mobile/    Independent Expo and React Native Android/iOS client
  windows/   Independent C#/.NET WPF client
```

- Web UI and API build and deploy together from apps/web; there is no separate API application.
- Clients share no runtime source, models, validators, repositories, sync code, or UI.
- Each app owns dependencies, local schema, migrations, tests, version, and release process.
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

- id ("default"), orderedIds (string[]). Unknown IDs ignored; missing tasks append deterministically.

### Workspace and synchronization

- A device has one local-only workspace plus separate account caches; exactly one active scope is presented at a time.
- Every main web screen reads and mutates through the workspace-aware repository; account writes enqueue outbox mutations.
- Workspace owns entities, history, outbox, cursor, revisions, tombstones, and conflicts.
- OutboxMutation: mutationId, protocol version, entity type/id, put | delete, base revision, payload.
- Conflict retains local value and server value or tombstone until resolved. Cloud revisions control concurrency.

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

Sync returns applied, duplicate, conflict, or invalid per mutation. Server revisions choose winners. Responses use Cache-Control: no-store.

## Tech stack

- **Web and API:** Next.js App Router, React 19, strict TypeScript, Tailwind CSS v4, Route Handlers. Streamlined 4-destination navigation with floating popover on desktop, bottom sheet on mobile web, and Cmd+K command palette.
- **Web local data:** IndexedDB through idb; version 4 precedes tested migrations.
- **Cloud:** PostgreSQL accessed only by server code inside apps/web.
- **Auth:** API-owned passwordless email OTP with rotating, revocable sessions.
- **Web notifications:** Web Push plus durable scheduled dispatcher.
- **Mobile:** independent React Native app with official Expo Router (app/(tabs)/...), vector icons, haptics, and pure native primitives.
- **Mobile data:** expo-sqlite, mobile-owned migrations, recurrence, expo-notifications, expo-secure-store, Linking launchers.
- **Windows:** C# WPF on .NET 10 LTS, MVVM, Microsoft.Data.Sqlite, DPAPI, Windows notifications, URI launchers. Modular UserControls (`TasksView`, `NotesView`, `FollowUpsView`, `PlanMyDayView`, `CalendarView`, `AnalyticsView`, `InboxView`), `WysiwygEditorControl` (RichTextBox + FlowDocument) with full Word-style ribbon and bidirectional `taskflow-html-v1` conversion, and modal dialogs.
- **Rich text:** independent clients conforming to taskflow-html-v1, with final API sanitization.
- **Testing:** Vitest/browser tests for web, mobile Vitest unit/device tests, and xUnit for Windows.

## Monetization

None planned. Personal productivity and portfolio product. Infrastructure costs budgeted as fixed operations.

## UI/UX

- **Web:** dark-default responsive app. Navigation uses at most four primary destinations (Tasks, Follow Ups, Notes, More), with anchored desktop popover, mobile bottom sheet, and global command palette. Body-level overlay portal handles modals safely.
- **Mobile:** strict 4-tab bottom navigation (Tasks, Follow Ups, Notes, More). File-based Expo Router, platform-native aesthetics, tactile feedback via expo-haptics, virtualized FlatList rendering, safe areas, local notifications.
- **Windows:** native desktop shell with preserved header and sidebar navigation, modernized content canvas matching Web Tailwind design system (`#0B0F19` background, `#151C2C` cards, `#232E42` borders), card layouts with colored category/priority pills, full Word-style WYSIWYG ribbon, modal dialogs for tasks, dual Notes workflow with dedicated Document Reader, avatar cards with launchers, capacity budgeting meter, and high-DPI / keyboard accessibility. Canonical visual authorities for implementation are in `websample/`.
- **Plan My Day:** shows capacity, reasons, editable selection/order before acceptance; never silently modifies backlog.
- **Follow Up:** shows who, what, when, and how; keeps due items visible without permission; separate completion, skip, snooze, reschedule, launch.
- **Fast capture:** opens quickly, saves locally with minimal input, confirms success, preserves original text.
- **Consistency:** terminology, enums, dates, recurrence, planning rules, sync states, backups, privacy, and rich content match across clients.

## Deployment

- **Web/API host:** Vercel project rooted at apps/web, preserving production origin and PWA identity.
- **Health:** /api/v1/health; web and API deploy together.
- **Commands:** npm run dev, npm run build, npm run start, npm run lint, npm run test within apps/web.
- **Server dependencies:** managed PostgreSQL, transactional email/auth, Web Push signing, durable scheduler.
- **Environment:** server credentials remain deployment secrets and never use NEXT_PUBLIC_* unless public.
- **Mobile:** signed Android App Bundle and iOS TestFlight/App Store builds.
- **Windows:** signed self-contained x64 and Arm64 MSIX packages via Microsoft Store with toast activation verified.
- **Compatibility:** database changes precede dependent clients; additive API fields remain optional.
- **Windows support:** current Windows 11 and in-support Windows 10 Enterprise/IoT LTSC build 17763 or newer.

## Open questions

Approved TODOs to resolve before dependent features:

- Managed PostgreSQL, authentication, transactional email, Web Push, and reminder-dispatch providers.
- Whether selected Vercel plan can run required reminder cadence.
- Production domain and Apple, Google Play, and Microsoft Store developer-account access.
- Taskflow HTML V1 Fixtures: verify bidirectional FlowDocument <-> HTML converter passes round-trip tests against existing web-generated fixtures.
- WPF Dialog Overlay Focus: ensure modal dialogs in WPF implement keyboard focus containment (Tab trapping) and Escape key dismissal matching web behavior.
- Supported email, WhatsApp, and telephone URI behavior per platform.
- Windows fast-capture entry point and tray justification.
- Retention, account-deletion windows, API rate limits, sync batch sizes, and push dispatch limits.

The plans have no contradictions.
