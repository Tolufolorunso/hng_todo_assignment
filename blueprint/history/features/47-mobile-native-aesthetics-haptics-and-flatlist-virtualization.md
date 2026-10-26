# Feature: Mobile Native Aesthetics, Haptics, and FlatList Virtualization

**From build-plan:** feature 47
**Build attempt:** 1

## Goal

Implement platform-specific native styling (iOS inset grouped cards, Apple Settings style More hub, Cupertino navigation touches; Android Material 3 elevation and ripples), integrate tactile feedback via `expo-haptics`, and optimize `FlatList` virtualization in task, note, and follow-up lists for smooth 60/120fps scrolling.

## In scope

- Add `expo-haptics` dependency to `apps/mobile/package.json` with test mock support in `apps/mobile/src/test/haptics-mock.ts` and `vitest.config.ts`.
- Create `apps/mobile/src/services/haptics.ts` providing typed tactile feedback utilities (`light`, `medium`, `heavy`, `selection`, `success`, `warning`, `error`) with safe fallback when haptics are unavailable.
- Create `apps/mobile/src/styles/platform.ts` providing platform-adaptive style helpers (iOS inset grouped cards, hairline separators, Android Material 3 elevation, and pressable ripple configs).
- Refactor `apps/mobile/src/screens/MoreScreen.tsx` into an Apple Settings style Inset Grouped hub with categorized sections (Productivity Tools, Data & Workspace, Preferences), hairline dividers, chevron indicators, and ripple feedback.
- Update `apps/mobile/src/components/TaskItemCard.tsx` and `apps/mobile/src/components/NoteItemCard.tsx` with platform-adaptive styling, ripple feedback, haptic triggers on interaction, and `React.memo` wrapping.
- Optimize `FlatList` virtualization in `apps/mobile/src/screens/TasksScreen.tsx` and `apps/mobile/src/screens/NotesScreen.tsx` with tuned batch sizes, clipped subview pruning, and memoized item renderers.
- Migrate `apps/mobile/src/screens/FollowUpsScreen.tsx` commitment list from `ScrollView` to an optimized virtualized `FlatList` with haptic feedback on communication launchers and action buttons.
- Add comprehensive unit tests in `apps/mobile/src/services/haptics.test.ts` and `apps/mobile/src/components/Virtualization.test.ts`.

## Out of scope

- Milestone M: Native Windows Application (Features 48 through 50).
- Milestone N: Cross-Platform Hardening (Feature 51).
- Modifying SQLite schema, migrations, or database tables.
- Web or backend API modifications.

## Build loop

- Step review: feature (review after all steps are complete before /complete).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.

## Build steps

- [x] 1. **Install expo-haptics and create haptic feedback service with test mocks**
  - Add `expo-haptics` to `apps/mobile/package.json`.
  - Create test mock `apps/mobile/src/test/haptics-mock.ts` and register alias in `apps/mobile/vitest.config.ts`.
  - Create `apps/mobile/src/services/haptics.ts` exporting safe haptic feedback helpers (`light`, `medium`, `heavy`, `selection`, `success`, `warning`, `error`).
  - Add unit tests in `apps/mobile/src/services/haptics.test.ts`.
  - Done when haptic utilities execute cleanly without errors across mock and node test environments.

- [x] 2. **Implement platform-adaptive style utilities**
  - Create `apps/mobile/src/styles/platform.ts` defining platform style helpers:
    - iOS: Inset grouped card container styles, hairline borders, rounded corner radius (12-16px).
    - Android: Material 3 elevation card styles, ripple configurations (`android_ripple`).
  - Export platform detection and adaptive card/list style generators.
  - Done when platform style helpers export typed styles for iOS and Android.

- [x] 3. **Transform MoreScreen into Apple Settings style Inset Grouped hub**
  - In `apps/mobile/src/screens/MoreScreen.tsx`, organize tools into grouped sections:
    - Productivity Tools (Plan My Day, Inbox, Calendar, Analytics, Search)
    - Data & Workspace (Backup & Restore, Account & Cloud Sync)
    - Preferences (Theme toggle)
  - Apply iOS Inset Grouped container styling with hairline dividers on iOS and Material 3 elevated cards with ripple on Android.
  - Wire selection haptic feedback when pressing items and toggling theme.
  - Done when `MoreScreen` displays grouped native card sections with dividers and tactile feedback.

- [x] 4. **Update TaskItemCard and NoteItemCard with platform styling and memoization**
  - In `apps/mobile/src/components/TaskItemCard.tsx`:
    - Add platform-adaptive card styling and Android ripple.
    - Wire `hapticFeedback.medium()` on checkbox toggle and `light()` on item press.
    - Wrap component in `React.memo` to eliminate cascading re-renders during list scrolling.
  - In `apps/mobile/src/components/NoteItemCard.tsx`:
    - Add platform-adaptive card styling and Android ripple.
    - Wire `hapticFeedback.light()` on item press.
    - Wrap component in `React.memo`.
  - Done when cards render platform-native styling and avoid redundant re-renders.

- [x] 5. **Virtualize task, note, and follow-up lists with optimized FlatList**
  - In `apps/mobile/src/screens/TasksScreen.tsx`:
    - Optimize `FlatList` with `initialNumToRender={10}`, `maxToRenderPerBatch={10}`, `windowSize={5}`, `removeClippedSubviews={Platform.OS === "android"}`.
    - Stabilize `renderItem` with `useCallback`.
    - Trigger `hapticFeedback.selection()` on status and category chip selection.
  - In `apps/mobile/src/screens/NotesScreen.tsx`:
    - Optimize `FlatList` with tuned rendering parameters and memoized `renderItem`.
  - In `apps/mobile/src/screens/FollowUpsScreen.tsx`:
    - Replace `ScrollView` item loop with virtualized `FlatList`.
    - Wire haptic triggers on communication launchers, Complete, and Snooze actions.
  - Done when all three primary list screens use virtualized `FlatList` with memoized renderers and tactile feedback.

- [x] 6. **Monorepo boundary validation and full verification suite**
  - Verify zero cross-application imports between `apps/mobile`, `apps/web`, and `apps/windows`.
  - Add unit tests in `apps/mobile/src/components/Virtualization.test.ts` testing list configurations and platform styles.
  - Run `npm run verify` across the monorepo to confirm all checks, tests, and builds pass.
  - Done when `npm run verify` exits with code 0 across the monorepo.

## Files / areas

- `apps/mobile/package.json`
- `apps/mobile/vitest.config.ts`
- `apps/mobile/src/test/haptics-mock.ts`
- `apps/mobile/src/services/haptics.ts`
- `apps/mobile/src/services/haptics.test.ts`
- `apps/mobile/src/styles/platform.ts`
- `apps/mobile/src/screens/MoreScreen.tsx`
- `apps/mobile/src/components/TaskItemCard.tsx`
- `apps/mobile/src/components/NoteItemCard.tsx`
- `apps/mobile/src/screens/TasksScreen.tsx`
- `apps/mobile/src/screens/NotesScreen.tsx`
- `apps/mobile/src/screens/FollowUpsScreen.tsx`
- `apps/mobile/src/components/Virtualization.test.ts`

## Data / contracts

- Tactile Feedback Contract:
  - `light()`: for selection changes, filter chips, navigation item presses.
  - `medium()`: for task checkbox completion toggles.
  - `success()`: for completed creation and restore operations.
  - `selection()`: for tab switching and segmented control changes.
  - Safe fallback: no-op in Node, web, or devices without haptics engine.
- Styling Contract:
  - iOS: Inset grouped card containers with `borderRadius: 14`, hairline dividers (`borderBottomWidth: StyleSheet.hairlineWidth`), and subtle borders.
  - Android: Material 3 elevation with `elevation: 2`, `borderRadius: 16`, and `android_ripple: { color: "rgba(255, 255, 255, 0.12)" }`.
- Virtualization Contract:
  - Tuned batch rendering (`initialNumToRender: 10`, `maxToRenderPerBatch: 10`, `windowSize: 5`).
  - Memoized row components with `React.memo` to eliminate redundant reconciliation.

## Testing

- Unit tests in `apps/mobile/src/services/haptics.test.ts` for haptic feedback methods and safe fallback.
- Unit tests in `apps/mobile/src/components/Virtualization.test.ts` for platform style tokens, memoized card rendering, and `FlatList` configuration invariants.
- Full verification command: `npm run verify` (runs boundary check, mobile typecheck, mobile vitest suite, web lint, web vitest suite, and web production build).

## Notes for the AI

- Monorepo isolation is critical: zero imports from `apps/web` or `apps/windows` into `apps/mobile`.
- Strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, or responses.
- Ensure all haptic calls are wrapped in try/catch or safe checks so that platform differences never crash the app.
- Strict TypeScript: no `any` types; prefer precise types or `unknown`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8508,"specSha256":"522af89dcb557822f9911a1cb7e6302ba34ca43914855e13126d1053d2097d78","branch":"refs/heads/feature/mobile-native-aesthetics-haptics-and-flatlist-virtualization","head":"527dcc94820335a44225098ee4c42c9925d6f3c7","baseRef":"refs/heads/main","baseCommit":"527dcc94820335a44225098ee4c42c9925d6f3c7","sourceTree":"2994003f6120dd04a3057527e7a0a8dae7a7707e","absentOptional":[]} -->
