# Feature: Web performance optimization and layout memoization

**From build-plan:** feature 45
**Build attempt:** 1
**Branch:** feature/web-performance-optimization-and-layout-memoization

## Goal

Eliminate redundant layout re-renders across AppHeader, AppFooter, and dialogs, and optimize task and note list rendering and selector subscriptions to guarantee instantaneous filter and search response times without UI frame drops.

## In scope

- Memoize `visibleTasks` filtering and sorting in `TasksScreen` so rapid state changes (such as drag-over indicator updates, pending mutation IDs, or form focus) do not re-sort and re-filter backlog arrays.
- Stabilize task mutation and drag-and-drop callbacks (`onToggle`, `onUpdate`, `onDelete`, `onDragStart`, `onDragOver`, `onDragLeave`, `onDragEnd`, `onDrop`) using `useCallback` in `TasksScreen`.
- Wrap `TaskItem` and `TaskControls` in `React.memo` so updating or dragging one task does not re-render unaffected task cards.
- Memoize `visibleNotes` and `selectedNote` calculations in `NotesScreen` using `useMemo`.
- Extract a memoized `NoteListItem` component in `NoteList.tsx` and cache `createExcerpt` results per note item so typing in the notes search bar does not repeatedly parse HTML across every note.
- Memoize static navigation and attribution elements in `AppHeader` and `AppFooter` with `React.memo` so opening dialogs or toggling popovers does not re-render the entire navigation header.
- Add focused unit tests verifying memoized selector behavior, excerpt computation stability, and render boundary invariants.
- Pass `npm run verify` with zero warnings or errors.

## Out of scope

- Mobile React Native FlatList virtualization (reserved for Feature 47).
- Mobile Expo Router file-based navigation (Feature 46).
- Windows WPF MVVM optimization (Feature 48).
- Database or server API changes.
- New third-party memoization libraries or state management libraries.

## Build loop

- Step review: feature (review entire feature at completion).
- Checkpoint commits: disabled.
- Verification command: `npm run verify`.

## Build steps

- [x] 1. **TasksScreen and TaskItem memoization** - wrap `visibleTasks` in `useMemo`, wrap all task item and drag event handlers in `useCallback`, and wrap `TaskItem` and `TaskControls` in `React.memo`. Done when task list re-sorts only when dependencies change, and unaffected items skip rendering during single-item mutations.
- [x] 2. **NotesScreen and NoteList memoization** - wrap `visibleNotes` and `selectedNote` in `useMemo`, extract a memoized `NoteListItem` component that computes `createExcerpt` once per item render, and wrap `NoteList` items in `React.memo`. Done when search keystrokes in notes execute with zero redundant excerpt HTML parses for unchanged items.
- [x] 3. **AppHeader and AppFooter layout memoization** - wrap `AppFooter` in `React.memo`, memoize navigation links and static brand elements in `AppHeader`, and ensure dialog mounts do not cause cascading re-renders of the top bar. Done when opening or closing modals does not trigger re-render of unchanged navigation and branding subtrees.
- [x] 4. **Performance and selector unit tests** - create `apps/web/lib/performance.test.ts` asserting selector stability, memoization invariants, and excerpt computation caching. Done when tests pass cleanly in Vitest.
- [x] 5. **Monorepo verification and review** - run boundary check, lint, tests, and production build via `npm run verify`. Done when the complete verification suite exits with code 0.

## Files / areas

- `apps/web/components/tasks/TasksScreen.tsx` - memoize visible tasks and stable callbacks.
- `apps/web/components/tasks/TaskItem.tsx` - wrap in React.memo.
- `apps/web/components/tasks/TaskControls.tsx` - wrap in React.memo.
- `apps/web/components/notes/NotesScreen.tsx` - memoize visible notes and selected note.
- `apps/web/components/notes/NoteList.tsx` - memoized NoteListItem and excerpt caching.
- `apps/web/components/app/AppHeader.tsx` - memoize navigation links and isolate modal triggers.
- `apps/web/components/app/AppFooter.tsx` - wrap in React.memo.
- `apps/web/lib/performance.test.ts` - unit tests for memoization and selector invariants.

## Data / contracts

- Pure client-side component optimization; zero schema or storage format changes.
- Preserves all props, event callbacks, drag-and-drop semantics, keyboard shortcuts, and accessibility attributes.

## Testing

- Unit tests in `apps/web/lib/performance.test.ts` for selector stability, memoization caching, and excerpt performance.
- Automated verification via `npm run verify` running boundary checks, mobile typecheck and tests, web ESLint, web Vitest suite, and Next.js production build.

## Notes for the AI

- Use strict TypeScript; no `any` types.
- Follow React 19 standards: do not set state synchronously inside effects (`react-hooks/set-state-in-effect`).
- Maintain zero cross-application imports across monorepo boundaries.
- No em dashes, en dashes, or ellipsis in any code, comments, or documentation.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5042,"specSha256":"81cb4f24d9b98c3ee1ba2c20176d79dd33a178ada1e091ff2e332d3e1c554340","branch":"refs/heads/feature/web-performance-optimization-and-layout-memoization","head":"8d06f93e6699fea0c2f4d33f887dcf263b18ee01","baseRef":"refs/heads/main","baseCommit":"8d06f93e6699fea0c2f4d33f887dcf263b18ee01","sourceTree":"b4ed70231dde87677608f6c0e9da69bcd0913869","absentOptional":[]} -->
