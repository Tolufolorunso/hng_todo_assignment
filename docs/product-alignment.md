# Product, Architecture, and Privacy Alignment

This document outlines the product direction, client architectures, privacy commitments, notification boundaries, platform support policy, and explicit non-goals for TaskFlow.

## 1. Product Vision

TaskFlow is a differentiated personal productivity suite designed for individuals who need focused task management, Microsoft Word-style rich notes, capacity-aware daily planning, and proactive follow-up tracking.

TaskFlow is architected around a local-first philosophy: every client is fully functional offline and stores data on the user's device first. Optional cloud synchronization enables seamless multi-device continuity without compromising the local-only experience.

## 2. Three Independently Maintained Clients

TaskFlow provides dedicated experiences across three major platforms, each implemented natively without shared runtime application code:

1. **Web and PWA (`apps/web`)**
   - **Stack:** Next.js (App Router), React 19, TypeScript strict mode, Tailwind CSS v4, and standard Service Worker caching.
   - **Local Storage:** Browser IndexedDB via `idb`, with client-side migrations and validation.
   - **Cloud Role:** Hosts the Next.js frontend and the versioned `/api/v1` Route Handlers backed by PostgreSQL for optional account synchronization.

2. **Mobile Application (`apps/mobile`)**
   - **Stack:** Independent React Native application targeting Android and iOS.
   - **Local Storage:** SQLite database with mobile-owned migrations.
   - **Platform Capabilities:** Native navigation, safe-area handling, dynamic text, local operating-system notification scheduling, share-sheet capture, and contact launchers.

3. **Windows Application (`apps/windows`)**
   - **Stack:** Independent C# and WPF application targeting .NET 10 LTS with MVVM architecture.
   - **Local Storage:** Local SQLite database via `Microsoft.Data.Sqlite`.
   - **Platform Capabilities:** Keyboard-first commands, high-DPI scaling, contrast themes, Narrator / UI Automation, DPAPI credential protection, and native Windows toast notifications.

### Shared Behavior Without Shared Code
The three clients do not import shared runtime packages or UI components. Instead, consistency is maintained through:
- A single versioned HTTP API (`/api/v1`) providing identical serialization, validation, and error shapes.
- Shared JSON fixture documents validating recurrence calculations, date formats, and planning rules.
- Common rich-text format constraints (`taskflow-html-v1`).

## 3. Account and Workspace Model

TaskFlow supports two distinct modes of operation:

1. **Local-Only Mode (Default)**
   - No account registration or email required.
   - Full productivity workflow: tasks, categories, rich-text notes, calendar views, analytics, and manual JSON backup/restore work completely on-device.
   - Zero network transmission of productivity data.

2. **Optional Synchronized Mode**
   - Passwordless authentication using email one-time passwords (OTP).
   - Rotating refresh session tokens with server-side revocation and logout.
   - Local-first synchronization: mutations are saved locally first, then synchronized to PostgreSQL through idempotent batch endpoints.
   - Explicit data adoption: existing anonymous local items are never uploaded silently; account synchronization requires explicit user confirmation.

## 4. Privacy and Data Governance

TaskFlow maintains strict boundaries between local and synchronized data:

### Local-Only Privacy
- All tasks, note content, category assignments, and follow-up data remain strictly within the device database (IndexedDB or SQLite).
- No telemetry, third-party analytics scripts, advertising SDKs, or tracking pixels are included.
- Manual JSON backups remain under direct user custody.

### Synchronized Privacy
- Synchronized account data is transmitted over HTTPS and stored in managed PostgreSQL.
- **No End-to-End Encryption:** Cloud synchronization is not end-to-end encrypted in this phase. The server validates, sanitizes, and schedules notifications for synchronized items. Users requiring mathematical confidentiality against server access should use local-only mode.
- Server logs exclude note bodies, task descriptions, commitment details, contact addresses, passwords, and push subscription secrets.

### Follow Up Contact Data and Launchers
- Follow Up commitments allow users to record contact names, email addresses, and phone numbers.
- Contact details remain strictly local in local-only mode, and synchronize to PostgreSQL only within authenticated accounts.
- Communication launchers (`mailto:`, `https://wa.me/`, `tel:`) open external applications using validated, URL-encoded URIs.
- TaskFlow never verifies whether an external email was sent or a phone call was completed.
- Opening a launcher never automatically completes, marks, or deletes a commitment.
- TaskFlow never performs autonomous background communication or bulk messaging.

## 5. Notification Realities and Limitations

Notification capabilities differ naturally across web and native platforms:

### Native Mobile and Windows Notifications
- Scheduled directly through local operating system APIs from the local SQLite database.
- Work completely offline without requiring an account, server connection, or active network.

### Web Notifications
- In-app visual alerts and overdue chips work whenever the web application is open.
- Closed-app notifications require an authenticated account, Web Push permission, an active browser push subscription, and network connectivity.

### Best-Effort Delivery and Privacy
- All notifications are best effort: operating system power management, focus modes, browser background policies, and battery optimizations may delay or suppress delivery.
- **Lock-Screen Privacy:** Notification previews are generic by default (e.g. "Follow-up due") to protect personal and contact details on lock screens. Detailed previews showing names or notes require explicit user opt-in in settings.

## 6. Platform Support Policy

- **Web:** Evergreen releases of Google Chrome, Microsoft Edge, Mozilla Firefox, and Apple Safari with modern JavaScript and Service Worker support.
- **Windows:** Officially tested and supported on current Windows 11 releases and Windows 10 Enterprise / IoT LTSC (build 17763 or newer). Unsupported consumer Windows 10 builds are best effort.
- **Mobile:** Recent versions of Android and iOS supported by current React Native and Expo frameworks.
- **API Compatibility:** API v1 guarantees backward compatibility for prior native client releases. Additive fields remain optional; breaking changes require a new versioned route.

## 7. Explicit Non-Goals

The following features and architectures are explicitly outside the scope of TaskFlow:

- Shared runtime code across web, mobile, and Windows.
- Mandatory sign-up or accounts.
- Automatic or silent upload of anonymous local data.
- Multi-user collaboration, team accounts, or shared workspaces.
- Real-time collaborative editing or CRDT engines.
- Comments, mentions, or assigning work to other people.
- Customer relationship management (CRM) features or address-book synchronization.
- Marketing campaigns, bulk messaging, or mass communication tools.
- Autonomous background messaging without direct user interaction.
- Guaranteed notification delivery bypassing operating system controls.
- End-to-end encrypted cloud storage in this phase.
- Arbitrary file attachments or cloud drive synchronization.
- Monetization, subscription paywalls, or advertisements.
