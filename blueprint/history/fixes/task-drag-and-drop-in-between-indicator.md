# Fix: Task drag and drop in-between indicator and persistence

**Type:** Fix
**Status:** verified
**Branch:** fix/task-drag-and-drop-in-between-indicator

## The problem

1. **State out-of-sync / reload required:** When dropping a reordered task in `TasksScreen.tsx`, the local `tasks` state is updated with reordered items, but the individual task objects retain their stale in-memory `task.order` values. Because `visibleTasks` immediately calls `sortTasks(tasks, sort)`, `sortTasks` re-sorts the array according to the stale `task.order` numbers, causing the UI to snap back to the previous order until a manual page reload fetches the newly updated orders from IndexedDB.
2. **Default sort reversion:** `TasksScreen` initializes `sort` to `"created"` ("Sort: Newest") instead of `"manual"` ("Sort: Custom"). Any reload reverts to creation-date order rather than preserving the user's custom drag-and-drop arrangement.
3. **No in-between drop indicator:** In `TaskItem.tsx`, hovering over a card during drag only highlights the entire target card (`ring-2 ring-accent/30`). There is no visual indicator showing where the incoming task will be inserted (above, in-between, or below cards).
4. **Cannot place task after the last item:** `handleDrop` previously only inserted before `targetTask`, preventing users from placing an item at the very bottom of the list.

## The fix

1. **In-memory order synchronization:**
   - In `handleDrop`, update each task's `order` property in memory (`order: index`) when setting `tasks` state so `sortTasks(..., "manual")` immediately renders the exact dropped order without requiring a reload.
   - Default `sort` in `TasksScreen` to `"manual"` and persist the sort selection to `localStorage` (`taskflow:sort`).
2. **Visual in-between drop indicator (Professional UX):**
   - Track `dropIndicator: { id: string; edge: "top" | "bottom" } | null` during dragover.
   - Detect pointer position relative to target card midpoint (`clientY < rect.top + rect.height / 2`).
   - Render a high-visibility, glowing insertion indicator line with an endpoint anchor dot (`h-1 bg-accent rounded-full shadow-[0_0_8px_var(--color-accent)]`) at the top or bottom edge of the hovered card.
   - Compute drop target index based on `edge`: insert before when `edge === "top"`, and insert after when `edge === "bottom"`. This allows placing tasks anywhere: top, in-between any cards, or at the very end.
3. **Native drag lifecycle stabilization:**
   - Defer visual dragging state with `requestAnimationFrame` on `dragstart` to prevent Chrome/Edge from aborting the native drag operation.
   - Store `draggingIdRef.current` synchronously so dragover and drop handlers have zero latency.

## Build steps

1. [x] **Implement in-between drop indicator and insertion positioning in `TasksScreen.tsx` and `TaskItem.tsx`**
   - Track `{ id: string; edge: "top" | "bottom" }` on dragover based on cursor `clientY`.
   - Render the glowing in-between drop indicator bar at the top or bottom of the hovered task card.
   - Update `handleDrop` to insert before or after `targetTask` based on `edge`, and sync `order: index` on all tasks in state before writing to IndexedDB.
   - Default sort to `"manual"` and remember sort preference in `localStorage`.
   - Done when: Dragging shows a clear in-between line above or below tasks, dropping immediately places the item in position without snapping back or needing a page reload, and reloading preserves the custom order.

2. [x] **Verify test suite and build output**
   - Run `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero lint warnings, and production build succeeds.

## Verify

1. Open workspace at `/`.
2. Grab any task by its handle or card and drag it between two other tasks: observe the glowing in-between line showing the exact insertion slot.
3. Release the drop: the task immediately settles into the indicated position with no snap-back and no page reload required.
4. Reload the page (`F5`): verify the custom order is completely preserved.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":4065,"specSha256":"14a33af8718b01a52af2a4ea12b9c0aca414fd7f73fb22d33d8c88fbcc32feaa","branch":"refs/heads/fix/task-drag-and-drop-in-between-indicator","head":"5a40e7d07d3bcf1bfe9cafb0e0990a3c9b5f72dd","baseRef":"refs/heads/main","baseCommit":"5a40e7d07d3bcf1bfe9cafb0e0990a3c9b5f72dd","sourceTree":"900c5c6805c96c219ac2728abeaa06f6d2b2f2a0","absentOptional":[]} -->
