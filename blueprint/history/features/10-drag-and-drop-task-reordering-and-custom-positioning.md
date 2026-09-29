# Feature: Drag-and-drop task reordering and custom positioning

**From build-plan:** feature 10
**Build attempt:** 1
**Branch:** feature/drag-and-drop-task-reordering-and-custom-positioning
**Status:** verified

## Goal

Provide intuitive, fast drag-and-drop task reordering. Users can grab any task card by its drag handle and move it up or down to set a custom priority sequence. The reordered positions persist in IndexedDB so the custom order remains intact across sessions and reloads.

## Design reference

Modern SaaS task reordering (Linear style):
- Sleek 6-dot grip handle (`cursor-grab active:cursor-grabbing`) on the left of each task row, subtly visible and highlighting on hover.
- Visual drag ghost and clean drop indicator bar showing the exact insertion target.
- Smooth card transition when items swap positions.
- Accessible "Custom order" option in the sort dropdown that activates automatically when reordering.

## In scope

1. **Task model & validation extension (`types/task.ts`, `lib/validation.ts`):**
   - Add `order?: number` field to `Task`, `TaskInput`, and `TaskPatch`.
   - Validate that `order` is a finite number when provided in patches.
2. **Reordering & manual sort logic (`lib/tasks.ts`):**
   - Add `reorderTasks(orderedIds: string[]): Promise<void>` to update sequential `order` values in IndexedDB in a single transaction.
   - Add `"manual"` to `TaskSortKey` and update `sortTasks` to order by `order` ascending (falling back to creation date).
   - Ensure `createTask` assigns an appropriate default `order`.
3. **Drag handle and HTML5 drag events (`components/tasks/TaskItem.tsx`):**
   - Add a visual drag handle grip icon to `TaskItem.tsx`.
   - Attach native drag-and-drop handlers (`draggable`, `onDragStart`, `onDragOver`, `onDragEnd`, `onDrop`).
   - Add visual drop-target indicator styling.
4. **Reorder coordination (`components/tasks/TasksScreen.tsx`, `components/tasks/TaskControls.tsx`):**
   - Wire drag-and-drop reorder events in `TasksScreen.tsx`.
   - Update sort dropdown in `TaskControls.tsx` to include `manual` ("Sort: Custom").
   - Automatically switch active sort to `manual` when a drag-and-drop reorder occurs, persisting the change to IndexedDB.

## Out of scope

- Touch-screen complex multi-pointer gesture polyfills (native HTML5 drag works in modern browsers; mobile fallback preserves sort select).
- Category badges and IndexedDB schema v2 migration (Feature 11).
- Calendar scheduling view (Feature 12).
- Analytics metrics charts (Feature 13).

## Build loop

- Step review mode: feature
- Checkpoint commits: disabled

## Build steps

1. **Extend Task model and patch validation with `order`**
   - Add `order?: number` to `types/task.ts`, `TaskInput`, and `TaskPatch` in `lib/validation.ts`.
   - Update `validateTaskPatch` to validate `order` as a finite number.
   - Add unit tests in `lib/validation.test.ts`.
   - Done when: `npm run test` passes with test coverage for `order` validation.

2. **Implement `reorderTasks` and `"manual"` sorting in `lib/tasks.ts`**
   - Implement `reorderTasks(orderedIds: string[]): Promise<void>` in `lib/tasks.ts` to update `order` indices in a transaction.
   - Add `"manual"` to `TaskSortKey` and update `sortTasks` to sort by `(a.order ?? 0) - (b.order ?? 0)`.
   - Add unit tests in `lib/tasks.test.ts` verifying `sortTasks` with `"manual"` and `reorderTasks`.
   - Done when: `npm run test` passes with all tests green.

3. **Add drag handle and drag-and-drop interaction to `TaskItem.tsx`**
   - Add an accessible 6-dot grip handle to `TaskItem.tsx`.
   - Implement drag event callbacks (`onDragStart`, `onDragOver`, `onDragEnd`, `onDrop`) and visual drop indicator cues.
   - Done when: Task rows can be dragged and show visual feedback on hover and dragover.

4. **Wire drag reordering and sort control in `TasksScreen.tsx` and `TaskControls.tsx`**
   - Add "Sort: Custom" to the sort options in `TaskControls.tsx`.
   - In `TasksScreen.tsx`, handle task drop by reordering the list, saving with `reorderTasks`, and switching sort to `"manual"`.
   - Done when: Dragging and dropping tasks rearranges their order, persists after page reload, and `npm run test` and `npm run build` pass completely.

## Files / areas

- `types/task.ts`
- `lib/validation.ts`
- `lib/validation.test.ts`
- `lib/tasks.ts`
- `lib/tasks.test.ts`
- `components/tasks/TaskItem.tsx`
- `components/tasks/TaskControls.tsx`
- `components/tasks/TasksScreen.tsx`

## Data / contracts

- `Task.order?: number` represents zero-based sequential rank in the custom manual view.
- When creating a task, `order` defaults to the current maximum order + 1 (or timestamp).
- Existing tasks without an `order` field default to `0` and fallback to creation date sorting.

## Testing

- Unit tests (`npm run test`):
  - Validate `order` validation in `lib/validation.test.ts`.
  - Validate `"manual"` sorting behavior and `reorderTasks` in `lib/tasks.test.ts`.
- Build gate (`npm run build`): verify Next.js compiles all pages with no TypeScript errors.
- Visual & interaction check: drag task rows to reorder, reload the page, and verify the custom order persists.

## Notes for the AI

- Use native HTML5 Drag and Drop (`dataTransfer`, `draggable`, `onDragStart`, `onDragOver`, `onDrop`) with zero third-party dependencies.
- Maintain full accessibility: provide accessible labels for drag handles.
- No em dashes in code comments or UI text.

## Open questions

None.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5456,"specSha256":"337d5152e6c666798c9b5b3d73ad99cf0d41162f0a1ba7636c2d7067ed5ecf12","branch":"refs/heads/feature/drag-and-drop-task-reordering-and-custom-positioning","head":"745b1593c1bb84d0543f473e2ba8e3ce1572e175","baseRef":"refs/heads/main","baseCommit":"745b1593c1bb84d0543f473e2ba8e3ce1572e175","sourceTree":"7d72604b50a88602f83b043e270317e001e7d87e","absentOptional":[]} -->
