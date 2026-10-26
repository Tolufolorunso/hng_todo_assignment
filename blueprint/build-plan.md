# Build Plan

List the features that make up the project, high level and in rough build order.
Keep each item outcome-focused; implementation details belong in `/feature`.

Run `/feature` to spec the next unchecked item, or `/feature 24` to select one.
Keep completed items checked and do not renumber completed features because
archived specifications refer to those IDs.

Scaffolding and prototypes are pre-build steps rather than product features.
The Blueprint overlay, `AGENTS.md`, and onboarding setup are already present.

## Milestone A: Foundation

- [x] 1. **Task data layer and persistence** - a typed repository over IndexedDB
  using `idb`, with `tasks` and `notes` stores, indexes, task CRUD, Vitest,
  `fake-indexeddb`, validation helpers, and the initial test command.
- [x] 2. **Task list: create, view, and complete** - render stored tasks, add a task
  by title, toggle completion, and show an empty state.

## Milestone B: Core task management

- [x] 3. **Edit and delete tasks** - edit task title and description and delete
  with confirmation, including update and deletion tests.
- [x] 4. **Notes** - a standalone notes section with list, create, edit, delete,
  and search across note titles and bodies.

## Milestone C: Additional features

- [x] 5. **Due dates and priorities** - extend tasks with date-only due dates and
  low, medium, or high priority, with overdue and priority presentation.
- [x] 6. **Search, filter, and sort for tasks** - add text search, status filters,
  and sorting by due date, priority, or creation date, backed by tested pure
  logic.
- [x] 7. **Offline-first PWA** - add the web manifest, icons, versioned service
  worker, installability, offline application behavior, and connectivity status.

## Milestone D: Delivery

- [x] 8. **Deployment readiness and live URL** - verify the production build,
  document the project, add Vercel configuration, and smoke-test the deployed
  application.

## Milestone E: Advanced Productivity and Multi-Page Overhaul

- [x] 9. **Modern SaaS design system and widescreen desktop layout** - introduce
  theme tokens, typography, elevated surfaces, a responsive two-column desktop
  workspace, and unified route navigation.
- [x] 10. **Drag-and-drop task reordering and custom positioning** - add native
  HTML drag-and-drop behavior, visual indicators, and persisted task order.
- [x] 11. **Curated task categories and category filtering** - migrate the web
  schema to support Work, Personal, Urgent, Study, and Ideas categories, with
  badges and filtering.
- [x] 12. **Calendar and schedule view (`/calendar`)** - add an interactive monthly
  calendar, due-date mapping, overdue presentation, and date-based inspection.
- [x] 13. **Analytics and productivity insights (`/analytics`)** - add completion
  metrics, category distribution, priority distribution, and productivity
  statistics.
- [x] 14. **Data backup and restore** - add timestamped JSON export and validated
  merge or replacement import.

## Milestone F: Polish, Branding, and Word-Style Rich Notes

- [x] 15. **Theme toggle: dark mode default with light mode option** - add an
  anti-flash theme setup, header toggle, instant switching, and local preference
  persistence.
- [x] 16. **TaskFlow vector branding and Next.js starter asset cleanup** - add the
  bespoke TaskFlow SVG logo and favicon and remove unused starter assets.
- [x] 17. **Site-wide footer and interactive developer showcase modal** - add
  creator attribution, social links, and an accessible developer profile modal.
- [x] 18. **Microsoft Word-style WYSIWYG rich-text notes editor** - add formatting
  controls, sanitized HTML persistence, and plain-text note excerpts.

## Milestone G: Rich Tasks, Standalone Note Reader, and SEO

- [x] 19. **Microsoft Word-style rich-text task descriptions** - integrate rich
  editing into task creation and editing, expand limits, render safe HTML, and
  generate plain-text card excerpts.
- [x] 20. **Standalone note document reader (`/notes/[id]`)** - add focused note
  reading, document typography, word count, reading time, copying, printing, and
  PDF export.
- [x] 21. **Search engine optimization, Open Graph, and Vercel deployment** - add
  page metadata, social cards, structured data, sitemap, robots configuration,
  and deployment headers.

## Milestone H: Mobile-First App Bar and Fixed Bottom Dock

- [x] 22. **Professional mobile header and responsive bottom navigation** -
  streamline the mobile header and add fixed thumb-friendly navigation for
  Tasks, Notes, Calendar, and Analytics.
- [x] 23. **Fixed bottom dock footer and page scroll clearance** - pin the footer
  where appropriate and ensure route content does not hide behind fixed
  navigation or dock elements.

## Milestone I: Product Direction and Web Differentiation

- [x] 24. **Cross-platform product, notification, and privacy realignment** -
  document the three independently maintained clients, optional accounts,
  local-only and synchronized privacy, Follow Up contact data, notification
  limitations, platform support policy, and explicit non-goals.
- [x] 25. **Follow Up commitments and recurring workflow** - add local web
  follow-ups with one-time and recurring commitments, calendar-anchored and
  completion-relative schedules, completion history, overdue visibility,
  snoozing, scoped rescheduling, in-app reminders, and email, WhatsApp, and
  phone launchers. Closed-app web push is completed after account
  infrastructure in Feature 36.
- [x] 26. **Plan My Day** - add optional effort estimates, available-time entry,
  explained capacity-aware recommendations across tasks and due follow-ups,
  user-controlled daily plans, and safe handling of unfinished work.
- [x] 27. **Actionable notes** - create tasks or follow-ups from selected note
  content while preserving source links, context snapshots, backlinks, and
  usable actions when the source note changes or is deleted.
- [x] 28. **Extremely fast capture inbox** - add offline minimal capture for text
  and links, a web keyboard shortcut, compact capture interface, installed-PWA
  share handling where supported, and idempotent processing into tasks, notes,
  or follow-ups.

## Milestone J: Cross-Platform Product and Service Foundation

- [x] 29. **Isolated monorepo layout** - move the existing Next.js project into
  `apps/web`, establish independent `apps/mobile` and `apps/windows` roots,
  preserve the web origin and behavior, and add dependency, CI, and cross-import
  boundaries.
- [x] 30. **Web API and PostgreSQL foundation** - add versioned `/api/v1` Route
  Handlers inside `apps/web`, PostgreSQL migrations, structured validation and
  errors, OpenAPI documentation, health and capabilities endpoints, rate
  limits, security controls, and deployment configuration.
- [x] 31. **Optional accounts and session lifecycle** - implement email one-time
  password authentication, secure refresh rotation, logout, revocation, account
  inspection, account deletion, and platform-neutral session behavior.
- [x] 32. **Cloud productivity persistence** - add account-owned tasks, notes,
  follow-ups, occurrence history, daily plans, inbox captures, and task-order
  documents with ownership enforcement, validation, restricted rich-text
  sanitization, recurrence validation, and change sequencing.
- [x] 33. **Synchronization and conflict engine** - implement idempotent push and
  pull batches for all synchronized entities, server revisions, cursors,
  pagination, mutation receipts, deletion tombstones, stable Follow Up
  occurrence handling, explicit conflicts, and backward-compatibility tests.

## Milestone K: Synchronized Web Client

- [x] 34. **Web local-first storage upgrade** - introduce web-owned repository
  boundaries, migrate existing IndexedDB data into workspace-aware stores, and
  add Follow Up, daily plan, inbox, task order, outbox, cursor, tombstone,
  conflict, backup version 2, and version 1 import behavior.
- [x] 35. **Web accounts and synchronization** - add optional sign-in, explicit
  local-data adoption, synchronization states, retries, conflict resolution,
  multi-tab coordination, service-worker API exclusions, and two-browser
  acceptance evidence across the supported product entities.
- [x] 36. **Closed-app web Follow Up notifications** - add authenticated web-push
  subscriptions, notification privacy controls, a durable scheduled dispatcher,
  idempotent per-occurrence delivery, service-worker notification handling,
  launcher routing, expired-subscription feedback, and overdue catch-up.

## Milestone L: React Native Android and iOS

- [x] 37. **React Native offline foundation** - create the independent mobile
  application with native navigation, mobile-owned SQLite migrations, task and
  note CRUD, search, backup import and export, accessible touch interaction, and
  offline restart behavior.
- [x] 38. **React Native product and differentiated feature parity** -
  independently implement priorities, due dates, categories, ordering, calendar,
  analytics, rich-text editing, note reading, themes, Plan My Day, actionable
  notes, Follow Up recurrence, local closed-app notifications, communication
  launchers, share-sheet and shortcut capture, phone and tablet layouts, and
  mobile accessibility.
- [x] 39. **React Native API integration and release readiness** - independently
  implement authentication, synchronization for all supported entities, secure
  sessions, conflict resolution, Android and iOS lifecycle recovery, signed
  builds, notification and store privacy material, and physical-device
  verification.

## Milestone L.2: Web Navigation Realignment and React Native Mobile Foundation

- [x] 40. **Web navigation consolidation and responsive layout refinement** - streamline
  web navigation to at most four primary destinations (Tasks, Follow Ups, Notes,
  and More), moving secondary tools (Inbox, Plan My Day, Calendar, Analytics,
  Backup, and Settings) into an intuitive, responsive slide-over drawer and modal,
  ensuring clean mobile viewport responsiveness and zero overcrowding.
- [x] 41. **Expo and React Native mobile foundation with four-tab native navigation** -
  re-scaffold `apps/mobile` with official Expo and Expo Router, implementing a
  strict four-tab bottom navigation bar (Tasks, Follow Ups, Notes, and More),
  native `expo-sqlite` persistence with an in-memory test driver, native primitives
  (View, Text, Pressable, TextInput, StyleSheet), and core Task and Note CRUD.
- [x] 42. **React Native product parity and mobile-first workflows** - independently
  implement Follow Up recurrence, direct communication launchers (phone, email,
  WhatsApp via native linking), Plan My Day, Actionable Notes, Calendar view,
  Analytics, local closed-app notifications via `expo-notifications`, and native
  dark and light themes.
- [ ] 43. **React Native cloud synchronization, accounts, and emulator launch** -
  independently implement secure token storage via `expo-secure-store`, passwordless
  email OTP authentication, local data cloud adoption, bidirectional outbox
  synchronization against the backend API, native conflict resolution modal,
  lifecycle recovery, and live verification on the Android emulator.

## Milestone M: Native Windows Application

- [ ] 44. **WPF offline foundation** - create the independent .NET 10 WPF
  application with MVVM, Windows-owned SQLite migrations, task and note CRUD,
  search, backup import and export, keyboard navigation, and offline restart
  behavior.
- [ ] 45. **WPF product and differentiated feature parity** - independently
  implement priorities, due dates, categories, ordering, calendar, analytics,
  rich-text editing, note reading, themes, Plan My Day, actionable notes,
  Follow Up recurrence, Windows closed-app notifications, communication
  launchers, keyboard-oriented fast capture, Narrator support, contrast themes,
  and high-DPI layouts.
- [ ] 46. **WPF API integration and release readiness** - independently implement
  authentication, synchronization for all supported entities, DPAPI-protected
  sessions, conflict resolution, network and notification recovery, signed x64
  and Arm64 MSIX packaging, and Microsoft Store readiness.

## Milestone N: Cross-Platform Hardening

- [ ] 47. **Cross-platform compatibility and operational hardening** - verify
  migration recovery, API backward compatibility, recurrence consistency,
  multi-device convergence, notification permission and delivery failure,
  account deletion, abuse controls, accessibility, synchronized-mode privacy,
  backup portability, observability, release rollback, and production support
  procedures.
