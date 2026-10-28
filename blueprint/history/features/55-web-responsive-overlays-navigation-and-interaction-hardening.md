# Feature: Web Responsive Overlays, Navigation, and Interaction Hardening

**From build-plan:** feature 55
**Build attempt:** 1
**Status:** verified
**Branch:** feature/web-responsive-overlays-navigation-and-interaction-hardening

## Goal

Harden Next.js web client responsive overlays, navigation, and accessible interactions. Relocate global dialogs, bottom sheets, and popovers from within the sticky header into a dedicated body-level portal host to eliminate Chromium containing-block clipping caused by header backdrop filters. Standardize viewport centering, short-screen scroll containment, focus trapping, and dismissal across all modals. Prevent horizontal header overflow on narrow screens, repair More navigation, the advertised G M shortcut, and Command Palette theme switching, add reactive navigation badge updates, inbox deletion confirmation and undo, valid Plan My Day progress ARIA attributes, accessible touch/keyboard task reordering alternatives, and comprehensive regression coverage.

## In scope

- Body-level overlay portal host:
  - Create a lightweight React portal wrapper mounting global overlays directly to `document.body` (outside the sticky `<header>`).
  - Move `AccountModal`, `FastCaptureModal`, `BackupModal`, `AboutDeveloperModal`, `CommandPalette`, `DataAdoptionModal`, and `MobileBottomSheet` into the portal host.
  - Eliminate containing-block clipping and positioning distortions caused by header `backdrop-blur` in Chromium browsers.
- Dialog viewport centering, short-screen bounds, and dismissal:
  - Center modal cards within the usable viewport (`fixed inset-0 flex items-center justify-center p-4`).
  - Bound modal card height with `max-h-[calc(100dvh-2rem)]` and provide dedicated internal scrolling (`overflow-y-auto`) so modal headers, close buttons, and confirmation action footers remain reachable on short viewports.
  - Standardize Escape key dismissal, backdrop click dismissal (without closing when dragging or clicking inside modal cards), and visible close button dismissal.
  - Implement focus containment, initial focus to first interactive element, and focus restoration to the trigger element upon modal closure.
  - Standardize body scroll locking (`overflow: hidden` on `document.body` while modal is active, cleanly restored on unmount).
- Global keyboard shortcut protection and navigation repair:
  - In `useGlobalShortcuts`, suppress global keyboard shortcuts (such as `Cmd+K`, `Alt+C`, and `G` sequence navigation) while any modal dialog or overlay is open.
  - Add support for the `G M` key sequence to toggle the More navigation menu (desktop More popover or mobile bottom sheet).
  - In `CommandPalette.tsx`, fix the "theme" action to invoke `setStoredTheme` and `toggleTheme` from `@/lib/theme`, dispatching `THEME_CHANGE_EVENT` so `ThemeToggle` synchronizes immediately.
- Responsive header and mobile bottom sheet anchoring:
  - Constrain `AppHeader` flex items and responsive paddings to guarantee zero horizontal scrollbar overflow at 320px, 360px, 390px, and 768px screen widths.
  - Anchor `MobileBottomSheet` to the bottom of the viewport (`fixed inset-x-0 bottom-0 z-50`) with smooth transition and safe-area padding (`pb-safe`).
- Reactive navigation badges and action safety:
  - Ensure due follow-up and inbox capture count badges update reactively in navigation headers when mutations occur across tabs or views.
  - In `InboxScreen.tsx`, provide explicit confirmation or undo feedback for permanent capture deletion, and surface visible error banners on failed persistence operations.
  - In `PlanScreen.tsx`, provide visible error feedback on save failures, and correct progress bar ARIA attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and percentage clamping when capacity is exceeded).
- Accessible task ordering and analytics visual tokens:
  - In `TasksScreen.tsx` / `TaskItem.tsx`, provide accessible keyboard and touch buttons ("Move Up", "Move Down") when custom ordering is active, complementing HTML5 drag-and-drop.
  - In `AnalyticsScreen.tsx`, apply dedicated visual styling for medium-priority metrics matching existing low and high priority tokens.
- Testing and verification:
  - Unit tests for shortcut sequences, modal portal mounting, ARIA progress values, and theme toggling.
  - Component and regression tests verifying modal dismissal, short-screen scroll reachability, focus containment, mobile bottom sheet visibility, and header overflow resistance.

## Out of scope

- Changes to mobile React Native (`apps/mobile`) or Windows WPF (`apps/windows`) applications.
- Changes to database migrations, schema definitions, or API v1 route contracts.
- Account adoption and workspace isolation logic (handled in Feature 56).
- Introducing heavy third-party UI component libraries (e.g., Radix UI, Headless UI); maintain lightweight, repository-native React implementations.

## Build loop

- Step review: feature (present final review packet after all steps pass).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.
- Branch: `feature/web-responsive-overlays-navigation-and-interaction-hardening`.

## Build steps

- [x] 1. **Body-Level Overlay Portal Host:**
   - Create `apps/web/components/app/OverlayHost.tsx` or a reusable client portal component mounting children to `document.body`.
   - Update `apps/web/components/app/AppHeader.tsx` to render all global dialogs and sheets (`AccountModal`, `FastCaptureModal`, `BackupModal`, `AboutDeveloperModal`, `CommandPalette`, `DataAdoptionModal`, `MobileBottomSheet`) through the portal host outside `<header>`.
   - Done when: Inspecting the DOM confirms modal overlays mount directly under `<body>` rather than inside `<header>`, eliminating containing-block containment.

- [x] 2. **Dialog Viewport Centering, Short-Height Bounds, and Focus Management:**
   - Standardize dialog layout across `AccountModal`, `FastCaptureModal`, `BackupModal`, `AboutDeveloperModal`, and `CommandPalette`: centered within viewport, bounded by `max-h-[calc(100dvh-2rem)]`, with scrollable inner containers.
   - Standardize Escape key, backdrop click, and close button dismissal.
   - Implement focus containment, initial focus, focus restoration, and clean body scroll lock cleanup.
   - Done when: All modals center cleanly, scroll internally without clipping controls on 480px short viewports, and trap and restore focus reliably.

- [x] 3. **Global Shortcut Protection, G M Navigation, and Command Palette Theme Repair:**
   - In `apps/web/hooks/useGlobalShortcuts.ts`, suppress global shortcut actions when any modal or overlay is active.
   - Add `m` to `DESTINATION_MAP` or handle `G M` in shortcut processing to toggle More navigation.
   - In `apps/web/components/app/CommandPalette.tsx`, update the theme action to call `setStoredTheme` and `toggleTheme` from `@/lib/theme`.
   - Done when: `G M` opens More navigation, shortcuts are disabled while modals are open, and Command Palette theme changes sync reactively with `ThemeToggle`.

- [x] 4. **Responsive Header Layout and Mobile Bottom Sheet Anchoring:**
   - In `apps/web/components/app/AppHeader.tsx`, adjust flex wrapping, utility spacing, and responsive padding to prevent horizontal document overflow at 320px, 360px, 390px, and 768px widths.
   - In `apps/web/components/app/MobileBottomSheet.tsx`, anchor the bottom sheet firmly to the viewport bottom (`bottom-0`) with safe-area padding and clean slide-up animation.
   - Done when: Header causes zero horizontal overflow on narrow viewports, and mobile bottom sheet docks cleanly to the viewport bottom.

- [x] 5. **Reactive Badges, Inbox Delete Confirmation/Undo, and Plan My Day ARIA:**
   - In `AppHeader.tsx`, ensure badge counts for inbox items and due follow-ups update reactively on mutation events.
   - In `apps/web/components/inbox/InboxScreen.tsx`, add confirmation or undo for permanent capture deletion, and display visible error messages on persistence failures.
   - In `apps/web/components/plan/PlanScreen.tsx`, ensure valid numeric ARIA attributes on capacity progress bars (`aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`) and surface visible errors on failed plan saves.
   - Done when: Badges update reactively, inbox deletion supports confirmation or undo, and Plan My Day progress bars use strictly valid ARIA values.

- [x] 6. **Accessible Task Ordering Controls and Analytics Medium Priority Styling:**
   - In `apps/web/components/tasks/TasksScreen.tsx` and `TaskItem.tsx`, add accessible Move Up and Move Down buttons when custom task ordering is active.
   - In `apps/web/components/analytics/AnalyticsScreen.tsx`, add explicit visual styling for medium priority items using amber tokens (`text-amber-500 bg-amber-500/10 border-amber-500/30`).
   - Done when: Tasks can be reordered via accessible buttons without drag-and-drop, and medium-priority analytics metrics render with dedicated amber visual tokens.

- [x] 7. **Tests, Regression Coverage, and Quality Gate:**
   - Add unit tests for shortcuts in `apps/web/lib/shortcuts.test.ts`, plan ARIA progress values in `apps/web/lib/plan-engine.test.ts`, and theme syncing in `apps/web/lib/theme.test.ts`.
   - Add component/regression tests covering modal portal mounting, viewport bounds, focus trapping, Escape dismissal, and responsive header layout.
   - Run `npm run verify` across the monorepo to confirm boundary checks, lint, unit tests, and production build pass with zero errors.
   - Done when: All tests pass, lint is clean, build succeeds, and boundaries are 100% verified.

## Files / areas

- `apps/web/components/app/AppHeader.tsx`
- `apps/web/components/app/OverlayHost.tsx`
- `apps/web/components/app/CommandPalette.tsx`
- `apps/web/components/app/MorePopover.tsx`
- `apps/web/components/app/MobileBottomSheet.tsx`
- `apps/web/components/auth/AccountModal.tsx`
- `apps/web/components/inbox/FastCaptureModal.tsx`
- `apps/web/components/inbox/InboxScreen.tsx`
- `apps/web/components/backup/BackupModal.tsx`
- `apps/web/components/app/AboutDeveloperModal.tsx`
- `apps/web/components/plan/PlanScreen.tsx`
- `apps/web/components/tasks/TasksScreen.tsx`
- `apps/web/components/tasks/TaskItem.tsx`
- `apps/web/components/analytics/AnalyticsScreen.tsx`
- `apps/web/hooks/useGlobalShortcuts.ts`
- `apps/web/lib/shortcuts.ts`
- `apps/web/lib/shortcuts.test.ts`
- `apps/web/lib/plan-engine.test.ts`

## Data / contracts

- Overlay Portal Mounting:
  - All modal backdrops and floating dialogs mount to `document.body` via a portal, eliminating parent CSS filter containment.
- Modal Viewport Clearance:
  - Modals must be bounded by `max-h-[calc(100dvh-2rem)]` with internal `overflow-y-auto` so controls remain reachable at short viewport heights (e.g. 480px).
- Shortcuts:
  - `G M`: toggles More navigation (desktop popover or mobile bottom sheet).
  - Global shortcuts are disabled while any modal dialog is open (`isAnyModalOpen`).
- Plan My Day ARIA:
  - `aria-valuenow`: numeric, clamped to 0..100.
  - `aria-valuemin`: 0.
  - `aria-valuemax`: 100.

## Testing

- Unit tests: `npm --prefix apps/web run test` (including shortcut, theme, and plan engine tests).
- Lint: `npm --prefix apps/web run lint`.
- Build: `npm --prefix apps/web run build`.
- Monorepo gate: `npm run verify`.

## Notes for the AI

- Strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, docs, or responses.
- Respect monorepo application isolation boundaries: zero cross-application imports.
- Never commit, merge, or push without separate, explicit user approval.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11598,"specSha256":"4372bf19a72a97af8ddd4b35ee080d2009fabed94e877d688f6783581feaeb9a","branch":"refs/heads/feature/web-responsive-overlays-navigation-and-interaction-hardening","head":"3b9a1d895b44f96ba05b8f109f30f9f17889ef25","baseRef":"refs/heads/main","baseCommit":"3b9a1d895b44f96ba05b8f109f30f9f17889ef25","sourceTree":"2d279779d0215c9ea670bd0e44afba7ddf6559d6","absentOptional":[]} -->

## Findings

### 55/F-03 [P2] closed - Calendar day inspector renders WYSIWYG HTML as literal text

**File:** components/calendar/DayInspector.tsx:169-177
**Found:** 2026-09-30 by /audit (scope: full; lens: quality)
**Why it matters:** Task descriptions are saved as HTML by the WYSIWYG editor (any multi-paragraph or formatted description is markup, e.g. <div>...</div>), and TaskItem.tsx:249-275 correctly detects hasHtml and renders it as rich HTML. DayInspector instead renders {task.description} as a React text child, so React escapes the markup and the calendar inspector shows raw tags like <p>Buy milk</p> instead of the formatted description. Reachable from the calendar for any task created with "Add Details".
**Suggested fix:** Render the plain-text form (stripHtmlToText(task.description), matching the excerpt pattern used elsewhere) or reuse the TaskItem hasHtml/dangerouslySetInnerHTML rendering so the inspector matches the task list.
**Resolution:** Fixed in fix/calendar-inspector-wysiwyg-html. Added regex HTML detection (/<[a-z][\s\S]*>/i.test(task.description)) and rendered formatted rich text via dangerouslySetInnerHTML with scoped typography styling (text-[11px], lists, emphasis, headings, and paragraphs) matching TaskItem, with whitespace-preserving plain-text fallback.

### 55/F-05 [P3] closed - Drag reorder with an active filter silently reshuffles hidden tasks

**File:** components/tasks/TasksScreen.tsx:238-248
**Found:** 2026-09-30 by /audit (scope: full; lens: quality)
**Why it matters:** When a search or filter is active, handleDrop builds combined = reorderedVisible + remainingTasks and persists order indices for every task, so all filtered-out (hidden) tasks are moved to the end of the manual ordering. After clearing the filter, the user's curated order of those hidden tasks has been silently rearranged. No data is lost, but the persisted order no longer reflects what the user arranged.
**Suggested fix:** When filters are active, either disable dragging, or persist only relative order among visible tasks and keep hidden tasks' positions (interleave using their previous order values).
**Resolution:** Fixed in fix/preserve-hidden-task-order. Added interleaveReorderedTasks helper in lib/tasks.ts to preserve hidden task slot positions while applying the new visible task sequence, updated TasksScreen.tsx's handleDrop to use interleaveReorderedTasks(tasks, reorderedVisible), and verified with 5 unit tests in lib/tasks.test.ts plus full regression suite passing (198 tests).

### 55/F-06 [P3] closed - Export failure shows no user feedback

**File:** components/backup/BackupModal.tsx:84
**Found:** 2026-09-30 by /audit (scope: full; lens: quality)
**Why it matters:** handleExport's catch writes to validationError, but that state is only rendered inside the Restore tab panel. If exportDatabaseBackup or triggerDownload fails while the Export tab is open, the spinner stops and the UI silently returns to idle with no error message.
**Suggested fix:** Add an exportError state rendered in the Export panel (or surface a shared error banner), and stop writing export failures into the restore-only validation state.
**Resolution:** Fixed in fix/backup-export-error-feedback. Added exportError state in BackupModal.tsx, rendered an accessible alert banner (role="alert") inside the Export tab panel, updated handleExport's catch handler to set exportError instead of validationError, and ensured clean state dismissal via handleClose. Verified via full regression suite passing (198 tests), clean lint, and production build. Closed by the 2026-10-27 full web audit after re-examining BackupModal.tsx:85-97,263-279; export failures are now shown in the active Export panel.

### 55/F-07 [P1] closed - Header-owned overlays are positioned against the header instead of the viewport

**File:** apps/web/components/app/AppHeader.tsx:118-119,381-446; apps/web/components/auth/AccountModal.tsx:212-225; apps/web/components/inbox/FastCaptureModal.tsx:102-111; apps/web/components/app/MobileBottomSheet.tsx:77-95
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality, performance, tests)
**Why it matters:** backdrop-blur-md makes the sticky header a containing block for fixed descendants in Chromium. Account, Capture, and Mobile More therefore fill the 64px header rather than the viewport. Runtime measurements confirmed offscreen close controls and an entirely offscreen mobile More sheet.
**Suggested fix:** Portal viewport overlays to document.body or mount a shared overlay host outside the sticky header. Center dialogs against the viewport and keep the mobile sheet anchored to the viewport bottom.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Created OverlayHost mounting modals directly to document.body outside sticky header, eliminating Chromium containing-block clipping. Verified via full regression suite and clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying body portal isolation.

### 55/F-08 [P1] closed - The shared header overflows narrow and medium viewports

**File:** apps/web/components/app/AppHeader.tsx:119-137,279-378
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality, performance)
**Why it matters:** The full brand and utility controls overflow at 320px, 360px, and 768px, pushing Account and Sync controls offscreen and widening the document beyond the viewport.
**Suggested fix:** Move secondary utilities into More on constrained widths, delay desktop navigation until it fits, and verify 320px, 360px, 390px, 768px, and desktop widths.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Adjusted utility button padding and flex item constraints in AppHeader.tsx, ensuring zero horizontal overflow on narrow mobile viewports down to 320px. Verified via full regression suite and clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying responsive header constraints.

### 55/F-09 [P1] accepted - Successful OTP handling skips the local-data adoption decision

**File:** apps/web/components/auth/AuthProvider.tsx:74-84; apps/web/components/auth/AccountModal.tsx:106-122; apps/web/components/app/AppHeader.tsx:75-90
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality, security)
**Why it matters:** verifyOtp updates state but immediately invokes a callback that closes over the pre-authentication user, normally null. First sign-in can therefore close without checking local data, switching workspaces, or offering adoption.
**Suggested fix:** Return the authenticated identity from verifyOtp and pass it through the post-auth flow, or react to the committed authenticated state before deciding adoption.
**Resolution:** Accepted for Feature 55 by explicit user decision on 2026-10-28; deferred to Feature 56 (Web account adoption, workspace isolation, and synchronization correctness) where account adoption and post-OTP transitions are explicitly planned and scheduled.

### 55/F-10 [P1] accepted - Main screens bypass the workspace-aware synchronized repository

**File:** apps/web/components/app/AppHeader.tsx:75-86; apps/web/components/tasks/TasksScreen.tsx:9-24; apps/web/components/notes/NotesScreen.tsx:7-14; apps/web/components/followups/FollowUpsScreen.tsx:5-15; apps/web/components/inbox/InboxScreen.tsx:8-14; apps/web/components/plan/PlanScreen.tsx:7-14
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality, security, performance)
**Why it matters:** Authentication changes a repository workspace ID, but the main screens continue using legacy whole-store helpers. Local and adopted copies may be mixed, new account writes may not enter the sync outbox, and sign-out does not reliably restore the local workspace.
**Suggested fix:** Route every web entity read and mutation through the existing workspace-aware repository and explicitly select account or local scope on session restoration, sign-in, sign-out, and account deletion.
**Resolution:** Accepted for Feature 55 by explicit user decision on 2026-10-28; deferred to Feature 56 (Web account adoption, workspace isolation, and synchronization correctness) where screen migration to the workspace-aware repository is explicitly planned and scheduled.

### 55/F-11 [P1] closed - Permanent inbox deletion has no confirmation or failure feedback

**File:** apps/web/components/inbox/InboxScreen.tsx:119-126,421-440
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** One mis-tap permanently deletes a capture, and persistence failure is swallowed.
**Suggested fix:** Add inline confirmation or undo and show an accessible error if deletion fails.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Added inline confirmation prompt (Delete permanently? Delete Cancel) and visible error alert banner in InboxScreen.tsx. Verified via full regression suite and clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying inline deletion confirmation.

### 55/F-12 [P1] closed - Several dialogs are unusable on short viewports

**File:** apps/web/components/inbox/ConvertCaptureModal.tsx:105-113,151-293; apps/web/components/auth/DataAdoptionModal.tsx:55-62; apps/web/components/followups/RescheduleModal.tsx:77-84
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** Runtime inspection at 390x320 placed required controls below the visible viewport with no scroll path.
**Suggested fix:** Apply one bounded responsive dialog layout using dynamic viewport height, a fixed header/footer where appropriate, and an internally scrollable body.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Added max-h-[calc(100dvh-2rem)] and internal overflow-y-auto across all modal dialogs. Verified via full regression suite and clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying scroll bounds on short viewports.

### 55/F-13 [P2] closed - Dialogs claim modality without consistent keyboard and focus behavior

**File:** apps/web/components/auth/AccountModal.tsx:51-80,212-225; apps/web/components/inbox/FastCaptureModal.tsx:35-58; apps/web/components/app/MobileBottomSheet.tsx:37-55
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality, tests)
**Why it matters:** Focus can remain behind dialogs, Escape and backdrop dismissal are inconsistent, focus is not reliably restored, global shortcuts can stack overlays, and scroll locking is inconsistent.
**Suggested fix:** Introduce one body-portal dialog primitive that handles initial focus, containment, Escape, backdrop dismissal, focus restoration, inert background content, and previous scroll-state restoration.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Created useModalAccessibility hook providing scroll locking, initial focus, focus trap, Escape key dismissal, backdrop dismissal, and focus restoration. Verified via useModalAccessibility.test.ts and clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying hook integration.

### 55/F-15 [P2] closed - Command Palette theme switching persists a value without applying the theme

**File:** apps/web/components/app/CommandPalette.tsx:79-88
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** The command can save light while leaving the document and rendered colors dark.
**Suggested fix:** Reuse the canonical theme helper used by ThemeToggle.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Updated CommandPalette.tsx to invoke setStoredTheme(toggleTheme(getSavedTheme())) from @/lib/theme, dispatching THEME_CHANGE_EVENT. Verified via clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying theme synchronization.

### 55/F-16 [P2] closed - The advertised G M shortcut for More does nothing

**File:** apps/web/lib/navigation.ts:64-69; apps/web/lib/shortcuts.ts:1-8,66-74
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality, tests)
**Why it matters:** The UI advertises a shortcut omitted from the shortcut destination map, and existing tests assert only its label.
**Suggested fix:** Implement a More action for both desktop and mobile openers or remove the advertised shortcut.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Added more to ShortcutDestination, mapped m in DESTINATION_MAP, and implemented onToggleMore in useGlobalShortcuts. Verified via shortcuts.test.ts and clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying shortcut action.

### 55/F-17 [P2] closed - Header inbox and follow-up badges become stale after mutations

**File:** apps/web/components/app/AppHeader.tsx:67,92-109; apps/web/components/inbox/InboxScreen.tsx:81-126; apps/web/components/followups/FollowUpsScreen.tsx:61-100
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** Counts load once and do not react to most create, convert, discard, restore, complete, snooze, skip, reschedule, or delete paths.
**Suggested fix:** Publish repository mutation events and re-query counts from shared state instead of manually incrementing one launcher path.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Subscribed AppHeader.tsx to onSyncEvent (DATA_MUTATED, SYNC_COMPLETED, WORKSPACE_CHANGED) to reactively refresh due follow-ups and unread inbox counts. Verified via clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying mutation event subscriptions.

### 55/F-18 [P2] closed - Task ordering is inaccessible on touch and keyboard

**File:** apps/web/components/tasks/TaskItem.tsx:164-224; apps/web/components/tasks/TasksScreen.tsx:178-286
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** Ordering depends on HTML drag events and a non-focusable handle, so touch and keyboard users cannot reliably reorder tasks.
**Suggested fix:** Add accessible Move Up and Move Down controls with announcements, or a keyboard and touch-capable sortable interaction.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Added accessible Move Up and Move Down buttons to TaskItem.tsx and connected reordering in TasksScreen.tsx. Verified via clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying accessible button controls.

### 55/F-19 [P2] closed - Inbox and Plan persistence failures are hidden from users

**File:** apps/web/components/inbox/InboxScreen.tsx:81-126; apps/web/components/plan/PlanScreen.tsx:47-84,146-187
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** Several failed mutations only log or do nothing, allowing users to believe data was saved or completed when it was not.
**Suggested fix:** Show screen-level accessible errors, preserve current data after failure, and offer retry where appropriate.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Added accessible alert error banners to InboxScreen.tsx and PlanScreen.tsx on persistence failures. Verified via clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying visible error banners.

### 55/F-21 [P3] closed - Medium-priority analytics bars use undefined theme utilities

**File:** apps/web/components/analytics/AnalyticsCards.tsx:21-24,291-318
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** Generated CSS contains no warning-token utilities, so medium-priority bars lose their intended color.
**Suggested fix:** Use existing amber utilities or define warning tokens in both themes.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Updated PRIORITY_COLORS.medium to use valid amber Tailwind tokens (bg-amber-500/10, bar: bg-amber-500, text: text-amber-500). Verified via clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying token styling.

### 55/F-22 [P3] closed - Over-capacity plans expose an invalid ARIA progress range

**File:** apps/web/components/plan/CapacitySummary.tsx:67-77
**Found:** 2026-10-27 by /audit (scope: apps/web full; lens: quality)
**Why it matters:** aria-valuenow can exceed aria-valuemax when a plan is over capacity.
**Suggested fix:** Clamp the numeric ARIA value and expose the overage through aria-valuetext.
**Resolution:** Fixed in feature/web-responsive-overlays-navigation-and-interaction-hardening. Clamped aria-valuenow between 0 and 100 with aria-valuemin="0" and aria-valuemax="100", exposing detailed status in aria-valuetext. Verified via plan-engine.test.ts and clean monorepo verify. Closed by /audit current on 2026-10-28 after verifying ARIA range compliance.
