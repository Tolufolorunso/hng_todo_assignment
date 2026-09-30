# Fix: Remove non-functional completed index on tasks store

**Type:** Fix
**Status:** verified
**Branch:** fix/remove-completed-index
**Fixes:** F-01

## The problem

In `lib/db.ts:13` and `lib/db.ts:55`:
The `tasks` store declares `completed: number` in `TaskFlowDB['tasks']['indexes']` and creates an index via `tasks.createIndex("completed", "completed")`.

However, `task.completed` is stored as a boolean (`boolean`). In the W3C IndexedDB specification, booleans are not valid key types (only strings, numbers, Dates, Arrays, and binary buffers are valid index keys). Because booleans cannot be indexed, the `completed` index exists in the store metadata but remains permanently empty (`index("completed").count()` returns 0 regardless of how many completed or active tasks exist).

The type declaration `completed: number` misdescribes the stored boolean, and no current code reads this index (task status filtering runs in memory).

## The fix

1. In `lib/db.ts`:
   - Remove `completed: number;` from `TaskFlowDB['tasks']['indexes']`.
   - Remove `tasks.createIndex("completed", "completed")` from the store upgrade handler.
   - Clean up the index if it exists in legacy databases.
2. In `lib/db.test.ts`:
   - Update index assertions to verify only active indexes (`dueDate`, `updatedAt`, `category`).
3. In `blueprint/project-plan.md` and `blueprint/context/project-overview.md`:
   - Update the documented `tasks` store indexes to reflect the real schema (`dueDate`, `updatedAt`, `category`).
   - Synchronize the plan source hash.

## Build steps

1. [x] **Remove `completed` index from `lib/db.ts` and update `lib/db.test.ts`**
   - Remove `completed: number` from `TaskFlowDB` index definition.
   - Remove `createIndex("completed", "completed")` from the upgrade path.
   - Update `lib/db.test.ts` to assert valid indexes (`dueDate`, `updatedAt`, `category`).
   - Done when: `lib/db.ts` no longer defines or creates the empty index, and all database tests in `lib/db.test.ts` pass.

2. [x] **Align plan docs and update overview fingerprint**
   - Update `blueprint/project-plan.md` and `blueprint/context/project-overview.md` to remove `completed` from task indexes.
   - Recompute and update `blueprint:source-hash`.
   - Done when: Plan and overview match the accurate database schema with matching source hash.

3. [x] **Run full verification suite**
   - Run `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero lint warnings, and production build succeeds.

## Verify

1. Run `npm run test` to verify all 10 test suites pass, specifically `lib/db.test.ts`.
2. Inspect `lib/db.ts` to verify `completed` is no longer present in `TaskFlowDB['tasks']['indexes']`.
3. Run `npm run build` to confirm production bundle builds without errors.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2800,"specSha256":"ad15ed018bc99640b640eae14f45b8ca57c051124fc2079cd1700d28deffbc25","branch":"refs/heads/fix/remove-completed-index","head":"eb9887498876b9491703b0692f1b0d3e9608b070","baseRef":"refs/heads/main","baseCommit":"eb9887498876b9491703b0692f1b0d3e9608b070","sourceTree":"294b83e0cb29e7426de92aa0a05b3be17379cc32","absentOptional":[]} -->
