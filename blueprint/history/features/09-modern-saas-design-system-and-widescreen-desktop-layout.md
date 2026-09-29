# Feature: Modern SaaS design system and widescreen desktop layout

**From build-plan:** feature 9
**Build attempt:** 1
**Status:** verified
**Branch:** feature/modern-saas-design-system-and-widescreen-desktop-layout

## Goal

Elevate TaskFlow's visual appeal and layout density to a modern Dark/Light SaaS aesthetic (Linear and Raycast inspired). Replace the narrow single-column container (`max-w-2xl`) with a responsive widescreen two-column desktop workspace (`max-w-6xl`) featuring a live productivity sidebar and a unified 4-page navigation header (Tasks, Notes, Calendar, Analytics).

## Design reference

Modern SaaS productivity aesthetic:
- Deep obsidian dark mode surfaces (`#09090b`, `#121215`, `#18181b`) with crisp micro-borders (`#27272a`) and glowing indigo/violet accents (`#6366f1`, `#818cf8`).
- Clean, high-contrast light mode (`#fafafa`, `#ffffff`, `#e4e4e7`) with refined elevation shadows.
- Responsive widescreen grid (`max-w-6xl`): main stream on the left (8 cols) and productivity stats sidebar on the right (4 cols), collapsing to a single column on mobile.
- Pill-shaped segment filters, elevated cards with subtle hover lift, and custom animated checkbox styling.

## In scope

1. **Design system tokens (`app/globals.css`):**
   - Obsidian dark surfaces, elevated card tokens, glowing focus rings, refined border colors, and glassmorphic header blur.
2. **Unified 4-page header navigation (`components/app/AppHeader.tsx`):**
   - Navigation links for `/` (Tasks), `/notes` (Notes), `/calendar` (Calendar), and `/analytics` (Analytics) with active pill indicators and offline indicator.
3. **Placeholder routes for upcoming pages:**
   - Lightweight `app/calendar/page.tsx` and `app/analytics/page.tsx` with shared navigation and coming-soon overview cards, ready for Features 12 and 13.
4. **Widescreen 2-column desktop workspace (`components/tasks/TasksScreen.tsx`):**
   - Left column: Task input form, sticky filter/search controls, task list items, and empty states.
   - Right column: Dedicated desktop productivity sidebar (`components/tasks/TaskSidebar.tsx`) with today's date greeting, live completion percentage, task counter summary (total, active, completed), and quick tips.
5. **Component visual polish:**
   - `TaskItem.tsx`: Elevated card surface, smooth hover transitions, animated checkbox styling, and refined priority badges.
   - `TaskControls.tsx`: Glassmorphism sticky container, pill-style status buttons, and modern search input.
   - `TaskForm.tsx`: Elevated input container with glowing focus states and gradient accent submit button.
6. **Notes widescreen polish (`components/notes/NotesScreen.tsx`):**
   - Responsive `max-w-6xl` container with consistent card elevations and spacing.

## Out of scope

- Drag-and-drop task reordering (Feature 10).
- Curated categories and IndexedDB schema v2 migration (Feature 11).
- Interactive calendar grid and due-date event inspection (Feature 12).
- Detailed analytics metrics and distribution charts (Feature 13).
- JSON backup and restore (Feature 14).

## Build loop

- Step review mode: feature
- Checkpoint commits: disabled

## Build steps

- [x] 1. **Update design system tokens in `app/globals.css`**
   - Define modern SaaS color tokens for light and dark modes (obsidian backgrounds, surface elevations, glowing accent borders, refined priority badges, and shadows).
   - Done when: `npm run build` succeeds and theme tokens are available across the project.

- [x] 2. **Update `AppHeader` and scaffold `/calendar` and `/analytics` routes**
   - Update `components/app/AppHeader.tsx` to render all 4 navigation items with active states.
   - Create `app/calendar/page.tsx` and `app/analytics/page.tsx` with `AppHeader` and initial styled layout shells.
   - Done when: Clicking all four navigation items switches routes smoothly and shows the correct active pill state.

- [x] 3. **Refactor `TasksScreen` into a responsive 2-column workspace**
   - Expand `components/tasks/TasksScreen.tsx` to `max-w-6xl` with an 8-column primary feed and a 4-column desktop sidebar (`components/tasks/TaskSidebar.tsx`).
   - Implement `TaskSidebar.tsx` displaying today's date, completion percentage bar, and total/active/completed task counts derived from the loaded tasks.
   - Ensure the layout collapses to a single column on mobile and tablet screens.
   - Done when: The tasks page renders a balanced two-column dashboard on desktop with live stats, and collapses neatly on mobile.

- [x] 4. **Upgrade task item, form, and control components**
   - Refresh `TaskItem.tsx` with elevated cards, hover lift, custom styled checkboxes, and refined priority tags.
   - Refresh `TaskControls.tsx` with pill-shaped tabs and a glassmorphic sticky container.
   - Refresh `TaskForm.tsx` with modern inputs and glowing accent button.
   - Done when: Task CRUD operations function identically, visually match the modern SaaS aesthetic, and `npm run test` passes completely.

- [x] 5. **Apply consistent widescreen polish to `NotesScreen`**
   - Update `components/notes/NotesScreen.tsx` container width and card elevations to match the new design system.
   - Done when: Notes page displays cleanly with the new design tokens and passes build checks.

## Files / areas

- `app/globals.css`
- `components/app/AppHeader.tsx`
- `app/calendar/page.tsx` (new)
- `app/analytics/page.tsx` (new)
- `components/tasks/TasksScreen.tsx`
- `components/tasks/TaskSidebar.tsx` (new)
- `components/tasks/TaskItem.tsx`
- `components/tasks/TaskControls.tsx`
- `components/tasks/TaskForm.tsx`
- `components/notes/NotesScreen.tsx`

## Data / contracts

- No schema migrations in Feature 9.
- Tasks and notes repositories retain existing schema v1 contracts.
- Sidebar metrics are computed in-memory from loaded tasks (total, active, completed, completion percentage).

## Testing

- Unit tests: run `npm run test` to verify all 103 data layer and logic tests pass without regressions.
- Build test: run `npm run build` to verify Next.js compiles all 4 routes without type errors or broken imports.
- Visual checks: verify light and dark mode appearance, desktop two-column balance, and mobile single-column responsiveness.

## Notes for the AI

- Preserve client-side interactivity with `'use client'` on interactive components.
- Do not introduce external icon or UI libraries; use clean native SVG icons matching the existing codebase style.
- Maintain full accessibility: semantic elements, labels, aria-pressed on filter pills, keyboard navigation.
- No em dashes in code comments or UI text.

## Open questions

None.

<!-- blueprint:completion {"schemaVersion":1,"specBytes":6592,"specSha256":"6038f3a58dc8cbb98067e9c6615660191825f9959299bea92df57a77a6da1e4b","branch":"refs/heads/feature/modern-saas-design-system-and-widescreen-desktop-layout","head":"34b2405e2f09f8f4707bb651424e42f15f2e969f","baseRef":"refs/heads/main","baseCommit":"34b2405e2f09f8f4707bb651424e42f15f2e969f","sourceTree":"559083d8148c1695f017047262f811b10f8dc9a7","absentOptional":[]} -->
