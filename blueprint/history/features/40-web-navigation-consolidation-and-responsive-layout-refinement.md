# Feature: Web navigation consolidation and responsive layout refinement

**From build-plan:** feature 40
**Build attempt:** 1
**Branch:** feature/web-navigation-consolidation-and-responsive-layout-refinement
**Status:** verified

## Goal

Consolidate the web application's navigation from an overcrowded 7-item layout into an ergonomic, uncluttered four-destination model (Tasks, Follow Ups, Notes, and More), ensuring responsive layouts scale cleanly across mobile viewports (360px and up), tablets, and widescreen desktop workspaces.

## In scope

- Four-destination primary navigation model across both desktop and mobile:
  - Tasks (`/`): active and completed task backlog.
  - Follow Ups (`/followups`): people commitments, recurring communications, and due follow-up badge.
  - Notes (`/notes`): rich text notes, meeting documents, and actionable excerpts.
  - More: an accessible slide-over drawer and modal housing secondary productivity workflows.
- Responsive "More" drawer component (`apps/web/components/app/MoreDrawer.tsx`):
  - Secondary navigation destinations: Fast Capture Inbox (`/inbox`, with pending badge), Plan My Day (`/plan`), Calendar & Schedule (`/calendar`), and Productivity Analytics (`/analytics`).
  - Action triggers: Quick Capture (Alt+C), Data Backup and Restore (`BackupModal`), Account & Cloud Sync (`AccountModal`), Theme Toggle, and About Developer (`AboutDeveloperModal`).
  - Keyboard and accessibility support: Escape key dismissal, backdrop click to close, visible focus rings, and proper ARIA attributes (`aria-expanded`, `aria-controls`, `role="dialog"`).
- Mobile bottom navigation refactor (`apps/web/components/app/MobileNavBar.tsx`):
  - Reduce items from 7 cramped tabs to exactly 4: Tasks, Follow Ups, Notes, and More.
  - Generous touch targets strictly meeting or exceeding 44x44 dp with clear typography and touch feedback.
  - Dynamic badges on Follow Ups (due count) and More (pending inbox captures or due items).
- Desktop header refactor (`apps/web/components/app/AppHeader.tsx`):
  - Streamline primary tab bar to the four destinations, eliminating horizontal wrapping on medium screens.
  - Refined utility area with Quick Capture button, Theme Toggle, Data Backup, and Account profile / sync indicator.
  - Clean responsive collapse preventing text and icon collisions on viewports between 640px and 1024px.
- Navigation helper module and unit tests (`apps/web/lib/navigation.ts`, `apps/web/lib/navigation.test.ts`):
  - Shared destination definitions, badge calculation, active state resolution, and drawer item definitions.
  - Unit tests verifying active item matching, badge derivation, and drawer item configurations.
- Monorepo verification:
  - Zero cross-application boundary violations.
  - All unit tests passing in `apps/web` and `apps/mobile`.
  - Next.js production build succeeds with clean linting.

## Out of scope

- React Native mobile native code (`apps/mobile`), which will be re-scaffolded with Expo in Feature 41.
- Native Windows application code (`apps/windows`).
- Changing backend API endpoints or PostgreSQL database schemas.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Navigation helper module and unit tests.
  - Implement `apps/web/lib/navigation.ts` defining primary navigation items (Tasks, Follow Ups, Notes, More), secondary drawer items (Inbox, Plan, Calendar, Analytics), and active state resolution.
  - Implement unit tests in `apps/web/lib/navigation.test.ts` covering route matching, badge aggregation, and item structure.
  - Done when: unit tests in `apps/web/lib/navigation.test.ts` pass with 100% assertions satisfied.

- [x] 2. More drawer component and mobile navigation bar refactor.
  - Implement `apps/web/components/app/MoreDrawer.tsx` as an accessible slide-over drawer with backdrop blur, keyboard dismissal, and direct navigation links.
  - Refactor `apps/web/components/app/MobileNavBar.tsx` to render strictly four tabs (Tasks, Follow Ups, Notes, More) with accessible touch targets (min 44x44 dp) and dynamic notification badges.
  - Done when: MobileNavBar renders four tabs without layout collisions on narrow viewports, and tapping More opens the accessible drawer.

- [x] 3. Desktop header consolidation, responsive layout polish, and full verification.
  - Refactor `apps/web/components/app/AppHeader.tsx` to use the 4-destination navigation and integrate the More drawer trigger.
  - Polish layout spacing across page templates to ensure appropriate top and bottom scroll clearance.
  - Run `npm run verify` ensuring boundary checks pass, all tests pass, and web production build succeeds.
  - Done when: `npm run verify` exits with code 0 across the monorepo.

## Files / areas

- `apps/web/lib/navigation.ts`: navigation item definitions, badge derivation, and active route logic.
- `apps/web/lib/navigation.test.ts`: navigation unit tests.
- `apps/web/components/app/MoreDrawer.tsx`: slide-over secondary navigation and tools drawer.
- `apps/web/components/app/MobileNavBar.tsx`: refactored 4-tab mobile bottom bar.
- `apps/web/components/app/AppHeader.tsx`: refactored consolidated desktop and responsive header.
- `apps/web/components/app/AppFooter.tsx`: footer layout and scroll clearance confirmation.

## Data / contracts

- Navigation Item Model:
  ```ts
  export interface NavDestination {
    key: "tasks" | "followups" | "notes" | "more";
    label: string;
    href?: string;
    icon: React.ReactNode;
    badgeCount?: number;
    badgeColor?: string;
  }

  export interface MoreDrawerItem {
    key: "inbox" | "plan" | "calendar" | "analytics" | "backup" | "account" | "about";
    label: string;
    description: string;
    href?: string;
    icon: React.ReactNode;
    action?: "backup" | "account" | "capture" | "about";
    badgeCount?: number;
  }
  ```

## Testing

- Unit tests in `apps/web/lib/navigation.test.ts` for primary item resolution, badge calculations, and drawer item structures.
- Full monorepo verification via `npm run verify` (boundary check, mobile typecheck & test, web lint, test, and build).

## Notes for the AI

- Maintain zero em dashes, en dashes, or ellipsis characters across all files, code, comments, and specs.
- Do not import code from `apps/mobile` or `apps/windows`. Web code must remain strictly self-contained.
- Ensure all interactive touch targets meet or exceed 44x44 dp on mobile viewports.
- The More drawer must trap or manage focus properly and dismiss cleanly on Escape or backdrop click.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6733,"specSha256":"7cedcf29fe51a2187381c75687b70fa008276dcf034f024eeb159499ce656f8f","branch":"refs/heads/feature/web-navigation-consolidation-and-responsive-layout-refinement","head":"4284bbaacf1f7e515e3ad1bc0ee92cef8d6c01f6","baseRef":"refs/heads/main","baseCommit":"4284bbaacf1f7e515e3ad1bc0ee92cef8d6c01f6","sourceTree":"de662df671c71dd217cfd51d89e2305396c03e4d","absentOptional":[]} -->
