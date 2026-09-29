# Feature: Theme toggle: dark mode default with light mode option

**From build-plan:** feature 15
**Build attempt:** 1
**Branch:** feature/theme-toggle-dark-mode-default-with-light-mode-option
**Status:** verified

## Goal

Provide a robust theme toggle between obsidian dark mode and crisp light mode,
defaulting to dark mode for all visitors, persisted in localStorage, with an
inline script preventing theme flash, and a toggle button placed beside the Data
button in the application header.

## In scope

- Dark mode as the default theme on first load across all pages.
- Light mode support when toggled by the user.
- Theme state persistence in `localStorage` under key `'taskflow_theme'`.
- Synchronous inline head script in `app/layout.tsx` to prevent theme flash
  before React hydrates.
- `app/globals.css` restructuring: `:root`, `html[data-theme="dark"]`, and
  `html.dark` carry the dark mode tokens by default; `html[data-theme="light"]`
  and `html.light` carry the light mode tokens.
- `lib/theme.ts`: pure functions and client helpers to read, write, and toggle
  the active theme with fallback to `'dark'`.
- `lib/theme.test.ts`: unit tests for theme resolution, default fallback, and
  toggling logic.
- `components/app/ThemeToggle.tsx`: accessible toggle button rendering sun/moon
  icons with hover and active animations, placed beside the Data button in
  `components/app/AppHeader.tsx`.

## Out of scope

- System preference auto-switching overriding explicit user choice.
- Multiple custom theme accents beyond the established indigo/violet palette.
- Theme settings on pages outside the App Router layout.

## Build loop

- Step review: `feature` (review after all steps complete).
- Checkpoint commits: `disabled`.

## Build steps

- [x] 1. **Theme helpers and unit tests** - create `lib/theme.ts` exporting
  `Theme` type, `THEME_STORAGE_KEY`, `getSavedTheme`, `applyTheme`, and
  `toggleTheme`, with comprehensive unit tests in `lib/theme.test.ts`.
  Done when: `npm run test` runs and passes with new tests validating dark default
  fallback, storage read/write, and toggle transitions.
- [x] 2. **Global CSS theme tokens and layout anti-flash script** - update
  `app/globals.css` so `:root` and `html[data-theme="dark"]` define dark mode by
  default and `html[data-theme="light"]` defines light mode. Add an inline
  script in `app/layout.tsx` before body hydration and `suppressHydrationWarning`
  on `<html>`.
  Done when: inspecting CSS rules confirms dark tokens apply under `:root` and
  `.dark`, light tokens under `.light`, and Next.js builds without hydration
  warnings.
- [x] 3. **ThemeToggle component and header placement** - build
  `components/app/ThemeToggle.tsx` with sun and moon icons, accessible `aria-label`,
  and smooth interaction, and embed it beside the Data button in
  `components/app/AppHeader.tsx`.
  Done when: the theme toggle renders in the header beside Data across all routes,
  clicking toggles theme instantaneously, and state persists across reloads.
- [x] 4. **Verification and build gate** - run the full test suite, linter, and
  production build.
  Done when: `npm run test`, `npm run lint`, and `npm run build` all exit 0.

## Files / areas

- `lib/theme.ts` (new)
- `lib/theme.test.ts` (new)
- `app/globals.css`
- `app/layout.tsx`
- `components/app/ThemeToggle.tsx` (new)
- `components/app/AppHeader.tsx`

## Data / contracts

- `Theme`: `"dark" | "light"`
- Storage key: `taskflow_theme`
- DOM attributes: `data-theme="dark"` / `data-theme="light"` and class `.dark` /
  `.light` on `document.documentElement`
- Default theme: `"dark"` when localStorage is empty or unset

## Testing

- Unit tests in `lib/theme.test.ts` verifying:
  - Returns `'dark'` when localStorage is empty.
  - Returns `'light'` when localStorage contains `'light'`.
  - Normalizes invalid localStorage entries to `'dark'`.
  - Toggling `'dark'` yields `'light'`, and toggling `'light'` yields `'dark'`.
  - DOM class and attribute updates apply cleanly.
- Full verification via `npm run test`, `npm run lint`, and `npm run build`.

## Notes for the AI

- Preserve existing color token variable names in `app/globals.css` (`--bg`,
  `--surface`, `--surface-muted`, `--surface-elevated`, `--border`, etc.) so
  all existing components continue working without class changes.
- Ensure no em dashes (`—`) are used in code, comments, or documentation.
- Maintain strict typing with zero `any`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4442,"specSha256":"0973dc1030c3edd1d1656db347d9954c687e1c3ea7332367607c09c84cb6d004","branch":"refs/heads/feature/theme-toggle-dark-mode-default-with-light-mode-option","head":"f896e1f868564f163774b1498429690571d6f32a","baseRef":"refs/heads/main","baseCommit":"f896e1f868564f163774b1498429690571d6f32a","sourceTree":"0c4438846034166c15369ae019e9a946a94cbac4","absentOptional":[]} -->
