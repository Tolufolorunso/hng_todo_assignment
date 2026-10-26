# Project Plan

> One of the two user-owned planning documents. TaskFlow began as an HNG
> assignment and completed its original web roadmap through Milestone H.
> This revision defines its next phase as a differentiated, cross-platform,
> local-first productivity product.
>
> Edit this document directly at any time. When both planning documents are
> approved and written, run `/overview` to refresh the durable project context.

## 1. Problem - What problem are we solving?

TaskFlow began as an assignment requiring a working To-Do application with full
task management, notes, browser persistence, AI-assisted development, and public
deployment.

The shipped web application grew into a private, offline-capable personal
productivity suite with tasks, rich notes, scheduling, calendar views,
productivity analytics, backup and restore, responsive navigation, and a modern
dark and light interface.

The next product phase addresses four related problems.

### 1.1 Productivity tools store work but do not help users choose

A large backlog can become another source of stress. Priorities and due dates
help organize it, but users still have to decide what realistically fits into
today.

TaskFlow should help users turn their backlog into a small, achievable daily plan
based on available time, due dates, priorities, optional effort estimates, and
due follow-ups.

### 1.2 People forget commitments that do not look like tasks

Many important responsibilities begin as promises:

- Email a customer with an update.
- Call a family member next weekend.
- Check whether a friend received something.
- Follow up with a client every Friday.
- Contact someone again seven days after the previous conversation.

These commitments are easily lost in notes, messages, memory, or a general task
list. TaskFlow should remember who needs attention, what was promised, when to
act, and how to start the communication.

### 1.3 Useful notes often fail to become action

A meeting note, study note, or personal document can contain an actionable
sentence, but copying it into a separate task loses context and adds friction.

TaskFlow should let a user turn selected note content into a task or follow-up
while preserving a link and a snapshot of the original context.

### 1.4 Capturing something is often slower than forgetting it

Ideas, tasks, shared links, and commitments arrive while the user is doing
something else. Requiring navigation, classification, and a full form before
saving creates enough friction that people postpone capture.

TaskFlow should provide an offline inbox that accepts minimal text or a shared
link immediately and lets the user organize it later.

### 1.5 Browser-only data limits availability

A person may plan work in a browser, carry tasks on a phone, and use a dedicated
desktop application on Windows. A browser-only database leaves each browser
profile isolated.

TaskFlow will become one product delivered through three independently
implemented clients:

- A Next.js web application that also hosts the backend API.
- A React Native application for Android and iOS.
- A C#/.NET WPF application for Windows 10 and Windows 11.

Every client remains useful without connectivity. Users may work entirely
locally without creating an account. An optional account adds synchronization,
cloud recovery, and closed-app web push notifications.

### Desired outcome

A user can open TaskFlow and quickly answer four questions:

1. What did I just need to remember?
2. What can I realistically complete today?
3. Who have I promised to contact?
4. What action came out of this note?

The user can complete these workflows on web, Android, iOS, or Windows whether
online or offline, subject to platform notification constraints.

When the user chooses to sign in:

- All clients synchronize through the versioned API hosted by `apps/web`.
- Offline changes remain queued until connectivity returns.
- Retries do not create duplicates.
- Stale devices cannot recreate deleted records.
- Conflicting edits remain recoverable until the user chooses an outcome.
- A delayed mobile or Windows update remains compatible with the current API.
- The web client may receive Follow Up notifications while closed through
  account-based web push.

The product keeps platform implementations independent. The clients share a
backend contract and behavioral fixtures, not runtime source code.

## 2. Users - Who is this for?

### Primary users

- Individuals managing personal tasks, notes, schedules, priorities, and
  commitments across computers and phones.
- Students, developers, creators, freelancers, and knowledge workers who need
  help deciding what to do today.
- Customer-facing individuals who need to remember promises without adopting a
  full customer relationship management system.
- People who want to remember commitments to friends and family as well as work
  contacts.
- Privacy-conscious users who prefer to keep data only on their device and do
  not want an account.
- Multi-device users who want optional cloud synchronization and recovery.

### Secondary users

- Assignment and portfolio reviewers evaluating the shipped web product.
- Windows-first users who prefer an installed application with keyboard,
  high-DPI, notification, and accessibility support.
- Mobile users who need quick, touch-friendly capture and action while away from
  a computer.

### Not for

- Teams sharing one workspace.
- Real-time collaborative editing.
- Enterprise project management.
- Sales automation, marketing campaigns, or a full customer relationship
  management system.
- Organizations requiring centralized administration, audit logs, compliance
  controls, or service-level agreements.
- Users requiring end-to-end encrypted cloud synchronization in this phase.

## 3. Confirmed product and architecture decisions

### 3.1 Product decisions

- TaskFlow remains a personal productivity product.
- Accounts are optional.
- Local-only mode remains a complete and permanent way to use the product.
- Anonymous local data is never uploaded automatically.
- Signing in does not automatically copy local-only data into an account.
- The user explicitly decides whether to adopt local data into an account.
- The original local workspace remains available until adopted records have
  synchronized successfully.
- Cloud synchronization is not end-to-end encrypted in this phase.
- There is no monetization requirement.
- The four differentiating capabilities are Plan My Day, Follow Up, actionable
  notes, and extremely fast capture.

### 3.2 Plan My Day decisions

- The user supplies the amount of time available for the day.
- Tasks may have an optional effort estimate.
- Due and overdue follow-ups may participate in the plan alongside tasks.
- Recommendations consider due dates, overdue state, priority, effort, and
  available capacity.
- The initial recommendation engine is deterministic and local. It does not
  require an external AI service.
- TaskFlow explains why an item was suggested.
- Suggestions never become the user's plan until the user accepts or edits them.
- TaskFlow never silently changes deadlines, completion state, priority, or
  recurrence.
- Unfinished work is not silently moved into another day. TaskFlow may suggest it
  again, but the user approves the next plan.

### 3.3 Follow Up decisions

- A follow-up records who the user intends to contact, what was promised, when
  action is due, and which communication actions are available.
- Follow-ups may be one-time or recurring.
- Recurring follow-ups support both:
  - Calendar-anchored schedules, such as every Friday.
  - Completion-relative schedules, such as seven days after the previous
    follow-up was completed.
- Snoozing changes only the current occurrence.
- Rescheduling must make the scope explicit: this occurrence or the whole series.
- Completing or skipping an occurrence records history and computes the next
  occurrence according to the recurrence mode.
- An unresolved overdue follow-up remains visible until completed, skipped, or
  rescheduled.
- Available one-tap launchers may open the email client, WhatsApp, or phone
  dialer.
- TaskFlow never sends a message, starts a call, or marks a follow-up complete
  automatically.
- The user confirms completion after acting.
- No full address book, contact synchronization, or customer database is
  required in the initial version.

### 3.4 Notification decisions

- Follow Up can notify users while TaskFlow is open or closed.
- Notifications are opt-in and respect operating-system and browser permissions.
- Mobile and Windows use locally scheduled notifications and can notify a
  local-only user without an account or network connection.
- The web client provides in-app reminders without an account.
- Closed-app web notifications require an account, a registered push
  subscription, network delivery, and browser support.
- When a platform supports notification action buttons, TaskFlow may expose the
  preferred communication launcher directly. Otherwise, the notification opens
  the relevant Follow Up screen with one-tap launchers.
- Notification delivery is best effort because browsers and operating systems
  may suppress, delay, expire, or revoke notifications.
- TaskFlow shows notification readiness and catches up with overdue follow-ups
  when the application next opens.
- Notification previews must not expose commitment or contact details on a lock
  screen unless the user allows detailed previews.
- Server and device scheduling must avoid duplicate alerts for the same
  occurrence where the platform permits.

### 3.5 Actionable note decisions

- A user may select note content and create either a task or a follow-up from it.
- The resulting action stores a reference to the source note and a plain-text
  snapshot of the selected context.
- Editing or deleting the source note does not delete the resulting action.
- If the source note no longer exists, the stored context snapshot remains
  readable.
- The note may show backlinks to actions created from it.

### 3.6 Fast capture decisions

- Fast capture accepts minimal text or a shared text link without requiring
  immediate classification.
- Captured material enters an inbox for later processing.
- Processing may convert the capture into a task, note, or follow-up.
- Capture works offline and survives application termination.
- The initial format supports text and links, not file attachments.
- Platform entry points are implemented independently:
  - Web keyboard shortcut, compact capture interface, and installed-PWA share
    target where supported.
  - Mobile share sheet, application shortcut, and in-app quick capture.
  - Windows keyboard-oriented launcher and the fastest supported system entry
    point without requiring another third-party application.
- No capture parser may silently create deadlines, contacts, or outbound
  communication without user confirmation.

### 3.7 Platform decisions

- Web uses Next.js.
- Android and iOS use one React Native application.
- Windows 10 and Windows 11 use C#/.NET WPF.
- Web uses IndexedDB for local persistence.
- Mobile and Windows use independent SQLite databases.
- Synchronized cloud data is stored in PostgreSQL.
- Every client reads and writes its local database first.

### 3.8 Repository decisions

The repository is a monorepo with three application roots:

```text
apps/
  web/       Next.js web UI and backend API
  mobile/    React Native Android and iOS application
  windows/   C#/.NET WPF application
```

There is no separate API project. The API lives inside the Next.js web
application at:

```text
apps/web/app/api/v1/
```

The applications do not share runtime source code:

- No shared domain package.
- No shared model package.
- No shared validation package.
- No shared user interface package.
- No shared storage repository.
- No shared synchronization client.
- No generated client SDK imported by multiple applications.
- No application imports source files from another application directory.

The HTTP and JSON API behavior, OpenAPI document, recurrence examples,
notification rules, rich-text fixtures, and backup examples are integration
contracts. Each client implements those contracts independently.

## 4. Product scope

### 4.1 Shipped web foundation

The existing Next.js application already provides:

#### Task management

- Create, view, edit, complete, reopen, and delete tasks.
- Rich HTML task descriptions.
- Priorities and date-only due dates.
- Overdue highlighting.
- Curated Work, Personal, Urgent, Study, and Ideas categories.
- Search, status filtering, category filtering, and sorting.
- Custom drag-and-drop ordering persisted in IndexedDB.

#### Notes

- Standalone notes with create, read, update, delete, and search behavior.
- Microsoft Word-style rich-text editing.
- Sanitized HTML persistence and plain-text list excerpts.
- Dedicated note reader with reading time, word count, copying, printing, and
  PDF export through browser printing.

#### Planning and insight

- Monthly calendar displaying tasks by due date.
- Date inspection and overdue states.
- Analytics for completion rate, category distribution, priority distribution,
  and productivity statistics.

#### Offline and portability

- Browser-local IndexedDB storage.
- Installable Progressive Web App metadata.
- A service worker and offline status indicator.
- Versioned JSON export.
- Validated merge and replacement restore modes.

#### Presentation and delivery

- Responsive multi-page interface.
- Widescreen task workspace.
- Mobile top bar and bottom navigation.
- Dark mode by default with a persistent light mode option.
- TaskFlow vector branding and favicon.
- Site-wide developer attribution and showcase modal.
- Search metadata, Open Graph metadata, structured data, sitemap, and robots
  configuration.
- Vercel deployment configuration.

### 4.2 Differentiating productivity capabilities

#### Follow Up

- One-time and recurring commitments.
- Person, commitment, due time, optional details, and available communication
  targets.
- Calendar-anchored and completion-relative recurrence.
- In-app due and overdue presentation.
- Local closed-app notifications on mobile and Windows.
- Account-based closed-app web push.
- Email, WhatsApp, and phone launchers.
- Completion, skipping, snoozing, rescheduling, and occurrence history.
- Notification readiness, privacy, and delivery feedback.

#### Plan My Day

- Optional task effort estimates.
- Daily available-time entry.
- Transparent recommendations using tasks and due follow-ups.
- User-controlled acceptance, removal, addition, and ordering.
- Capacity summary and visible explanation for recommendations.
- No silent changes to the underlying backlog.

#### Actionable notes

- Create tasks or follow-ups from selected note content.
- Preserve source-note links and context snapshots.
- Show backlinks where useful.
- Preserve created actions when a note changes or is deleted.

#### Fast capture

- Minimal offline inbox capture.
- Text and shared-link support.
- Deferred classification into tasks, notes, or follow-ups.
- Keyboard, share-sheet, application shortcut, and platform-appropriate entry
  points.
- Clear processed, discarded, and pending states.

### 4.3 Cross-platform expansion

#### Web and backend API

- Preserve all existing web behavior and the existing public origin.
- Deliver the four differentiating capabilities first in the existing web app
  where their behavior can be validated.
- Move the web project mechanically into `apps/web`.
- Keep IndexedDB as the web client's source of truth.
- Host the versioned API in Next.js Route Handlers under `/api/v1`.
- Add PostgreSQL persistence for synchronized account data.
- Add optional authentication, synchronization, conflict handling, and account
  controls.
- Add account-based web push subscriptions and scheduled Follow Up dispatch.
- Harden the PWA shell and exclude private API responses from caching.

#### React Native mobile application

- Native Android and iOS interface implemented independently from the web UI.
- Mobile-owned task, note, Follow Up, Plan My Day, inbox, calendar, analytics,
  settings, and account screens.
- SQLite local database with explicit mobile migrations.
- Native navigation, safe-area behavior, keyboard handling, and adaptive phone
  and tablet layouts.
- Touch-friendly and screen-reader-accessible task reordering.
- Independent rich-text editor and renderer.
- Mobile share-sheet and application-shortcut capture.
- Locally scheduled Follow Up notifications without requiring an account.
- Email, WhatsApp, and phone launchers.
- Backup import and export through mobile document and share interfaces.
- Optional authentication, synchronization, and conflict resolution.
- Signed Google Play and Apple App Store release paths.

#### WPF Windows application

- Native WPF interface using .NET 10 LTS.
- Windows-owned task, note, Follow Up, Plan My Day, inbox, calendar, analytics,
  settings, and account screens.
- SQLite local database with explicit Windows migrations.
- MVVM presentation structure.
- Keyboard-first navigation and commands.
- Narrator, UI Automation, contrast theme, and high-DPI support.
- Independent rich-text editor and renderer.
- Keyboard-oriented fast capture.
- Locally scheduled Windows notifications without requiring an account.
- Email, WhatsApp, and phone URI launchers when available.
- File-based backup import and export.
- Optional authentication, synchronization, and conflict resolution.
- Signed x64 and Arm64 MSIX packages.

#### Shared online behavior without shared code

- One versioned HTTP API serves all three clients.
- One account can synchronize supported product data across web, mobile, and
  Windows.
- Every client implements the API contract independently.
- The API performs final authorization, validation, and sanitization.
- Compatibility is verified by black-box requests and shared fixture documents,
  not imported runtime libraries.

## 5. Core user workflows

### 5.1 Local-only first use

1. The user opens or installs TaskFlow.
2. TaskFlow creates a local-only workspace.
3. No registration is requested before the user can work.
4. Tasks, notes, follow-ups, plans, inbox captures, settings, and analytics use
   the local database.
5. Core features continue to work while disconnected.
6. Local-only content is not uploaded.

### 5.2 Capturing something quickly

1. The user invokes the fastest available capture entry point.
2. The user enters text or shares supported text or a link.
3. TaskFlow saves an inbox item locally without requiring categorization.
4. The user may return immediately to the previous activity.
5. Later, the user converts the item into a task, note, or follow-up, or discards
   it.
6. Processing is idempotent so retries cannot create duplicate target records.

### 5.3 Planning the day

1. The user opens Plan My Day and enters available time.
2. TaskFlow evaluates incomplete tasks and due or overdue follow-ups.
3. TaskFlow proposes a capacity-aware ordered shortlist.
4. Each suggestion includes a reason, such as overdue, due today, high priority,
   or fitting the remaining time.
5. The user removes, adds, or reorders items.
6. The user accepts the plan.
7. Completing an item updates its underlying task or follow-up.
8. Unfinished work remains in the backlog and may be suggested again later.

### 5.4 Creating and acting on a follow-up

1. The user records a person, commitment, due time, and optional communication
   targets.
2. The user optionally defines recurrence and chooses its calculation mode.
3. TaskFlow presents the follow-up when due and schedules supported
   notifications.
4. The notification or detail view offers the available email, WhatsApp, or
   phone launcher.
5. TaskFlow opens the external application but does not send or call.
6. The user returns and marks the occurrence complete, skips it, snoozes it, or
   reschedules it.
7. TaskFlow records the outcome and, if recurring, calculates the next
   occurrence.

### 5.5 Recurring follow-up behavior

#### Calendar-anchored example

A follow-up scheduled for every Friday remains anchored to Friday. Completing it
late on Monday does not move all future occurrences to Monday.

#### Completion-relative example

A follow-up scheduled for seven days after completion uses the actual completion
time to determine the next occurrence.

Rules:

- Snooze affects only the current occurrence.
- Reschedule asks whether to change the current occurrence or the series.
- Skipping records history and advances according to the recurrence rule.
- An unresolved occurrence remains overdue rather than creating an unbounded
  stack of duplicate reminders.
- Concurrent devices cannot advance the same occurrence twice.

### 5.6 Turning a note into action

1. The user selects meaningful text in a note.
2. The user chooses Create task or Create follow-up.
3. TaskFlow pre-fills the new item using the selected text.
4. The user confirms required details.
5. The new action stores the source note ID and a context snapshot.
6. The user can navigate back to the note while it exists.
7. The action remains usable if the note later changes or is deleted.

### 5.7 Notification permission and readiness

1. TaskFlow asks for notification permission only when the user enables Follow
   Up reminders or tests notification delivery.
2. TaskFlow explains which delivery modes are available on the current platform.
3. If permission is denied, reminders remain visible in the application.
4. If a subscription expires or permission is revoked, TaskFlow reports that
   closed-app delivery is unavailable.
5. Opening TaskFlow always catches up with due and overdue follow-ups.

### 5.8 Enabling synchronization

1. The user chooses to enable synchronization.
2. The user requests and verifies an email one-time password.
3. TaskFlow creates or opens a local cache associated with that account.
4. If local-only content exists, TaskFlow shows its record counts.
5. The user decides whether to copy that content into the account workspace.
6. Signing in alone does not upload local-only content.
7. The original local-only workspace remains available until adopted content
   has been acknowledged by the server.

### 5.9 Routine offline and online work

1. A user action commits to the local database first.
2. If the active workspace is synchronized, the same transaction records an
   outbox mutation.
3. The interface updates without waiting for the network.
4. Synchronization runs when connectivity is available.
5. Accepted mutations are removed from the outbox.
6. Remote changes are pulled into the local database.
7. The interface shows whether it is local-only, offline, pending, syncing,
   synchronized, blocked by authentication, or in error.
8. Native reminder scheduling is refreshed after relevant local changes.

### 5.10 Conflict resolution

1. A client submits the last server revision it observed.
2. The server rejects a stale update or deletion instead of choosing silently.
3. The client preserves the attempted local version and current server version.
4. The visible record adopts the server version so devices converge.
5. The user may keep the cloud version, keep the local version, or save local
   content as a separate copy where content could otherwise be lost.
6. Deleted records cannot be restored automatically by a stale offline client.
7. A stable occurrence ID prevents two devices from resolving the same recurring
   follow-up twice without an explicit conflict.

### 5.11 Backup and migration

- Every client exports a documented logical JSON backup.
- Existing version 1 web backups remain importable.
- Backup version 2 includes product entities introduced by this plan.
- Browser exports can be imported into mobile or Windows.
- Restoring into a synchronized workspace creates normal local mutations that
  pass through regular synchronization rules.
- Credentials, push subscriptions, and internal synchronization metadata are
  never placed in a normal user backup.
- The export flow warns that follow-up contact details are sensitive.

### 5.12 Account, device, and notification controls

The following remain separate actions:

- Pause synchronization.
- Sign out.
- Return to the local-only workspace.
- Remove one account's cached data from the current device.
- Enable or disable Follow Up notifications on this device.
- Register or remove this browser's push subscription.
- Choose whether notification previews show details.
- Export a backup.
- Delete the cloud account and synchronized data.

## 6. Data and persistence

### 6.1 Logical task record

The future API-level task representation includes:

- `id`: stable string identifier.
- `title`: required string, maximum 200 characters.
- `description`: optional sanitized `taskflow-html-v1` content, maximum 20,000
  characters.
- `completed`: boolean.
- `priority`: `"low"`, `"medium"`, or `"high"`.
- `dueDate`: `YYYY-MM-DD` string or `null`.
- `category`: `"work"`, `"personal"`, `"urgent"`, `"study"`, `"ideas"`, or
  `null`.
- `estimatedMinutes`: optional positive integer within documented limits.
- `sourceNoteId`: optional source note identifier.
- `sourceExcerpt`: optional plain-text snapshot retained for context.
- `createdAt`: UTC RFC 3339 timestamp.
- `updatedAt`: UTC RFC 3339 timestamp used for display, not conflict winning.
- `completedAt`: UTC RFC 3339 timestamp or `null`.

The existing web `order` field is retained during migration but is not the
future synchronization mechanism.

### 6.2 Logical note record

- `id`: stable string identifier.
- `title`: required string, maximum 200 characters.
- `body`: sanitized `taskflow-html-v1` content, maximum 50,000 characters.
- `createdAt`: UTC RFC 3339 timestamp.
- `updatedAt`: UTC RFC 3339 timestamp used for display.

Backlinks to tasks and follow-ups are derived from their `sourceNoteId` fields.

### 6.3 Logical Follow Up record

A Follow Up series or one-time commitment includes:

- `id`: stable string identifier.
- `personName`: required display name, maximum 200 characters.
- `commitment`: required summary of what the user intends to do.
- `details`: optional plain text within documented limits.
- `dueAt`: UTC RFC 3339 timestamp for the current occurrence.
- `timeZone`: canonical time-zone identifier used for calendar recurrence.
- `emailAddress`: optional validated email launch target.
- `phoneNumber`: optional validated phone launch target.
- `whatsAppNumber`: optional validated WhatsApp launch target.
- `preferredAction`: `"email"`, `"whatsapp"`, `"phone"`, or `null`.
- `recurrence`: structured rule or `null`.
- `status`: `"open"`, `"completed"`, or `"archived"`.
- `sourceNoteId`: optional source note identifier.
- `sourceExcerpt`: optional plain-text context snapshot.
- `createdAt`: UTC RFC 3339 timestamp.
- `updatedAt`: UTC RFC 3339 timestamp.

Contact targets belong to the follow-up. This phase does not introduce a
separate address book or contact-management product.

### 6.4 Recurrence rule

A recurrence rule contains enough structured information to express:

- Calendar-anchored or completion-relative calculation.
- Frequency and interval.
- Applicable weekday, month-day, or equivalent calendar fields.
- Local wall-clock time where applicable.
- Canonical time zone.
- Optional end condition when supported.

Calendar recurrence preserves the intended local wall-clock schedule across
daylight-saving changes. Completion-relative recurrence calculates the next
occurrence from the completed occurrence according to the documented rule.

Every client must pass the same black-box recurrence fixtures, including
daylight-saving and month-boundary examples.

### 6.5 Follow Up occurrence history

Each occurrence has:

- A stable occurrence ID.
- Parent Follow Up ID.
- Scheduled due time.
- Resolution outcome: completed, skipped, or explicitly recorded as missed.
- Resolution timestamp where applicable.
- The next due time produced by the recurrence rule.

An unresolved overdue occurrence remains open. Notification dispatch state is
not authoritative occurrence history.

### 6.6 Daily plan

A daily plan includes:

- Stable ID.
- Local calendar date.
- Time zone used when the plan was created.
- Available minutes.
- Ordered references to tasks and Follow Up occurrences.
- Accepted timestamp.
- Updated timestamp.

Recommendation scores and explanations are derived. The accepted selection and
ordering are authoritative user data and may synchronize.

### 6.7 Inbox capture

An inbox capture includes:

- Stable ID.
- Captured text.
- Optional shared URL.
- Optional source application label supplied by the platform.
- Captured timestamp.
- State: pending, processed, or discarded.
- Optional references to resulting task, note, or follow-up.
- Processed or discarded timestamp where applicable.

Processing a capture and creating its result must be idempotent.

### 6.8 Task order document

Task ordering is synchronized as one document:

- `id`: `"default"`.
- `orderedIds`: ordered array of task IDs.

Rules:

- Unknown or deleted IDs are ignored.
- Tasks missing from the document are appended deterministically.
- One reorder action creates one logical synchronization mutation.
- An order conflict may accept the server order and let the user reorder again
  because no task content is lost.

### 6.9 Local workspace state

Each client independently stores:

- One local-only workspace.
- Separate cached scopes for authenticated accounts used on the device.
- Tasks and notes.
- Follow-ups and occurrence history.
- Daily plans.
- Inbox captures.
- Task order.
- Outbox mutations.
- Last pull cursor.
- Last observed server revisions.
- Local tombstones where needed.
- Unresolved conflicts.
- Device notification settings and scheduled-notification identifiers.
- Client-specific preferences.

The exact schema and migration mechanism belong to each client.

### 6.10 Platform storage

| Platform | Storage |
| --- | --- |
| Web | IndexedDB |
| Android and iOS | SQLite |
| Windows 10 and 11 | SQLite |
| Server inside `apps/web` | PostgreSQL |

The current web IndexedDB implementation is at database version 4. Future
features increment that implementation version through tested migrations. The
workspace-aware migration must preserve existing data without uploading it.

### 6.11 Cloud records

PostgreSQL stores:

- Account-owned tasks and notes.
- Account-owned follow-ups and occurrence history.
- Account-owned daily plans and inbox captures.
- Account-owned task-order documents.
- Server-controlled entity revisions.
- Monotonic change sequences.
- Deletion tombstones.
- Idempotent mutation receipts.
- Authenticated web-push subscriptions.
- Idempotent reminder-dispatch receipts.
- Authentication and account data required by the selected provider design.

Cloud owner identity is derived from the authenticated server session. It is
never accepted from a client request body.

### 6.12 Notification data

Device-local notification permission, operating-system schedule identifiers,
and presentation preferences remain device-specific.

Web-push subscription data is account-owned server data and includes only what
is required to deliver push messages and revoke the subscription. It is not
included in user backups.

Reminder dispatch receipts prevent avoidable duplicate server dispatch. They do
not imply that an operating system displayed the notification.

### 6.13 Derived information

The following remain derived:

- Overdue status.
- Filtered and sorted lists.
- Plain-text rich-content excerpts.
- Note reading time and word count.
- Calendar day mappings.
- Analytics aggregates.
- Plan My Day recommendation scores and explanations.
- Note backlinks.
- Synchronization status labels.
- Notification readiness based on current permission and subscription state.

Each client implements these calculations independently and validates
cross-platform behavior with documented fixtures where consistency matters.

### 6.14 Date, time, and time-zone rules

- Task due dates remain date-only values and never shift through UTC conversion.
- Follow Up occurrences use exact timestamps plus the time zone needed to
  preserve calendar recurrence.
- Calendar-anchored recurrence follows its original calendar slots.
- Completion-relative recurrence follows the completion event.
- Clients reschedule local notifications after relevant time-zone or clock
  changes.
- The API publishes canonical recurrence examples.
- Windows clients map platform time-zone identifiers to the API's canonical
  representation without changing recurrence meaning.

### 6.15 Backup format

#### Existing version 1

Version 1 contains live tasks and notes from the current web application. Every
new client continues accepting it.

#### Version 2

Version 2 contains:

- Application identifier and backup version.
- Export timestamp.
- Originating platform and application version.
- Rich-text content-format version.
- Live tasks and notes.
- Follow-ups and occurrence history.
- Daily plans.
- Pending inbox captures.
- Task-order document.
- Source-note relationship fields.

Version 2 excludes:

- Access or refresh credentials.
- Account owner identifiers.
- Push subscriptions.
- Device notification schedule identifiers.
- Outbox mutations.
- Pull cursors.
- Server revisions and sequences.
- Mutation or dispatch receipts.
- Internal tombstones.
- Internal authentication state.

Each client owns its own parser, validator, importer, and exporter.

## 7. API, synchronization, and notification delivery

### 7.1 API location

The API is part of the web application:

```text
apps/web/app/api/v1/
```

The web UI and API build and deploy together. There is no separate Next.js API
project.

Server-only code must remain outside browser bundles and may be organized under:

```text
apps/web/server/
```

### 7.2 Initial public API surface

```text
POST   /api/v1/auth/otp/request
POST   /api/v1/auth/otp/verify
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/account
DELETE /api/v1/account
POST   /api/v1/sync
POST   /api/v1/push/subscriptions
DELETE /api/v1/push/subscriptions/{id}
GET    /api/v1/capabilities
GET    /api/v1/health
GET    /api/v1/openapi.json
```

The API documentation defines:

- Request and response fields.
- Required and optional properties.
- Enum strings.
- Limits.
- Authentication behavior.
- Error codes.
- Rich-text format rules.
- Date, time, time-zone, and recurrence rules.
- Synchronization state transitions.
- Push-subscription lifecycle.
- Supported protocol versions.

The documentation is a contract, not a shared runtime package.

### 7.3 Authentication

- Authentication begins with passwordless email one-time passwords.
- The API owns all authentication endpoints exposed to clients.
- Clients never receive privileged provider credentials.
- The web client uses browser-appropriate secure session behavior.
- Mobile stores refresh credentials using platform secure storage.
- Windows protects refresh credentials with Windows DPAPI.
- Sessions support refresh rotation, logout, expiration, and revocation.
- Account deletion removes synchronized cloud data and push subscriptions
  through a deliberate authenticated flow.

### 7.4 Synchronization request

A synchronization request contains:

- Protocol version.
- Stable client or device identifier.
- Last opaque pull cursor.
- Bounded list of mutations.
- Requested pull page limit.

Each mutation contains:

- Globally unique mutation ID.
- Entity type.
- Entity ID.
- `put` or `delete` operation.
- Last server revision observed by that client.
- Entity payload for a `put`.

Entity types include the supported task, note, Follow Up, Follow Up occurrence,
daily plan, inbox capture, and task-order contracts.

### 7.5 Synchronization response

The server returns:

- Outcome for each submitted mutation.
- Accepted server revision where applicable.
- Paginated cloud changes and tombstones.
- Next opaque cursor.
- Whether additional pages remain.
- Server time for diagnostics.

Mutation outcomes include:

- `applied`.
- `duplicate`.
- `conflict`.
- `invalid`.

### 7.6 Synchronization rules

- Local writes never wait for the API.
- Server revisions, not client timestamps, control optimistic concurrency.
- Pushes are processed before pull results are calculated.
- Mutation IDs make retries idempotent.
- Server tombstones prevent stale resurrection.
- Cursor, revision, and sequence values are opaque strings.
- Private responses use `Cache-Control: no-store`.
- Request body sizes, mutation counts, and pull page sizes are bounded.
- The API performs final validation and sanitization.
- Synchronization runs after local changes, on launch, on foreground or focus,
  after reconnection, periodically while active, and on manual retry.
- Background client processing may improve latency but is not required for
  synchronization correctness.
- API version 1 remains compatible with at least the previous supported mobile
  and Windows client release.

### 7.7 Conflict policy

TaskFlow uses entity-level optimistic concurrency.

It does not use:

- Client-clock last-write-wins.
- Collaborative text merging.
- A conflict-free replicated data type.
- Automatic data destruction to force convergence.

A stale update or delete returns an explicit conflict. Clients preserve the
attempted local value and current server value until the user resolves it.

A recurring Follow Up occurrence has a stable identifier so two clients cannot
silently complete the same occurrence twice and advance the series twice.

### 7.8 Native local notification delivery

- Mobile and Windows schedule notifications from their local databases.
- Local scheduling works without an account or network connection.
- Creating, updating, snoozing, completing, skipping, or deleting a follow-up
  updates the corresponding schedule.
- Application startup reconciles database state with scheduled notifications.
- Time-zone and clock changes trigger reconciliation.
- Notification taps route to the intended local record.
- Missing communication applications are handled without marking anything done.

### 7.9 Closed-app web notification delivery

- Closed-app web reminders require an authenticated account.
- The user explicitly grants notification permission and registers a browser
  push subscription.
- A protected scheduled dispatcher identifies due synchronized Follow Up
  occurrences.
- Dispatch uses standard web push and idempotent occurrence or device keys.
- The service worker handles the notification and routes interaction into the
  correct TaskFlow view.
- Private synchronization responses are never placed in the service-worker
  cache.
- Notification payload detail follows the user's preview preference.
- Subscription expiration, permission revocation, provider rejection, and
  unsupported browsers are visible to the user.
- Opening the web app catches up with overdue items regardless of push outcome.

Web push is best effort. TaskFlow must not claim that operating-system delivery
can be guaranteed.

## 8. Technology and repository structure

### 8.1 Web and API

- Next.js 16 or the supported project version at implementation time.
- React 19.
- TypeScript strict mode.
- Tailwind CSS v4.
- IndexedDB through `idb`.
- Next.js App Router Route Handlers for `/api/v1`.
- Non-blocking anchored floating popover navigation on desktop, preserving canvas context.
- Gesture-driven, touch-friendly bottom sheet on mobile web viewports.
- Global command palette (`Cmd+K` / `Ctrl+K`) for instant tool navigation and quick actions.
- Layout memoization and optimized selector subscriptions to eliminate redundant re-renders.
- PostgreSQL for synchronized cloud data.
- Standard Web Push for account-based closed-app browser reminders.
- A durable scheduled dispatcher or queue appropriate to the selected host.
- Server-only validation, authentication, sanitization, and notification logic.
- Vitest for web logic and repository tests.
- Browser automation for offline, push, and multi-client behavior.
- Vercel remains the default web and API host unless reminder-dispatch
  requirements prove incompatible with the selected plan.

### 8.2 Mobile

- React Native for Android and iOS.
- Official Expo Router file-based routing (`app/(tabs)/...`) preserving scroll state and deep linking.
- Native stack navigation with interactive swipe-to-back on iOS and hardware back handling on Android.
- Crisp vector icons via `@expo/vector-icons` replacing all placeholder emojis.
- Platform-native aesthetics: iOS inset grouped cards (Apple Settings style More hub) and translucent Cupertino blur bars; Android Material 3 elevation and dynamic ripple feedback.
- Tactile feedback integration via `expo-haptics` for task toggles, swipes, and button presses.
- Virtualized list rendering via `FlatList` with cached layouts and item memoization.
- Expo development builds and Continuous Native Generation unless a confirmed
  native dependency requires a bare project.
- Mobile-owned SQLite schema and migrations.
- Mobile-owned navigation and UI.
- Mobile-owned API adapter and synchronization engine.
- Mobile-owned recurrence and local-notification implementation.
- Mobile-owned rich-text implementation.
- Platform share-sheet and application-shortcut integration.
- Android and iOS device-level tests.
- Google Play and Apple App Store distribution.

### 8.3 Windows

- C# and WPF on .NET 10 LTS.
- Minimum technical target: Windows build 17763.
- SQLite through `Microsoft.Data.Sqlite`.
- MVVM presentation.
- Windows-owned API client and synchronization engine.
- Windows-owned recurrence and local-notification implementation.
- Windows-owned rich-text implementation.
- Platform URI launching for supported communication applications.
- xUnit for domain, persistence, recurrence, and API behavior.
- WPF UI Automation and accessibility checks.
- Signed MSIX distribution.

### 8.4 Dependency and build isolation

- `apps/web` owns its JavaScript dependencies and lockfile.
- `apps/mobile` owns its JavaScript dependencies and lockfile.
- `apps/windows` owns its solution and NuGet lockfile.
- Root automation may run application commands but supplies no runtime library.
- Dependency hoisting across web and mobile is not required.
- CI rejects application-to-application source imports.
- CI jobs use path filters so unrelated applications are not rebuilt
  unnecessarily.

### 8.5 Behavioral compatibility fixtures

The repository may contain non-runtime contract fixtures for:

- API requests and responses.
- Backup versions.
- Rich-text examples.
- Task date handling.
- Recurrence across calendar, month, time-zone, and daylight-saving boundaries.
- Plan My Day recommendation examples.
- Notification occurrence and deduplication examples.

Each application consumes these fixtures only in its own tests and implements
the behavior independently.

### 8.6 Independent versions

Suggested release lines:

```text
web-v2.0.0       Web UI and API
mobile-v1.0.0    Android and iOS
windows-v1.0.0   WPF Windows application
```

The web UI and API share a version because they live in and deploy from the same
Next.js project.

## 9. Security and privacy

### 9.1 Local-only mode

- No account is required.
- Local content is not uploaded.
- Core workflows remain available offline.
- Mobile and Windows local Follow Up notifications do not require cloud data.
- Users retain JSON backup and restore controls.
- Clearing application data, uninstalling, or losing a device can remove data
  that has not been backed up or synchronized.

### 9.2 Synchronized mode

- Account content is transmitted over HTTPS.
- Account data is stored in PostgreSQL.
- Follow-up contact details and commitment text synchronize when the user adopts
  them into an account workspace.
- Synchronization is not end-to-end encrypted in this phase.
- The backend can validate, sanitize, persist, and schedule synchronized content.
- Privacy notices describe these distinctions accurately.

### 9.3 Notification privacy

- Notification permission is requested in context.
- Detailed lock-screen previews are disabled by default unless the user chooses
  to expose person and commitment details.
- A generic preview can say that a follow-up is due without naming the person.
- Push payloads contain only what is necessary for the selected presentation.
- Notification taps and action identifiers are validated before routing.
- TaskFlow never interprets opening an external application as proof that the
  user contacted someone.
- Device and browser settings may override TaskFlow preferences.

### 9.4 API security

- Every account-owned request is authenticated and authorized server-side.
- Account ownership is derived from the verified session.
- Client-supplied owner IDs are ignored or rejected.
- Privileged database, authentication, email, scheduling, and push credentials
  remain server-side.
- API requests have body and batch limits.
- Authentication, push registration, and expensive endpoints are rate-limited.
- Refresh sessions and push subscriptions can be rotated or revoked.
- Rich HTML is treated as untrusted and sanitized on the server.
- Communication launch targets are validated and encoded before use.
- Logs exclude note bodies, task descriptions, commitment details, contact
  addresses, one-time passwords, credentials, and push endpoint secrets.
- Private responses are not cached by the service worker or shared cache.

### 9.5 Client security

- Mobile credentials use Keychain or Keystore-backed secure storage.
- Windows refresh credentials use DPAPI for the current user.
- No platform connects directly to PostgreSQL.
- No platform receives a database administrator or service-role credential.
- Imported backups and shared capture input are treated as untrusted.
- Rich-text WebViews load bundled assets, restrict navigation, and expose only a
  narrow validated bridge.
- Email, WhatsApp, telephone, and shared URLs are encoded and launched only
  through supported URI handling.
- A launcher failure never completes or deletes the follow-up.

### 9.6 Telemetry

TaskFlow does not add behavioral analytics or advertising telemetry as part of
this expansion.

Operational server logs may record request metadata, error codes, dispatch
status, latency, and identifiers needed to diagnose synchronization or push
delivery. They do not record task, note, commitment, or contact content.

## 10. UI, UX, and accessibility

### 10.1 Shared experience goals

All clients should feel recognizably like TaskFlow while following their
platform conventions.

They do not need:

- Pixel-identical layouts.
- Shared component implementations.
- Identical navigation structures.
- Identical rich-text editor internals.
- Identical operating-system notification presentation.

They do need consistent:

- Product terminology.
- Task, note, Follow Up, plan, and inbox behavior.
- Priority and category values.
- Date, time, and recurrence interpretation.
- Synchronization states.
- Conflict choices.
- Backup compatibility.
- Privacy explanations.
- Rich-content behavior.

### 10.2 Plan My Day experience

- Available time is quick to enter and easy to change.
- Recommendations explain why they were selected.
- The capacity total remains visible.
- Users can add, remove, and reorder items before accepting.
- TaskFlow distinguishes recommendations from confirmed plans.
- No item is completed, reprioritized, or rescheduled because it entered a plan.
- Screen readers receive the recommendation reason and capacity summary.
- Color is not the only indication of urgency or fit.

### 10.3 Follow Up experience

- The main view answers who, what, when, and how to act.
- Due and overdue states remain visible without notification permission.
- Complete, skip, snooze, and reschedule are distinct actions.
- Recurrence mode is described in plain language.
- Rescheduling clearly distinguishes one occurrence from the whole series.
- Launchers are shown only when the platform can attempt the action.
- Opening a launcher does not visually imply completion.
- History is readable and does not create unnecessary noise.
- Notification status and privacy settings are understandable.

### 10.4 Fast capture experience

- The capture surface opens without navigating through the full application.
- Saving requires minimal input and no mandatory classification.
- Success is confirmed immediately from local storage.
- Pending inbox items remain easy to find.
- Processing preserves the original captured text.
- Keyboard, touch, screen-reader, and reduced-motion paths are supported.
- Unsupported shared files are rejected clearly rather than silently discarded.

### 10.5 Web

Retain the shipped Linear and Raycast-inspired design:

- Dark mode by default with light mode.
- Obsidian surfaces and violet or indigo accents.
- Responsive widescreen workspace.
- Mobile top bar and bottom navigation.
- Fixed footer and appropriate scroll clearance.
- Existing branding and developer attribution.

The web expansion adds Plan My Day, Follow Up, inbox capture, actionable notes,
synchronization status, account controls, push readiness, conflict resolution,
and local-data adoption without blocking local-only use.

Web navigation is streamlined to at most four primary destinations (Tasks,
Follow Ups, Notes, and More). Secondary workflows including Fast Capture Inbox,
Plan My Day, Calendar and Schedule, Productivity Analytics, Data Backup, and
Account Settings are accessible via an anchored floating popover on desktop,
an interactive draggable bottom sheet on mobile web viewports, and a global
Cmd+K or Ctrl+K command palette, preventing UI overcrowding while preserving
widescreen canvas context.

### 10.6 Mobile

The mobile client is built as an independent React Native application using
Expo and Expo Router with zero web DOM HTML dependencies.

- Strictly four-tab native bottom navigation:
  1. Tasks (daily backlog, status filters, task creation, and reordering).
  2. Follow Ups (commitments, recurring communications, and action launchers).
  3. Notes (rich text notes and actionable excerpting).
  4. More (iOS inset grouped cards and Apple Settings style hub accessing Inbox capture and triage, Plan My Day,
     Calendar, Analytics, Data Backup, and Account/Sync settings).
- Official Expo Router file-based routing (`app/(tabs)/...`) and native stack navigation.
- Pure React Native primitives (View, Text, Pressable, TextInput, StyleSheet,
  ScrollView, and FlatList).
- Crisp vector icons via `@expo/vector-icons` replacing placeholder emojis.
- Tactile feedback integration via `expo-haptics` on interactions and toggles.
- Platform-native aesthetics: iOS grouped cards and Cupertino blur bars; Android Material 3 elevation and ripples.
- Virtualized list rendering via `FlatList` with cached layout heights.
- Safe-area and software-keyboard handling via SafeAreaView and KeyboardAvoidingView.
- Touch targets strictly meeting or exceeding 44x44 dp with visible active states.
- Local persistence through expo-sqlite with an in-memory fallback for test execution.
- Secure credential protection via expo-secure-store.
- Local closed-app follow-up reminders scheduled through expo-notifications.
- Native communication launchers using Linking.openURL.
- VoiceOver and TalkBack labels, states, and accessibility announcements.
- Dynamic text and system scaling with reduced-motion support.
- Dark and light theme switching matching system preferences with status bar styling.

### 10.7 Windows

- Native WPF controls where practical.
- Complete keyboard navigation.
- Visible focus indicators.
- Access keys and discoverable shortcuts.
- Narrator and UI Automation names and states.
- Contrast theme support using system colors.
- High-DPI and text-scaling support.
- Non-drag alternatives for ordering.
- Text summaries for visual analytics.
- Keyboard-oriented capture and accessible Windows notifications.
- Launcher fallbacks when the intended communication application is absent.

### 10.8 Rich text

`taskflow-html-v1` defines the interoperable subset of HTML, attributes, inline
styles, URL schemes, and length limits.

Each client independently implements:

- Editing.
- Sanitization before local persistence.
- Rendering.
- Plain-text extraction.
- Accessibility behavior.

The server sanitizes again before cloud persistence and returns canonical
content.

## 11. Deployment and operations

### 11.1 Web and API

- One Next.js project under `apps/web`.
- One web deployment containing both interface and public API.
- Preserve the existing production origin during the repository move.
- Vercel remains the default host.
- API routes are exposed from the same application origin.
- Health endpoint: `/api/v1/health`.
- PostgreSQL, transactional email, scheduling, and web-push services are
  accessed only from server code.
- Required server environment variables are configured in the deployment
  environment and never exposed through `NEXT_PUBLIC_*` names unless genuinely
  public.
- Web-push signing keys and subscription endpoints are treated as sensitive
  operational data.
- A durable scheduler, queue, or protected periodic dispatcher processes due
  account Follow Ups.
- Reminder processing is idempotent and observable without logging content.
- Failed push delivery can invalidate a subscription without deleting the
  follow-up.

### 11.2 Mobile

- Android App Bundle for Google Play.
- iOS build for TestFlight and Apple App Store.
- Independent signing credentials and release numbers.
- Store updates are the default production update mechanism.
- Runtime over-the-air code updates are not added unless privacy and release
  policy are revised explicitly.
- Notification permission descriptions and platform declarations are included.
- Local schedule limits and operating-system restrictions are tested and
  documented.

### 11.3 Windows

- Self-contained WPF release where appropriate.
- Signed x64 and Arm64 MSIX packages.
- Microsoft Store is the preferred consumer distribution route.
- Direct MSIX distribution may be added after establishing signing and updates.
- Toast notification registration, activation, and package identity are tested
  on supported Windows versions.

### 11.4 Compatibility

- The API supports delayed mobile and Windows updates.
- Database migrations deploy before clients that depend on them.
- Breaking API behavior requires a new versioned route.
- Additive fields remain optional for older clients.
- The capabilities endpoint advertises supported protocol and notification
  behavior.
- Recurrence fixtures protect behavior across client versions.
- Release and rollback procedures are documented before public synchronized
  accounts and web push launch.

### 11.5 Windows support statement

- Official testing targets current Windows 11 releases.
- Official Windows 10 testing targets in-support Enterprise and IoT LTSC
  releases at build 17763 or newer.
- Unsupported consumer Windows 10 releases may work but are best effort because
  their operating-system lifecycle has ended.

## 12. Monetization

None is planned.

TaskFlow remains a personal productivity and portfolio product. Subscriptions,
advertising, paid tiers, and in-app purchases are outside current scope.

Managed database, transactional email, push, scheduling, domain, signing, and
store-account costs must still be considered before public synchronized
accounts launch.

## 13. Explicit non-goals

This phase does not include:

- Shared runtime source code among web, mobile, and Windows.
- A separate API project outside `apps/web`.
- Mandatory registration.
- Automatic upload of anonymous local content.
- Teams or shared workspaces.
- Real-time collaborative editing.
- Comments, mentions, or assignment to other users.
- Full customer relationship management.
- Shared contacts or address-book synchronization.
- Marketing campaigns or bulk communication.
- Automatic email, WhatsApp, SMS, or phone communication.
- Confirmation that an external message was sent or a call was completed.
- Guaranteed notification delivery when a browser or operating system suppresses
  it.
- General-purpose task reminder automation beyond the agreed Follow Up and Plan
  My Day workflows.
- CRDT-based rich-text collaboration.
- End-to-end encrypted cloud synchronization.
- Attachments or arbitrary file synchronization.
- Natural-language date parsing in the initial release.
- Autonomous AI scheduling or silent task reprioritization.
- Enterprise administration.
- Audit-log or compliance products.
- Direct client access to PostgreSQL or privileged provider APIs.
- Pixel-identical platform interfaces.
- Monetization.

These items may be reconsidered only through a future planning decision.

## 14. Assumptions, risks, and TODOs

### 14.1 Confirmed assumptions

- Users may have several thousand tasks, notes, captures, and follow-up history
  entries.
- Core lists, calendar calculations, planning, recurrence, and analytics remain
  practical locally at that scale.
- Internet connectivity is intermittent rather than continuously available.
- Mobile and desktop store releases may lag behind the deployed API.
- The existing public web origin can be preserved while moving source into
  `apps/web`.
- Operating systems and browsers retain final control over notification display.

### 14.2 Risks and mitigations

#### Plan recommendations feel arbitrary

A suggestion engine may reduce trust if users cannot understand why work was
selected or why something important was omitted.

Mitigation:

- Use a deterministic initial algorithm.
- Show recommendation reasons.
- Display capacity and effort assumptions.
- Let users edit every plan before accepting it.
- Never silently alter the backlog.

#### Notification delivery is not guaranteed

Permissions, battery optimization, browser limitations, operating-system
policies, expired subscriptions, and network outages may delay or suppress
notifications.

Mitigation:

- Show notification readiness.
- Test delivery when enabling it.
- Keep due and overdue follow-ups visible in the application.
- Catch up on launch.
- Reconcile native schedules.
- Avoid absolute delivery guarantees in product copy.

#### Notification and contact privacy

A person's name, contact target, or commitment may be sensitive when displayed
on a lock screen, stored in a backup, or synchronized.

Mitigation:

- Generic previews by default.
- Explicit detailed-preview control.
- Accurate synchronized-mode disclosures.
- Minimal push payloads.
- Sensitive export warning.
- Content-free operational logs.

#### Recurrence and time-zone correctness

Daylight-saving changes, month boundaries, late completion, device time-zone
changes, and concurrent devices can advance a series incorrectly.

Mitigation:

- Structured rules rather than free-form text.
- Canonical time-zone representation.
- Stable occurrence IDs.
- Shared black-box fixtures.
- Fake-clock tests.
- Explicit calendar and completion-relative semantics.

#### External launcher differences

Email, WhatsApp, and phone URI behavior differs by platform and installed
applications.

Mitigation:

- Validate and encode targets.
- Detect or handle launch failure where the platform allows.
- Keep completion manual.
- Provide copy and fallback behavior where appropriate.

#### Duplicated client logic

Independent implementations can drift in validation, dates, recurrence,
backups, planning, conflicts, and notification behavior.

Mitigation:

- Treat API documentation and behavior fixtures as authoritative.
- Publish representative examples.
- Run black-box contract tests from every client.
- Keep protocol changes additive and versioned.

#### Synchronization correctness

Retries, lost responses, long offline periods, deletions, and concurrent edits
can cause duplication or data loss.

Mitigation:

- Atomic local entity and outbox writes.
- Unique mutation IDs.
- Server mutation receipts.
- Server-controlled revisions.
- Deletion tombstones.
- Opaque cursors.
- Explicit conflict records.
- Stable Follow Up occurrence IDs.
- Deterministic multi-client failure simulations.

#### Existing browser migration

Changing IndexedDB keys or moving to workspace scopes could hide or lose current
data.

Mitigation:

- Preserve the production origin.
- Perform migration in one IndexedDB upgrade transaction.
- Copy existing content into a local-only workspace.
- Do not upload during migration.
- Keep legacy stores read-only for one release.
- Add migration recovery tests.
- Recommend a pre-upgrade export.

#### Rich-text interoperability

Web, React Native, and WPF editors may produce different markup or accessibility
behavior.

Mitigation:

- Define `taskflow-html-v1`.
- Store canonical sanitized HTML plus plain text.
- Sanitize at client and server boundaries.
- Maintain representative formatting documents.
- Provide a simplified fallback if a platform editor fails accessibility
  requirements.

#### Store release delays

An API change may reach production before updated mobile or Windows clients.

Mitigation:

- Maintain API version 1 compatibility.
- Make new fields optional.
- Expose capabilities.
- Test the previous supported release.
- Use a new API version for breaking behavior.

#### Authentication and email delivery

Passwordless access depends on reliable email delivery and abuse controls.

Mitigation:

- Select a production transactional email provider.
- Add rate limits and generic responses.
- Monitor delivery failures without logging one-time passwords.
- Provide session recovery and revocation.

#### Platform signing and distribution

Mobile and Windows releases require developer accounts, signing credentials,
privacy material, notification declarations, and store review.

Mitigation:

- Treat release readiness as explicit roadmap work.
- Keep signing secrets in protected release environments.
- Use internal testing channels before public release.

### 14.3 Deferred implementation TODOs

These do not block the product direction but must be resolved before their
dependent roadmap items:

- Select the managed PostgreSQL provider.
- Select the transactional email and authentication implementation.
- Select the web-push and durable reminder-dispatch approach.
- Confirm that the chosen hosting plan can run the required reminder cadence.
- Confirm the permanent production domain used by web and native clients.
- Confirm Apple, Google Play, and Microsoft Store developer-account access.
- Select platform-specific rich-text editors.
- Define the exact `taskflow-html-v1` allowlist.
- Define the exact recurrence grammar, limits, end conditions, daylight-saving
  behavior, and canonical time-zone mapping.
- Set default snooze options and notification repeat policy.
- Confirm detailed notification-preview defaults during feature specification.
- Define supported WhatsApp, email, and telephone URI behavior per platform.
- Choose the exact Windows fast-capture entry point and whether any tray
  behavior is justified.
- Establish server retention and account-deletion completion windows.
- Set API rate limits, synchronization batch sizes, and push dispatch limits.

## 15. Success criteria

### 15.1 Product differentiation

- A user can capture text or a supported link without completing a full form.
- A pending capture survives application termination and can later become a task,
  note, or follow-up.
- A user can state available time and receive an explained, capacity-aware daily
  suggestion.
- The user controls the final plan, and planning never silently alters backlog
  data.
- A user can create one-time and recurring follow-ups.
- Calendar-anchored and completion-relative schedules produce the documented
  next occurrence.
- A user can launch an available email, WhatsApp, or phone application without
  TaskFlow sending anything automatically.
- A user can create a task or follow-up from selected note content and return to
  the source context.

### 15.2 Notifications

- Due Follow Ups remain visible without notification permission.
- Mobile and Windows can notify a local-only user while TaskFlow is closed and
  the device is offline.
- A signed-in web user with a valid push subscription can receive a due Follow
  Up notification while the web app is closed, subject to browser and operating
  system delivery.
- Disabled, denied, unsupported, or expired notification state is visible.
- Generic lock-screen previews do not expose commitment details by default.
- Reopening TaskFlow catches up with due and overdue follow-ups.
- Completing, skipping, snoozing, rescheduling, or deleting a Follow Up updates
  future notifications.
- The same occurrence is not intentionally dispatched twice to the same device.

### 15.3 Architecture

- The repository contains `apps/web`, `apps/mobile`, and `apps/windows`.
- `apps/web` contains both the Next.js interface and `/api/v1` backend.
- There is no separate API application.
- No client imports runtime source code from another application.
- Each application builds, tests, versions, and releases independently.

### 15.4 Offline behavior

- Each client can create, read, edit, complete, reopen, reorder, search, filter,
  and delete supported data without connectivity.
- Tasks, notes, follow-ups, plans, inbox items, order, and pending mutations
  survive application termination.
- Calendar, Plan My Day, Follow Up, and analytics remain usable from local data.
- Backup export and import work without cloud synchronization.

### 15.5 Accounts and synchronization

- A user can use TaskFlow without an account indefinitely.
- Signing in does not automatically upload local-only content.
- Explicitly adopted data synchronizes across web, mobile, and Windows.
- Queued mutations synchronize after connectivity returns.
- A lost response and retry do not duplicate changes.
- A stale client cannot recreate a deleted record.
- A stale delete cannot silently remove a newer edit.
- Conflicts retain recoverable local and server versions.
- Two devices cannot silently advance the same Follow Up occurrence twice.
- Account deletion removes synchronized content and push subscriptions through
  an authenticated process.

### 15.6 Migration and interoperability

- Existing IndexedDB records remain available after web migrations.
- Version 1 backups import into all three clients.
- Version 2 backups round-trip across all three clients.
- Follow Up recurrence has equivalent documented behavior on every client.
- Rich task descriptions and notes remain safe and readable across platforms.
- Date-only task due dates do not shift through timezone conversion.
- Calendar-based Follow Ups preserve their intended local schedule.

### 15.7 Security and privacy

- All account-owned API operations enforce server-side authorization.
- No privileged database, email, scheduling, or push credential ships to a
  client.
- Imported and synchronized rich HTML is sanitized.
- Private API responses are not cached by the web service worker.
- Local-only content is not uploaded.
- Notification content follows the selected privacy setting.
- External launch targets are validated and encoded.
- TaskFlow never sends an external communication automatically.
- Privacy disclosures distinguish local-only, synchronized, and web-push modes.

### 15.8 Quality and release

- Web passes unit, IndexedDB, browser, PWA, recurrence, push, and synchronization
  tests.
- Mobile passes unit, SQLite, recurrence, notification, API, accessibility, and
  Android/iOS device tests.
- Windows passes xUnit, SQLite, recurrence, notification, API, keyboard,
  Narrator, contrast, and DPI tests.
- The API passes migration, ownership, validation, sanitization, rate-limit,
  idempotency, cursor, tombstone, conflict, push-subscription, dispatch, and
  compatibility tests.
- Signed Android, iOS, and Windows release candidates install and preserve local
  data and notification schedules across application updates.
