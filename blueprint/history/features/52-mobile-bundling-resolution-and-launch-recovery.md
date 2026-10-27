# Feature: Mobile Bundling Resolution and Launch Recovery

**From build-plan:** feature 52
**Build attempt:** 1
**Status:** verified
**Branch:** feature/mobile-bundling-resolution-and-launch-recovery

## Goal

Resolve the Metro bundler import resolution failure on Android and iOS in `apps/mobile`, update `tsconfig.json` to use standard bundler module resolution, eliminate explicit `.js` import extensions across all Expo Router route and screen files, and verify that the mobile application bundles cleanly and launches without exceptions into the 4-tab native navigation stack.

## In scope

- Update `apps/mobile/tsconfig.json` compiler options to `"module": "ESNext"` and `"moduleResolution": "bundler"` to align with standard Expo and React Native bundler conventions while preserving TypeScript strict mode and path aliases.
- Configure `apps/mobile/metro.config.js` using `getDefaultConfig(__dirname)` from `expo/metro-config` to ensure canonical React Native and Expo asset and module resolution.
- Strip explicit `.js` import extensions across all route files under `apps/mobile/app/`:
  - `apps/mobile/app/_layout.tsx`
  - `apps/mobile/app/(tabs)/_layout.tsx`
  - `apps/mobile/app/(tabs)/tasks.tsx`
  - `apps/mobile/app/(tabs)/followups.tsx`
  - `apps/mobile/app/(tabs)/notes.tsx`
  - `apps/mobile/app/(tabs)/more.tsx`
  - `apps/mobile/app/task-edit.tsx`
  - `apps/mobile/app/note-edit.tsx`
  - `apps/mobile/app/search.tsx`
  - `apps/mobile/app/plan.tsx`
  - `apps/mobile/app/inbox.tsx`
  - `apps/mobile/app/calendar.tsx`
  - `apps/mobile/app/backup.tsx`
  - `apps/mobile/app/analytics.tsx`
  - `apps/mobile/app/account.tsx`
- Normalize explicit `.js` import extensions across `apps/mobile/src/` to ensure consistency and prevent bundler resolution confusion.
- Verify that `npm --prefix apps/mobile run typecheck` passes with zero errors.
- Verify that `npm --prefix apps/mobile run test` (all 24 test suites) passes.
- Verify that the Expo Metro bundler runs and bundles the app entry point without resolution errors.
- Run `npm run check:boundaries` and `npm run verify` to ensure monorepo integrity.

## Out of scope

- Modifying Web or Windows application code (handled in Features 53 and 54).
- Adding new screens or altering navigation route structure in Expo Router.
- Upgrading Expo SDK or React Native major versions.

## Build loop

- Step review: feature (review after all steps are complete before /complete).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.
- Branch: `feature/mobile-bundling-resolution-and-launch-recovery`.

## Build steps

- [x] 1. **Align mobile TypeScript configuration and Metro configuration**
  - Update `apps/mobile/tsconfig.json` compilerOptions: set `"module": "ESNext"` and `"moduleResolution": "bundler"` conforming to `expo/tsconfig.base`.
  - Create `apps/mobile/metro.config.js` using `getDefaultConfig(__dirname)` from `expo/metro-config`.
  - Done when configuration files exist with valid syntax.

- [x] 2. **Remove explicit .js import extensions across Expo Router route files**
  - Update `apps/mobile/app/_layout.tsx` and `apps/mobile/app/(tabs)/_layout.tsx` removing `.js` extensions from theme and AppContext imports.
  - Update all modal and screen routes (`task-edit.tsx`, `note-edit.tsx`, `search.tsx`, `plan.tsx`, `inbox.tsx`, `calendar.tsx`, `backup.tsx`, `analytics.tsx`, `account.tsx`, `(tabs)/tasks.tsx`, `(tabs)/notes.tsx`, `(tabs)/more.tsx`, `(tabs)/followups.tsx`) removing `.js` extensions.
  - Done when all route files under `apps/mobile/app/` use standard extensionless imports.

- [x] 3. **Normalize import extensions in mobile source modules and verify TypeScript typecheck**
  - Normalize any remaining `.js` import extensions in `apps/mobile/src/` (screens, components, storage, services, types).
  - Run `npm --prefix apps/mobile run typecheck` to verify zero TypeScript errors.
  - Done when mobile typecheck passes with exit code 0.

- [x] 4. **Run mobile unit test suite and verify Metro entry point bundling**
  - Run `npm --prefix apps/mobile run test` verifying all 24 unit test suites (130+ tests) pass cleanly.
  - Verify Metro bundler resolution by bundling the Expo entry point or running bundler check without resolution errors.
  - Done when all unit tests pass and bundling errors are resolved.

- [x] 5. **Run monorepo boundary check and full verify suite**
  - Run `npm run check:boundaries` verifying zero cross-application imports.
  - Run `npm run verify` across the monorepo verifying mobile, web, and windows test suites and builds pass.
  - Done when `npm run verify` exits with code 0.

## Files / areas

- `apps/mobile/tsconfig.json`
- `apps/mobile/metro.config.js`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/tasks.tsx`
- `apps/mobile/app/(tabs)/followups.tsx`
- `apps/mobile/app/(tabs)/notes.tsx`
- `apps/mobile/app/(tabs)/more.tsx`
- `apps/mobile/app/task-edit.tsx`
- `apps/mobile/app/note-edit.tsx`
- `apps/mobile/app/search.tsx`
- `apps/mobile/app/plan.tsx`
- `apps/mobile/app/inbox.tsx`
- `apps/mobile/app/calendar.tsx`
- `apps/mobile/app/backup.tsx`
- `apps/mobile/app/analytics.tsx`
- `apps/mobile/app/account.tsx`
- `apps/mobile/src/`

## Data / contracts

- Expo Router Module Resolution:
  - Relative module imports resolve via Metro file extension search: `.tsx`, `.ts`, `.jsx`, `.js`, `.json`.
  - Expo and React Native bundling resolves TypeScript and JSX without requiring transpiled `.js` specifiers.

## Testing

- Typecheck: `npm --prefix apps/mobile run typecheck`.
- Unit tests: `npm --prefix apps/mobile run test` (all 24 test suites).
- Monorepo gate: `npm run check:boundaries` and `npm run verify`.

## Notes for the AI

- Monorepo boundary isolation is mandatory: no application may import source code from another application.
- Strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, or docs.
- Preserve existing component props and screen logic exactly while normalizing module imports.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6054,"specSha256":"91c6a6f13bb5265c75043e39d0f5b938e9eb4ea7c95c5d217055716eec803b7c","branch":"refs/heads/feature/mobile-bundling-resolution-and-launch-recovery","head":"aa7c52872a42ef86469c77be9cbeaee807e1d2f5","baseRef":"refs/heads/main","baseCommit":"aa7c52872a42ef86469c77be9cbeaee807e1d2f5","sourceTree":"cd95d2449dcb18353dbe5b1c859f190cede05483","absentOptional":[]} -->
