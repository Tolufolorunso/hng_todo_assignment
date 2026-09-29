# Feature: Fixed bottom dock footer and page scroll clearance

**From build-plan:** feature 23
**Build attempt:** 1
**Branch:** feature/fixed-bottom-dock-footer-and-page-scroll-clearance
**Status:** verified

## Goal

Transform the site-wide footer (`AppFooter`) into a modern, pinned glassmorphic bottom dock on desktop viewports (>=640px) while maintaining seamless mobile in-flow scrolling above the mobile bottom tab bar, ensuring bottom content across all pages (tasks, notes, reader, calendar, analytics) has calibrated scroll clearance (`pb-24 sm:pb-20`) and never clips behind the dock.

## In scope

- Pinned desktop footer dock in `components/app/AppFooter.tsx`:
  - Fixed at viewport bottom on desktop screens (`sm:fixed sm:bottom-0 sm:left-0 sm:right-0 sm:z-20`).
  - Glassmorphic surface styling (`sm:border-t sm:border-border sm:bg-bg/85 sm:backdrop-blur-md`).
  - Streamlined horizontal bar layout on desktop (`sm:h-12 sm:py-2 px-6`) with brand identity, creator attribution, "About Developer" modal trigger, and social links (LinkedIn, X, GitHub) cleanly aligned.
  - Responsive mobile handling: on mobile viewports (<640px), renders in natural content flow with bottom margin (`mb-16 sm:mb-0`) so attribution and modal trigger scroll comfortably above the mobile bottom navigation tab bar.
  - Hidden during printing (`print:hidden`).
- Calibrated bottom scroll clearance across all page containers:
  - `components/tasks/TasksScreen.tsx` (`pb-24 sm:pb-20`)
  - `components/notes/NotesScreen.tsx` (`pb-24 sm:pb-20`)
  - `app/notes/page.tsx` (`pb-24 sm:pb-20` on fallback)
  - `components/notes/StandaloneNoteView.tsx` (`pb-24 sm:pb-20`)
  - `app/calendar/page.tsx` (`pb-24 sm:pb-20`)
  - `app/analytics/page.tsx` (`pb-24 sm:pb-20`)

## Out of scope

- Modifying the About Developer modal content or developer bio details.
- Adding new routes or changing navigation destinations.
- External footer or dock libraries.

## Build loop

- Step review: `feature` (continue through passing steps).
- Checkpoint commits: `disabled` (as configured in `blueprint/config.json`).
- Final completion: `/complete` creates the final work commit, merges to `main`, and archives the spec.

## Build steps

- [x] 1. **Refactor `AppFooter` to a fixed bottom dock on desktop with responsive mobile clearance** - update `components/app/AppFooter.tsx` with glassmorphism surface styling (`sm:fixed sm:bottom-0 sm:left-0 sm:right-0 sm:z-20 sm:border-t sm:border-border sm:bg-bg/85 sm:backdrop-blur-md transition-colors`), slim desktop bar layout (`sm:h-12 sm:py-2 px-6`), clean alignment of brand identity, creator attribution, About Developer button, and social links, and on mobile viewports keep in-flow rendering with bottom margin (`mb-16 sm:mb-0`) so content clears the mobile bottom tab bar without overlap. Done when footer is pinned at bottom on viewports >=640px and scrolls naturally above the mobile tab bar on viewports <640px.
- [x] 2. **Calibrate page-level bottom scroll clearance across all workspaces** - update main containers in `components/tasks/TasksScreen.tsx`, `components/notes/NotesScreen.tsx`, `app/notes/page.tsx`, `components/notes/StandaloneNoteView.tsx`, `app/calendar/page.tsx`, and `app/analytics/page.tsx` with `pb-24 sm:pb-20` so content on both mobile and desktop can scroll fully into view without being obscured by either the mobile tab bar or the desktop fixed footer dock. Done when the bottom-most list items and actions on all pages scroll above the bottom bars without clipping.
- [x] 3. **Verification and quality gates** - run `npm run test`, `npm run lint`, and `npm run build` to confirm zero lint errors, zero type errors, all 171 unit tests passing, and a clean Next.js build. Done when all commands exit code 0.

## Files / areas

- `components/app/AppFooter.tsx` - pinned desktop footer dock with glassmorphism and mobile bottom clearance.
- `components/tasks/TasksScreen.tsx` - calibrated desktop and mobile bottom padding.
- `components/notes/NotesScreen.tsx` - calibrated desktop and mobile bottom padding.
- `app/notes/page.tsx` - calibrated fallback bottom padding.
- `components/notes/StandaloneNoteView.tsx` - calibrated desktop and mobile bottom padding.
- `app/calendar/page.tsx` - calibrated desktop and mobile bottom padding.
- `app/analytics/page.tsx` - calibrated desktop and mobile bottom padding.

## Data / contracts

- Zero change to IndexedDB schema or stored data.
- Zero change to developer showcase modal contract or social URLs.
- Responsive breakpoints contract:
  - Mobile (<640px): `MobileNavBar` is fixed at `bottom-0`, `AppFooter` is in-flow with `mb-16 sm:mb-0`, page containers have `pb-24`.
  - Desktop (>=640px): `MobileNavBar` is hidden, `AppFooter` is fixed at `bottom-0`, page containers have `sm:pb-20`.

## Testing

- Automated gate:
  - `npm run test` (Vitest - all 171 tests must pass)
  - `npm run lint` (ESLint - zero errors, zero warnings)
  - `npm run build` (Next.js Turbopack build - all routes compiled)

## Notes for the AI

- Maintain zero em dashes across all code, comments, and strings.
- Ensure `print:hidden` is preserved on `AppFooter` so it does not render during paper or PDF export.
- Use native Tailwind CSS v4 responsive utilities (`sm:fixed sm:bottom-0 sm:left-0 sm:right-0 sm:z-20`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5289,"specSha256":"e97c73603bdb53c8bbd5fd4375454046df38bf5bde81cf5cd8d75ae1a91c5596","branch":"refs/heads/feature/fixed-bottom-dock-footer-and-page-scroll-clearance","head":"b78b5b93e406ae14f37db9a20d4885349f9651af","baseRef":"refs/heads/main","baseCommit":"b78b5b93e406ae14f37db9a20d4885349f9651af","sourceTree":"c4b5d3b5e741eee08ec4d982d8b4cb24c89e5f69","absentOptional":[]} -->
