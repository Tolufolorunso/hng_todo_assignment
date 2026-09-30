# Fix: Preserve hidden task positions when reordering filtered lists

**Type:** Fix
**Status:** verified
**Branch:** fix/preserve-hidden-task-order
**Fixes:** F-05

## The problem

In `components/tasks/TasksScreen.tsx:238-248`:
When dropping a dragged task, `handleDrop` computes the new task order by concatenating the reordered visible tasks with all hidden tasks:

```tsx
const visibleIdSet = new Set(reorderedVisible.map((t) => t.id));
const remainingTasks = tasks.filter((t) => !visibleIdSet.has(t.id));
const combined = [...reorderedVisible, ...remainingTasks];
```

When a search query, category filter, or status filter is active, all filtered-out (hidden) tasks are moved to the end of the combined array. As a result, when the user clears the filter, the relative and absolute order of their hidden tasks has been silently reshuffled to the bottom of the list.

## The fix

1. In `lib/tasks.ts`:
   - Implement `interleaveReorderedTasks(allTasks: Task[], reorderedVisible: Task[]): Task[]`.
   - Iterate through `allTasks` and preserve the position of any hidden task while substituting visible slots with the reordered visible tasks.
2. In `components/tasks/TasksScreen.tsx`:
   - Replace `const combined = [...reorderedVisible, ...remainingTasks];` with `const combined = interleaveReorderedTasks(tasks, reorderedVisible);`.
3. In `lib/tasks.test.ts`:
   - Add unit tests verifying that reordering filtered tasks preserves hidden task slot positions across prefixes, middle elements, and suffixes.
4. Run full verification suite (`npm run test`, `npm run lint`, `npm run build`).

## Build steps

1. [x] **Implement `interleaveReorderedTasks` in `lib/tasks.ts` and add tests in `lib/tasks.test.ts`**
   - Add `interleaveReorderedTasks` helper preserving hidden task positions during partial reorders.
   - Add unit tests in `lib/tasks.test.ts` testing unfiltered, filtered, and boundary cases.
   - Done when: `interleaveReorderedTasks` correctly preserves slot positions for hidden tasks, verified by unit tests.

2. [x] **Update `TasksScreen.tsx` to use `interleaveReorderedTasks`**
   - Replace concatenation logic in `handleDrop` with `interleaveReorderedTasks(tasks, reorderedVisible)`.
   - Done when: Reordering tasks in `TasksScreen` with an active filter preserves hidden tasks in their original relative positions.

3. [x] **Run full verification suite**
   - Run `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero lint warnings, and production build succeeds.

## Verify

1. Run `npm run test` to verify all task reordering unit tests pass.
2. In the UI at `/`, create 4 tasks (A, B, C, D) with categories Work (A, C) and Personal (B, D).
3. Filter by category "Work" (showing only A and C).
4. Drag C above A.
5. Switch category filter back to "All": confirm the order is C, B, A, D (hidden tasks B and D remained in their original interleaved slots, not dumped at the bottom).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2946,"specSha256":"989941626d3fcd3758ef88536ed23583769cc7f9b5b3f02249e290c9dc9f575f","branch":"refs/heads/fix/preserve-hidden-task-order","head":"fd79575b0d3c849d3c5ddb813b88cd9ef26697ed","baseRef":"refs/heads/main","baseCommit":"fd79575b0d3c849d3c5ddb813b88cd9ef26697ed","sourceTree":"5e94ac16d500e4189c6fce6354a65633913c12c6","absentOptional":[]} -->
