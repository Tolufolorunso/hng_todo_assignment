# Feature: TaskFlow vector branding and Next.js starter asset cleanup

**From build-plan:** feature 16
**Build attempt:** 1
**Branch:** feature/taskflow-vector-branding-and-next-js-starter-asset-cleanup
**Status:** verified

## Goal

Create a distinctive, bespoke vector logo for TaskFlow, place it prominently
in front of the "TaskFlow" brand wordmark in the app header, configure it as
the browser favicon, and delete all unused default Next.js starter SVG assets
from the repository.

## In scope

- Remove 5 unused boilerplate Next.js SVGs: `public/file.svg`, `public/globe.svg`,
  `public/next.svg`, `public/vercel.svg`, and `public/window.svg`.
- Remove default boilerplate `app/favicon.ico`.
- Design a bespoke TaskFlow vector emblem featuring a dynamic checkmark-flow
  trajectory with vibrant gradient and sleek geometry.
- Create reusable component `components/brand/TaskFlowLogo.tsx` with customizable
  size and class options.
- Generate `app/icon.svg` and `public/logo.svg` from the bespoke vector logo for
  favicon and app icon purposes.
- Update `components/app/AppHeader.tsx` to display `<TaskFlowLogo />` in front of
  "TaskFlow".
- Update `app/layout.tsx` metadata with explicit icon definitions (`icon: "/icon.svg"`).
- Align `app/manifest.ts` theme and background colors to obsidian dark (`#09090b`).

## Out of scope

- Generating external PNG icon sets beyond the existing PWA icons.
- Major layout alterations outside header brand placement.

## Build loop

- Step review: `feature` (review after all steps complete).
- Checkpoint commits: `disabled`.

## Build steps

- [x] 1. **Asset cleanup** - delete unused starter Next.js files (`public/file.svg`,
  `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`,
  and default `app/favicon.ico`).
  Done when: the boilerplate starter SVGs and starter favicon are removed, and
  `npm run build` succeeds without missing asset errors.
- [x] 2. **TaskFlow vector logo and component** - create `components/brand/TaskFlowLogo.tsx`
  rendering the bespoke checkmark-flow emblem, and generate `app/icon.svg` and
  `public/logo.svg`.
  Done when: `components/brand/TaskFlowLogo.tsx`, `app/icon.svg`, and `public/logo.svg`
  exist with valid scalable SVG geometry.
- [x] 3. **Header and metadata integration** - integrate `<TaskFlowLogo />` into
  `components/app/AppHeader.tsx` in front of the brand wordmark, update `app/layout.tsx`
  metadata icon links, and align `app/manifest.ts` colors with obsidian dark.
  Done when: the brand logo renders in front of "TaskFlow" in the header on all
  pages, browser favicon displays the new emblem, and manifest matches dark mode.
- [x] 4. **Verification and build gate** - run test suite, linter, and production build.
  Done when: `npm run test`, `npm run lint`, and `npm run build` all exit 0.

## Files / areas

- `public/file.svg` (deleted)
- `public/globe.svg` (deleted)
- `public/next.svg` (deleted)
- `public/vercel.svg` (deleted)
- `public/window.svg` (deleted)
- `app/favicon.ico` (deleted)
- `components/brand/TaskFlowLogo.tsx` (new)
- `app/icon.svg` (new)
- `public/logo.svg` (new)
- `components/app/AppHeader.tsx`
- `app/layout.tsx`
- `app/manifest.ts`

## Data / contracts

- Brand icon route: `/icon.svg` (SVG favicon, `type="image/svg+xml"`)
- Component props: `TaskFlowLogo({ size?: number, className?: string })`

## Testing

- Full test suite via `npm run test`.
- Linter via `npm run lint`.
- Turbopack production build via `npm run build` validating asset resolution and
  favicon routing.

## Notes for the AI

- Preserve existing navigation and backup/theme buttons in `components/app/AppHeader.tsx`.
- Zero em dashes in code, comments, or documentation.
- Maintain responsive scaling and accessibility (`aria-hidden="true"` on the logo
  inside the labeled link).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3821,"specSha256":"b0b9cf6392d989cf0e8054576c74f71df2eba6cfdfe6500c7cb93b2b3b2167c4","branch":"refs/heads/feature/taskflow-vector-branding-and-next-js-starter-asset-cleanup","head":"8c4f0922e439ca9a8544857915e6cda6b19c13f9","baseRef":"refs/heads/main","baseCommit":"8c4f0922e439ca9a8544857915e6cda6b19c13f9","sourceTree":"b3efd6d7a8d6f90214a8e823255c50a3109288aa","absentOptional":[]} -->
