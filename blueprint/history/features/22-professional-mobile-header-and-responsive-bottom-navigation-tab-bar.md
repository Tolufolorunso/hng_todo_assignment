# Feature: Professional mobile header and responsive bottom navigation tab bar

**From build-plan:** feature 22
**Build attempt:** 1
**Branch:** feature/professional-mobile-header-and-responsive-bottom-navigation-tab-bar
**Status:** verified

## Goal

Transform the application header into a professional mobile-first experience by streamlining the top header on viewports under 640px (displaying brand logo, theme toggle, data button, and offline status without horizontal wrapping or overflow) and introducing an ergonomic, fixed bottom navigation tab bar on mobile viewports for quick switching between Tasks, Notes, Calendar, and Analytics.

## In scope

- Top header responsive refinement in `components/app/AppHeader.tsx`:
  - Hide the desktop navigation tab strip on small screens (`hidden sm:flex`) so the top bar remains clean and compact.
  - Optimize container horizontal padding (`px-4 sm:px-6`) and gap spacing for mobile viewports.
  - Keep logo, theme toggle, data backup button, and offline indicator visible and aligned without horizontal overflow.
- Mobile bottom navigation component (`components/app/MobileNavBar.tsx` or integrated into `AppHeader.tsx`):
  - Fixed at viewport bottom (`fixed bottom-0 left-0 right-0 z-30 sm:hidden`).
  - Glassmorphic surface styling (`bg-bg/90 backdrop-blur-lg border-t border-border`).
  - 4 primary navigation tabs (Tasks, Notes, Calendar, Analytics) with SVG icons, micro-labels, and active state pill styling.
  - Thumb-friendly tap targets (`min-h-[50px]`) and mobile notch / home bar clearance (`pb-[max(0.5rem,env(safe-area-inset-bottom))]`).
  - Hidden during printing (`print:hidden`).
- Mobile scroll clearance across all main view containers (`app/page.tsx`, `components/tasks/TasksScreen.tsx`, `components/notes/NotesScreen.tsx`, `components/notes/StandaloneNoteView.tsx`, `app/calendar/page.tsx`, `app/analytics/page.tsx`) adding bottom padding (`pb-24 sm:pb-10`) so bottom content and action buttons scroll above the bottom bar.

## Out of scope

- Converting the site-wide footer to a fixed desktop/mobile dock (handled in Feature 23).
- Adding new routes or changing route URLs.
- External mobile navigation or tab libraries.

## Build loop

- Step review: `feature` (continue through passing steps).
- Checkpoint commits: `disabled` (as configured in `blueprint/config.json`).
- Final completion: `/complete` creates the final work commit and archives the spec.

## Build steps

- [x] 1. **Refactor `AppHeader` for responsive viewports** - update `components/app/AppHeader.tsx` so the desktop nav tabs are hidden on mobile viewports (`hidden sm:flex`), adjust header container padding (`px-4 sm:px-6`), and ensure brand and utility actions (ThemeToggle, Data button, OfflineIndicator) align cleanly on small screens without wrapping or clipping. Done when desktop navigation remains intact on `sm:` and top bar is clean on mobile.
- [x] 2. **Build `MobileNavBar` component** - create `components/app/MobileNavBar.tsx` rendering a fixed bottom navigation bar on mobile (`sm:hidden`, `fixed bottom-0 left-0 right-0 z-30`), with 4 touch-friendly tabs (Tasks, Notes, Calendar, Analytics), SVG icons, labels, active pill indicators, and safe-area inset support, rendered via `AppHeader`. Done when mobile nav renders on viewports <640px and highlights active route.
- [x] 3. **Add mobile scroll clearance to main views** - update page layouts (`components/tasks/TasksScreen.tsx`, `components/notes/NotesScreen.tsx`, `components/notes/StandaloneNoteView.tsx`, `app/calendar/page.tsx`, `app/analytics/page.tsx`) with bottom padding (`pb-24 sm:pb-10`) so the bottom of lists and screens scroll cleanly above the mobile nav bar. Done when all pages allow scrolling above the bottom bar on mobile viewports.
- [x] 4. **Verification and quality gates** - run `npm run test`, `npm run lint`, and `npm run build` to confirm zero lint errors, zero type errors, all 171 unit tests passing, and a clean Next.js build. Done when all commands exit code 0.

## Files / areas

- `components/app/AppHeader.tsx` - responsive top header layout adjustments and integration of mobile navigation.
- `components/app/MobileNavBar.tsx` - mobile bottom navigation tab bar component.
- `components/tasks/TasksScreen.tsx` - bottom scroll clearance.
- `components/notes/NotesScreen.tsx` - bottom scroll clearance.
- `components/notes/StandaloneNoteView.tsx` - bottom scroll clearance.
- `app/calendar/page.tsx` - bottom scroll clearance.
- `app/analytics/page.tsx` - bottom scroll clearance.

## Data / contracts

- Navigation items contract preserved across desktop and mobile:
  - `tasks`: `/`
  - `notes`: `/notes`
  - `calendar`: `/calendar`
  - `analytics`: `/analytics`

## Testing

- Automated gate:
  - `npm run test` (Vitest - all 171 tests must pass)
  - `npm run lint` (ESLint - zero errors, zero warnings)
  - `npm run build` (Next.js Turbopack build - all routes compiled)

## Notes for the AI

- Maintain zero em dashes across all code, comments, and strings.
- Ensure `print:hidden` is applied to `MobileNavBar` so it does not print on paper or PDF exports.
- Use native Tailwind CSS v4 responsive classes (`hidden sm:flex`, `px-4 sm:px-6`, `pb-24 sm:pb-10`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5213,"specSha256":"c438169b9dbd8c1f8d161c99bfa6786cbe089caeb01d6afb39787d3ceae26be5","branch":"refs/heads/feature/professional-mobile-header-and-responsive-bottom-navigation-tab-bar","head":"21dd64a384184dd6d3808c8910d1669fae86c352","baseRef":"refs/heads/main","baseCommit":"21dd64a384184dd6d3808c8910d1669fae86c352","sourceTree":"10a70bae666fabb1ea6fe6f1384330d8464e1207","absentOptional":[]} -->
