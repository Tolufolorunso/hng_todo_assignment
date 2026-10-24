# TaskFlow

TaskFlow is a differentiated, local-first personal productivity suite for Web, Android/iOS, and Windows. It combines structured task management, Microsoft Word-style rich notes, capacity-aware daily planning, and proactive follow-up tracking with optional cross-device synchronization.

Everything works offline on your device first. No account or network connection is required to manage tasks, format rich documents, inspect analytics, or export backups. For users who work across multiple devices, optional passwordless accounts enable cloud synchronization.

## Features

### Shipped Web Capabilities

- **Task Management** - Create, view, edit, reorder, categorize, and complete tasks with priority badges, date-only scheduling, and overdue indicators.
- **Rich-Text Formatting** - Microsoft Word-style WYSIWYG editor for note bodies and task descriptions with formatting ribbons, heading hierarchy, and sanitized HTML.
- **Standalone Note Reader** - Dedicated reading view (`/notes/[id]`) with typography controls, word counts, estimated reading time, printing, and PDF export.
- **Curated Categories** - Work, Personal, Urgent, Study, and Ideas classification with badge indicators and instant category filtering.
- **Calendar & Schedule View** - Monthly interactive calendar (`/calendar`) mapping due dates, overdue work, and daily workloads.
- **Productivity Analytics** - Insights dashboard (`/analytics`) with completion rates, category distributions, priority breakdowns, and productivity trends.
- **Backup & Restore** - Comprehensive JSON snapshot export and validated schema import with merge or replacement strategies.
- **Responsive SaaS Interface** - Dark-default design system with instant light mode toggle, widescreen desktop layout, fixed bottom dock, and touch-friendly mobile navigation.
- **Offline-First PWA** - Installable Progressive Web App with service worker caching, instant restarts, and connectivity indicators.

### Planned Milestone Capabilities

- **Follow Up Commitments** - Track one-time and recurring commitments, schedule reminders, snooze deadlines, and launch external communications.
- **Plan My Day** - Capacity-aware recommendation engine that builds an achievable daily plan from your backlog and available hours.
- **Actionable Notes** - Turn note highlights directly into tasks or follow-ups with persistent backlinks.
- **Fast Capture Inbox** - Minimal-friction quick capture for fleeting ideas and web links, with keyboard shortcuts and mobile share targets.

## Architecture and Clients

TaskFlow is delivered through three independently maintained clients without shared runtime application code:

1. **Web and PWA (`apps/web`)** - Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, and browser-persisted IndexedDB. Hosts the Next.js client and the versioned `/api/v1` Route Handlers.
2. **Mobile (`apps/mobile`)** - Independent React Native application for Android and iOS using local SQLite, native navigation, local notification scheduling, and share integration.
3. **Windows (`apps/windows`)** - Independent C# and WPF desktop application for .NET 10 LTS using local SQLite, MVVM, keyboard commands, high-DPI scaling, and Windows toast notifications.

Consistency across platforms is guaranteed through versioned HTTP API contracts (`/api/v1`) and shared contract test fixtures, rather than shared client libraries.

## Your Data and Privacy

TaskFlow prioritizes transparency, user control, and data ownership:

- **Local-Only Mode** - By default, all tasks, notes, categories, and settings reside solely on your device in IndexedDB or SQLite. Zero data leaves your machine.
- **Optional Accounts** - Accounts are entirely optional and use passwordless email verification codes (OTP). Anonymous local data is never uploaded automatically; synchronization requires explicit user confirmation.
- **Cloud Synchronization** - Synchronized account data is transmitted over HTTPS and stored in PostgreSQL. In this phase, cloud synchronization is **not end-to-end encrypted**; data is stored securely in the database so the server can validate, sanitize, and schedule reminders.
- **Follow Up Contact Data** - Contact names, emails, and phone numbers remain strictly local in local-only mode. Communication launchers (`mailto:`, `https://wa.me/`, `tel:`) open external applications via standard URIs. TaskFlow never tracks whether messages were sent, never confirms call completion, and never transmits autonomous background messages.
- **No Behavioral Telemetry** - TaskFlow includes zero tracking pixels, behavioral telemetry, third-party analytics libraries, or advertising scripts.

## Notifications

- **Mobile and Windows** - Schedule local notifications directly through the operating system without requiring an account, server infrastructure, or an active internet connection.
- **Web Client** - In-app visual alerts operate whenever the tab is open. Closed-browser notifications require an account, Web Push subscription, browser permissions, and active network connectivity.
- **Best-Effort Delivery** - Notifications are subject to operating system battery optimizations, focus modes, and browser background policies.
- **Lock-Screen Privacy** - Notification previews display generic text by default (e.g. "Follow-up due") to prevent sensitive contact names or personal notes from showing on lock screens.

## Platform Support Policy

- **Web** - Modern evergreen browsers (Google Chrome, Microsoft Edge, Mozilla Firefox, and Apple Safari) and installable PWA environments.
- **Windows** - Supported on current Windows 11 releases and Windows 10 Enterprise / IoT LTSC build 17763 or newer. Consumer Windows 10 is supported on a best-effort basis.
- **Mobile** - Supported Android and iOS releases covered by modern React Native and Expo frameworks.

## Explicit Non-Goals

TaskFlow intentionally excludes the following features to remain focused, private, and lightweight:

- Shared runtime code across web, mobile, and Windows.
- Mandatory user registration.
- Automatic upload of anonymous local data.
- Multi-user collaboration, team accounts, or shared workspaces.
- Real-time collaborative editing or CRDT engines.
- Comments, mentions, or assigning work to other users.
- Customer relationship management (CRM) systems or address-book synchronization.
- Marketing campaigns or bulk messaging.
- Autonomous background messaging without user initiation.
- End-to-end encrypted cloud synchronization in this phase.
- File attachments or general cloud file storage.
- Advertisements or subscription paywalls.

## Local Development

```bash
npm run dev     # dev server at http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run test    # unit test suite (Vitest)
npm run lint    # ESLint static analysis
```

For complete architectural specifications, refer to [docs/product-alignment.md](file:///c:/Users/oreofe/Desktop/Agentic%20AI/taskflow/docs/product-alignment.md).
