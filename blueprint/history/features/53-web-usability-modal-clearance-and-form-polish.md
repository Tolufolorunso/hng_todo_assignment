# Feature: Web Usability, Modal Clearance, and Form Polish

**From build-plan:** feature 53
**Build attempt:** 1
**Status:** verified
**Branch:** feature/web-usability-modal-clearance-and-form-polish

## Goal

Resolve user-reported web usability friction, eliminate initial theme flash, enrich task quick creation with priority, due date, category, and estimate controls, decouple task card clicking from completion toggles, eliminate popover transparency collisions with sticky headers, constrain desktop search bar flex stretching, ensure all modal dialogs fit within viewport height bounds with scrollable containers, and convert the desktop footer from fixed positioning into natural document flow.

## In scope

- Eliminate initial light theme flash on page load by enforcing immediate dark background styling directly on `html` and `body` in `apps/web/app/globals.css`, and removing `transition-colors duration-150` from the root body element in `apps/web/app/layout.tsx`.
- Expand Quick Add task details in `apps/web/components/tasks/TaskForm.tsx`:
  - When toggling "+ Add Details", expose Priority selection (Low, Medium, High), Due Date input (`type="date"`), Category selection, and Estimated Minutes input (`min="1" max="1440"`).
  - Pass all expanded fields into `validateTaskInput` and `createTask`.
  - Reset all expanded fields cleanly upon successful submission.
- Decouple task item card clicking from the completion checkbox in `apps/web/components/tasks/TaskItem.tsx`:
  - Provide an independent accessible label on the completion checkbox so clicking task text does not toggle completion state.
  - Make clicking on the task title, description, or card body open the edit inspection view (`setMode("edit")`).
  - Prevent card clicks inside interactive elements (checkbox, action buttons, link pills) from triggering edit mode.
- Elevate navigation popovers and constrain search input width:
  - In `apps/web/components/app/MorePopover.tsx`, raise z-index to `z-50`, set an opaque surface background (`bg-surface` or `bg-surface-elevated`), and eliminate background text bleed through sticky headers.
  - In `apps/web/components/app/MobileBottomSheet.tsx`, ensure opaque surface background and smooth sheet dismissal.
  - In `apps/web/components/tasks/TaskControls.tsx`, constrain search bar width with `max-w-md` so it does not stretch uncontrollably across the full width when flex wraps on wide screens.
- Modal viewport clearance and scroll safety:
  - In `apps/web/components/auth/AccountModal.tsx`, add `max-h-[85vh]` and `overflow-y-auto` to the modal card container so headers, close buttons, session lists, and actions remain visible and accessible on all viewport heights.
  - In `apps/web/components/inbox/FastCaptureModal.tsx`, add `max-h-[85vh]` and `overflow-y-auto` to the modal card container.
- Natural document flow footer:
  - In `apps/web/components/app/AppFooter.tsx`, remove `sm:fixed sm:bottom-0 sm:left-0 sm:right-0 sm:z-20` and let the footer participate in standard document flow (`mt-auto w-full border-t border-border bg-surface/30 py-6 px-4`).
  - Update `apps/web/app/layout.tsx` and main pages if any artificial bottom padding was applied for fixed footer clearance.
- Verify web test suite, typecheck, lint, Next.js production build, boundary check, and full verify gate (`npm run verify`).

## Out of scope

- Windows application UI changes (handled in Feature 54).
- Mobile React Native application modifications (completed in Feature 52).
- Server database schema migrations or sync protocol alterations.

## Build loop

- Step review: feature (review after all steps are complete before /complete).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.
- Branch: `feature/web-usability-modal-clearance-and-form-polish`.

## Build steps

- [x] 1. **Eliminate theme flash on initial page load**
  - In `apps/web/app/globals.css`, set explicit `#09090b` dark background directly on `html` and `body` rules.
  - In `apps/web/app/layout.tsx`, remove `transition-colors duration-150` from the `<body>` element to prevent color transitions during initial mount and hydration.
  - Done when page reloads render dark background immediately without white flash.

- [x] 2. **Expand Quick Add task form with detailed controls**
  - In `apps/web/components/tasks/TaskForm.tsx`, add state for `priority` (default "medium"), `dueDate` (default empty string), and `estimatedMinutes` (default empty string).
  - Render Priority selector, Due Date picker, Category selector, and Estimated Minutes input when `showDetails` is expanded.
  - Pass `priority`, `dueDate`, `category`, and parsed `estimatedMinutes` to `createTask`.
  - Done when new tasks created through Quick Add persist all detailed properties correctly.

- [x] 3. **Decouple task card click from completion checkbox**
  - In `apps/web/components/tasks/TaskItem.tsx`, decouple the `<label>` from wrapping the entire task title and body.
  - Provide an accessible label for the checkbox (`aria-label={`Mark "${task.title}" as complete`}`).
  - Add click handler on the task card body / title to switch into edit mode (`setMode("edit")`), while stopping click propagation on the checkbox and action buttons.
  - Done when clicking the checkbox toggles completion, and clicking the task title or body opens the edit form.

- [x] 4. **Polish navigation popover opacity, search width, and footer document flow**
  - In `apps/web/components/app/MorePopover.tsx`, set `z-50`, opaque background `bg-surface`, and remove backdrop text transparency collisions.
  - In `apps/web/components/tasks/TaskControls.tsx`, add `max-w-md` to the search input container to constrain flex width on wide desktop viewports.
  - In `apps/web/components/app/AppFooter.tsx`, unpin from fixed positioning (`sm:fixed sm:bottom-0`) to natural document flow (`mt-auto`).
  - Done when popover renders cleanly over sticky headers, search bar does not stretch uncontrollably, and footer sits at the bottom of the document flow without covering content.

- [x] 5. **Enforce bounded scrollable containers for modals**
  - In `apps/web/components/auth/AccountModal.tsx`, add `max-h-[85vh]` and `overflow-y-auto` to the modal card container.
  - In `apps/web/components/inbox/FastCaptureModal.tsx`, add `max-h-[85vh]` and `overflow-y-auto` to the modal card container.
  - Done when modals remain fully navigable with visible close buttons and action controls across small viewports.

- [x] 6. **Run web unit tests and full monorepo verification gate**
  - Run `npm --prefix apps/web run lint` to verify zero ESLint errors.
  - Run `npm --prefix apps/web run test` to verify all 37 unit test suites pass cleanly.
  - Run `npm run check:boundaries` and `npm run verify` across the monorepo.
  - Done when all tests, lint, and production builds succeed with exit code 0.

## Files / areas

- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/components/tasks/TaskForm.tsx`
- `apps/web/components/tasks/TaskItem.tsx`
- `apps/web/components/tasks/TaskControls.tsx`
- `apps/web/components/app/MorePopover.tsx`
- `apps/web/components/app/MobileBottomSheet.tsx`
- `apps/web/components/app/AppFooter.tsx`
- `apps/web/components/auth/AccountModal.tsx`
- `apps/web/components/inbox/FastCaptureModal.tsx`

## Data / contracts

- Task Creation Contract (`createTask` in `apps/web/lib/tasks.ts`):
  - Accepts `title`, `description`, `priority` ("low" | "medium" | "high"), `dueDate` (ISO date string or null), `category` ("work" | "personal" | "urgent" | "study" | "ideas" | null), and `estimatedMinutes` (number 1..1440 or null).
- Modal Viewport Boundary:
  - Modals must be bounded by `max-h-[85vh]` with `overflow-y-auto` to guarantee viewport compliance across mobile and desktop browser windows.

## Testing

- Lint: `npm --prefix apps/web run lint`
- Unit tests: `npm --prefix apps/web run test` (37 test suites, 520+ tests)
- Build: `npm --prefix apps/web run build`
- Monorepo gate: `npm run check:boundaries` and `npm run verify`

## Notes for the AI

- Monorepo boundary isolation is mandatory: no application may import source code from another application.
- Strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, or docs.
- Preserve existing keyboard shortcuts and accessibility roles on all buttons and inputs.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8367,"specSha256":"dea728d99085994ecfc2d5d133c6e08431e89b2d4ec3225ba032c5e13427fe7b","branch":"refs/heads/feature/web-usability-modal-clearance-and-form-polish","head":"e44aafc8a99a08d37702adc067adeb8bff35c754","baseRef":"refs/heads/main","baseCommit":"e44aafc8a99a08d37702adc067adeb8bff35c754","sourceTree":"62bc51343768142fe01ba5ad299756438b499b3b","absentOptional":[]} -->
