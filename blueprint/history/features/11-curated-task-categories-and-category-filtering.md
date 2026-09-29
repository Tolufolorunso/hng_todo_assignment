# Feature: Curated task categories and category filtering

**From build-plan:** feature 11
**Build attempt:** 1
**Branch:** feature/curated-task-categories-and-category-filtering
**Status:** verified

## Goal

Enable users to organize tasks with curated color-coded categories (Work, Personal, Urgent, Study, Ideas) and filter their workspace view by category. Tasks can be created and edited with an assigned category or left unassigned, display stylish pill badges on task cards, and be filtered via dedicated category pills in the control bar. Existing IndexedDB databases seamlessly upgrade to schema version 3 without data loss.

## Design reference

Modern SaaS category tags (Linear style):
- Curated color schemes:
  - Work: Sky / Blue (`bg-sky-500/10 text-sky-400 border-sky-500/20`)
  - Personal: Purple / Violet (`bg-purple-500/10 text-purple-400 border-purple-500/20`)
  - Urgent: Rose / Coral (`bg-rose-500/10 text-rose-400 border-rose-500/20`)
  - Study: Emerald / Mint (`bg-emerald-500/10 text-emerald-400 border-emerald-500/20`)
  - Ideas: Amber / Gold (`bg-amber-500/10 text-amber-400 border-amber-500/20`)
- Category pill filter strip in `TaskControls.tsx` allowing fast single-click filtering with item count indicators.
- Category selection dropdown or pill selector in `TaskForm.tsx` and `TaskEditForm.tsx`.
- Compact category distribution overview in `TaskSidebar.tsx`.

## In scope

1. **Schema upgrade and data layer (`types/task.ts`, `lib/db.ts`):**
   - Define `TaskCategory = "work" | "personal" | "urgent" | "study" | "ideas"`.
   - Add `category: TaskCategory | null` to the `Task` interface.
   - Upgrade IndexedDB schema to version 3 in `lib/db.ts`, adding a `category` index and a migration backfill ensuring existing tasks have `category: null`.
2. **Validation extension (`lib/validation.ts`, `lib/validation.test.ts`):**
   - Add `category?: TaskCategory | null` to `TaskInput`, `ValidTaskInput`, `TaskPatch`, and `ValidTaskPatch`.
   - Validate category against the curated allowed list or null.
3. **Task filtering and repository logic (`lib/tasks.ts`, `lib/tasks.test.ts`):**
   - Add `TaskCategoryFilter = "all" | TaskCategory`.
   - Implement `filterTasksByCategory(tasks: Task[], filter: TaskCategoryFilter): Task[]`.
   - Ensure `createTask` and `updateTask` persist `category`.
4. **Task creation and editing UI (`components/tasks/TaskForm.tsx`, `components/tasks/TaskEditForm.tsx`):**
   - Add category selector to `TaskForm.tsx` and `TaskEditForm.tsx`.
5. **Task card badge rendering (`components/tasks/TaskItem.tsx`):**
   - Display color-coded category badges on task cards next to priority and due date.
6. **Workspace category filtering (`components/tasks/TaskControls.tsx`, `components/tasks/TasksScreen.tsx`, `components/tasks/TaskSidebar.tsx`):**
   - Add category filter pill buttons in `TaskControls.tsx`.
   - Connect active category filter in `TasksScreen.tsx`.
   - Show category count distribution in `TaskSidebar.tsx`.

## Out of scope

- User-defined arbitrary category strings or custom color picker (the product specification mandates curated categories).
- Calendar scheduling view (Feature 12).
- Dedicated analytics metrics page (Feature 13).
- JSON backup and restore (Feature 14).

## Build loop

- Step review mode: feature
- Checkpoint commits: disabled

## Build steps

1. [x] **Extend Task model, database schema v3, and migration in `types/task.ts` and `lib/db.ts`**
   - Define `TaskCategory` type in `types/task.ts`.
   - Update `Task` interface with `category: TaskCategory | null`.
   - In `lib/db.ts`, bump `DB_VERSION` to 3, add index `category`, and handle database migration from v1/v2 to v3 with cursor backfill.
   - Update and add unit tests in `lib/db.test.ts`.
   - Done when: `npm run test` passes with schema v3 upgrade tests verified.

2. [x] **Add category validation in `lib/validation.ts` and tests in `lib/validation.test.ts`**
   - Add `validateCategory` ensuring category is one of the curated values or `null`.
   - Support `category` in `validateTaskInput` and `validateTaskPatch`.
   - Add unit tests in `lib/validation.test.ts`.
   - Done when: `npm run test` passes with category validation coverage.

3. [x] **Extend `lib/tasks.ts` with `filterTasksByCategory` and tests in `lib/tasks.test.ts`**
   - Implement `filterTasksByCategory(tasks: Task[], filter: TaskCategoryFilter): Task[]`.
   - Update `createTask` to persist `category`.
   - Add unit tests in `lib/tasks.test.ts` covering category filtering and persistence.
   - Done when: `npm run test` passes with all task tests green.

4. [x] **Add category selection in `TaskForm.tsx` and `TaskEditForm.tsx`, and badges in `TaskItem.tsx`**
   - Add category selection to `TaskForm.tsx` and `TaskEditForm.tsx`.
   - Render color-coded category badges on `TaskItem.tsx`.
   - Done when: Tasks can be created and edited with categories, and appear with distinct category badges.

5. [x] **Wire category filtering in `TaskControls.tsx`, `TasksScreen.tsx`, and sidebar summary**
   - Add category filter pills in `TaskControls.tsx`.
   - Wire `categoryFilter` state in `TasksScreen.tsx` into the filter pipeline.
   - Display category breakdown in `TaskSidebar.tsx`.
   - Done when: Clicking category filters displays only tasks in that category, and `npm run test`, `npm run lint`, and `npm run build` pass completely.

## Files / areas

- `types/task.ts`
- `lib/db.ts`
- `lib/db.test.ts`
- `lib/validation.ts`
- `lib/validation.test.ts`
- `lib/tasks.ts`
- `lib/tasks.test.ts`
- `components/tasks/TaskForm.tsx`
- `components/tasks/TaskEditForm.tsx`
- `components/tasks/TaskItem.tsx`
- `components/tasks/TaskControls.tsx`
- `components/tasks/TasksScreen.tsx`
- `components/tasks/TaskSidebar.tsx`

## Data / contracts

- `TaskCategory`: `"work" | "personal" | "urgent" | "study" | "ideas"`.
- `Task.category`: `TaskCategory | null`.
- Default when not specified is `null`.
- Existing tasks migrate to `category: null`.
- Database version upgraded to 3 with an index on `category`.

## Testing

- Unit tests (`npm run test`):
  - Database schema v3 upgrade and migration in `lib/db.test.ts`.
  - Category validation in `lib/validation.test.ts`.
  - `filterTasksByCategory` and category CRUD in `lib/tasks.test.ts`.
- Build gate (`npm run build`): verify Next.js compiles all pages with no TypeScript errors.
- Visual and interaction check: create a task with a category, filter by that category, verify card badges and sidebar stats.

## Notes for the AI

- Use proportional engineering: keep the category list curated and simple.
- Maintain full accessibility: label selectors and provide proper aria attributes for filter buttons.
- No em dashes in code comments or UI text.

## Open questions

None.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6750,"specSha256":"47aec77f8a0495e9fcae77bdff7a5617eb9d93e255ed6b6c9a6071922a8f2d9d","branch":"refs/heads/feature/curated-task-categories-and-category-filtering","head":"9f52bcbff32f7987c963cac7001e70afdd77e7a9","baseRef":"refs/heads/main","baseCommit":"9f52bcbff32f7987c963cac7001e70afdd77e7a9","sourceTree":"f953ceaecce2eace4dd78fc5710799ae5a172fe8","absentOptional":[]} -->
