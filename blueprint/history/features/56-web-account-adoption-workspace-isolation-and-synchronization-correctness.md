# Feature: Web Account Adoption, Workspace Isolation, and Synchronization Correctness

**From build-plan:** feature 56
**Build attempt:** 1
**Status:** verified
**Branch:** feature/web-account-adoption-workspace-isolation-and-synchronization-correctness

## Goal

Harden web client authentication transitions, workspace data isolation, and synchronization correctness. Ensure the post-OTP authentication transition carries the verified user identity directly into the local-data adoption decision, eliminating the race condition where adoption was bypassed because React state had not yet propagated. Migrate all web entity persistence (Tasks, Notes, Follow Ups, Inbox captures, Plan My Day, and custom task ordering) to route strictly through the workspace-aware repository. Guarantee that local-only data and account data are never mixed, account mutations reliably enqueue into the synchronization outbox, all screens reactively reload upon workspace change events, and signing out or deleting an account safely restores the untouched local workspace.

## In scope

- Post-OTP transition and identity-carried local-data adoption:
  - Update `verifyOtp` in `apps/web/components/auth/AuthProvider.tsx` to return the verified `user`, `accessToken`, and `session` in its result object.
  - Update `AccountModal.tsx` and `AppHeader.tsx` to pass the authenticated `user` directly to the `onAuthenticated` callback, eliminating stale closures over pre-auth state.
  - In `AppHeader.tsx`, check `hasLocalDataToAdopt()` using the verified account ID. If local records exist, open `DataAdoptionModal`. If no local records exist, switch immediately to `account_<id>` workspace, broadcast `WORKSPACE_CHANGED`, and trigger sync.
- Workspace lifecycle management:
  - On session restoration (page load or cookie refresh in `AuthProvider.tsx`), set `setActiveWorkspaceId(getAccountWorkspaceId(user.id))` and broadcast `WORKSPACE_CHANGED`.
  - On sign-out in `AuthProvider.tsx`, call `setActiveWorkspaceId(DEFAULT_WORKSPACE_ID)` and broadcast `WORKSPACE_CHANGED`.
  - In `AccountModal.tsx`, add an explicit "Delete Account" action invoking `deleteAccount(token)` from `lib/auth.ts`. On completion, reset active workspace to `DEFAULT_WORKSPACE_ID`, broadcast `WORKSPACE_CHANGED`, clear auth, and close modal.
- Workspace-aware repository bridging:
  - Update `apps/web/lib/tasks.ts` to delegate persistence (`listTasks`, `createTask`, `updateTask`, `deleteTask`, `reorderTasks`) to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
  - Update `apps/web/lib/notes.ts` to delegate persistence (`listNotes`, `createNote`, `updateNote`, `deleteNote`) to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
  - Update `apps/web/lib/followups.ts` to delegate persistence (`listFollowUps`, `createFollowUp`, `updateFollowUp`, `deleteFollowUp`, `completeFollowUp`, `skipFollowUpOccurrence`, `snoozeFollowUp`, `rescheduleFollowUp`, `listOccurrencesByFollowUp`) to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
  - Update `apps/web/lib/inbox.ts` to delegate persistence (`listCaptures`, `createCapture`, `updateCapture`, `deleteCapture`, `discardCapture`) to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
  - Update `apps/web/lib/plans.ts` to delegate persistence (`getDailyPlanByDate`, `createDailyPlan`, `saveDailyPlan`, `togglePlanItemCompletion`) to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
- Reactive screen reloading on workspace change:
  - In `TasksScreen.tsx`, `NotesScreen.tsx`, `FollowUpsScreen.tsx`, `InboxScreen.tsx`, `PlanScreen.tsx`, and `AnalyticsCards.tsx`, subscribe to `onSyncEvent` for `WORKSPACE_CHANGED`.
  - On workspace change, reload entity lists, reset selection state, and re-query counts without requiring a full browser refresh.
- Adoption and Start Fresh isolation:
  - Verify `adoptLocalDataIntoAccount` in `lib/adoption.ts` clones records into the account workspace with fresh IDs and outbox mutation entries, while preserving untouched records in the local workspace.
  - Verify Start Fresh switches active workspace to the account workspace without cloning local records.
- Testing and verification:
  - Unit tests for identity propagation, workspace isolation, outbox queueing, adoption cloning, and sign-out restoration.
  - Clean monorepo verification gate (`npm run verify`).

## Out of scope

- Changes to mobile React Native (`apps/mobile`) or Windows WPF (`apps/windows`) applications.
- Changes to database migrations, schema definitions, or API v1 route contracts.
- Introducing external state management libraries (e.g. Redux, Zustand); maintain lightweight, repository-native React state and broadcast channels.

## Build loop

- Step review: feature (present final review packet after all steps pass).
- Checkpoint commits: disabled.
- Verification command: `npm run verify` at repository root.
- Branch: `feature/web-account-adoption-workspace-isolation-and-synchronization-correctness`.

## Build steps

- [x] 1. **Post-OTP Transition and Identity-Carried Local-Data Adoption:**
   - In `apps/web/components/auth/AuthProvider.tsx`, update `verifyOtp` return value to include `{ ok: true, user: res.data.user, token: res.data.accessToken, session: res.data.session }`.
   - In `apps/web/components/auth/AccountModal.tsx`, update `onAuthenticated` prop to accept `(user: AuthUser) => void` and invoke it with the returned user object.
   - In `apps/web/components/app/AppHeader.tsx`, update `handleAuthenticated` to take `authUser: AuthUser`, check `hasLocalDataToAdopt()`, open `DataAdoptionModal` if local records exist, or switch to `account_<id>` and sync if no local records exist.
   - Done when: A user signing in with local records immediately sees the Data Adoption modal without being bypassed or closed out, and signing in without local data switches immediately to the account workspace.

- [x] 2. **Workspace Lifecycle Transitions (Session Restore, Sign-Out, Account Deletion):**
   - In `apps/web/components/auth/AuthProvider.tsx`, set active workspace to `getAccountWorkspaceId(user.id)` and broadcast `WORKSPACE_CHANGED` upon initial auth token restoration or refresh.
   - In `signOut` in `AuthProvider.tsx`, reset active workspace to `DEFAULT_WORKSPACE_ID` and broadcast `WORKSPACE_CHANGED`.
   - In `apps/web/components/auth/AccountModal.tsx`, implement the Delete Account button with confirmation calling `deleteAccount(token)` from `@/lib/auth`. On success, reset active workspace to `DEFAULT_WORKSPACE_ID`, broadcast `WORKSPACE_CHANGED`, clear auth, and close modal.
   - Done when: Session restoration preserves the account workspace, signing out cleanly restores the local workspace, and deleting an account purges cloud records and returns safely to the local workspace.

- [x] 3. **Workspace-Aware Repository Bridging for Tasks, Notes, and Follow-Ups:**
   - In `apps/web/lib/tasks.ts`, bridge `listTasks`, `createTask`, `updateTask`, `deleteTask`, and `reorderTasks` to delegate to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
   - In `apps/web/lib/notes.ts`, bridge `listNotes`, `createNote`, `updateNote`, and `deleteNote` to delegate to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
   - In `apps/web/lib/followups.ts`, bridge all CRUD and occurrence operations to delegate to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
   - Done when: All task, note, and follow-up operations filter strictly by active workspace and automatically enqueue outbox mutations when in an account workspace.

- [x] 4. **Workspace-Aware Repository Bridging for Inbox Captures and Plan My Day:**
   - In `apps/web/lib/inbox.ts`, bridge `listCaptures`, `createCapture`, `updateCapture`, `deleteCapture`, and `discardCapture` to delegate to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
   - In `apps/web/lib/plans.ts`, bridge `getDailyPlanByDate`, `createDailyPlan`, `saveDailyPlan`, and `togglePlanItemCompletion` to delegate to `apps/web/lib/repository.ts` using `getActiveWorkspaceId()`.
   - Done when: Captures and plans are strictly isolated by workspace, and account-scoped mutations enqueue into the sync outbox.

- [x] 5. **Screen Reactive Reloading on Workspace Change:**
   - In `TasksScreen.tsx`, `NotesScreen.tsx`, `FollowUpsScreen.tsx`, `InboxScreen.tsx`, `PlanScreen.tsx`, and `AnalyticsCards.tsx`, listen for `WORKSPACE_CHANGED` via `onSyncEvent`.
   - On workspace change, clear selection and reload data from the repository for the newly active workspace.
   - Done when: Switching between local and account workspaces immediately refreshes all visible screen lists without requiring a browser reload.

- [x] 6. **Adoption and Start Fresh Data Integrity:**
   - Verify `adoptLocalDataIntoAccount` in `apps/web/lib/adoption.ts` clones records with new IDs and enqueues outbox mutations for all entities while leaving local records completely untouched.
   - Verify Start Fresh in `DataAdoptionModal.tsx` switches to account scope without touching or uploading local records.
   - Done when: Adoption copies data once with queued outbox mutations, and Start Fresh provides an empty account workspace while preserving local data.

- [x] 7. **Unit Tests, Integration Tests, and Monorepo Quality Gate:**
   - Add unit tests in `apps/web/lib/adoption.test.ts`, `apps/web/lib/repository.test.ts`, and `apps/web/lib/auth.test.ts` covering identity propagation, workspace isolation, outbox generation, and session lifecycle.
   - Run `npm run verify` across the monorepo to ensure boundary check, mobile tests, web lint, web unit tests, web build, and windows tests pass cleanly.
   - Done when: All tests pass, lint is clean, build succeeds, and boundaries are 100% verified.

## Files / areas

- `apps/web/components/auth/AuthProvider.tsx`
- `apps/web/components/auth/AccountModal.tsx`
- `apps/web/components/auth/DataAdoptionModal.tsx`
- `apps/web/components/app/AppHeader.tsx`
- `apps/web/components/tasks/TasksScreen.tsx`
- `apps/web/components/notes/NotesScreen.tsx`
- `apps/web/components/followups/FollowUpsScreen.tsx`
- `apps/web/components/inbox/InboxScreen.tsx`
- `apps/web/components/plan/PlanScreen.tsx`
- `apps/web/components/analytics/AnalyticsCards.tsx`
- `apps/web/lib/tasks.ts`
- `apps/web/lib/notes.ts`
- `apps/web/lib/followups.ts`
- `apps/web/lib/inbox.ts`
- `apps/web/lib/plans.ts`
- `apps/web/lib/repository.ts`
- `apps/web/lib/adoption.ts`
- `apps/web/lib/broadcast.ts`
- `apps/web/lib/auth.ts`
- `apps/web/lib/adoption.test.ts`
- `apps/web/lib/repository.test.ts`

## Data / contracts

- Workspace Scoping:
  - Default workspace ID: `"local"`.
  - Account workspace ID format: `account_${accountId}`.
  - Active workspace ID stored in-memory in `apps/web/lib/repository.ts` via `getActiveWorkspaceId()`.
- Outbox Mutations:
  - Enqueued automatically for all mutations where `workspaceId !== "local"`.
  - Shape: `OutboxMutationRecord` (`id`, `workspaceId`, `entityType`, `entityId`, `action`, `baseRevision`, `payload`, `createdAt`).
- Broadcast Channel Events:
  - `WORKSPACE_CHANGED`: `{ type: "WORKSPACE_CHANGED", workspaceId: string }` dispatched on switch, login, adoption, sign-out, and account deletion.

## Testing

- Unit tests: `npm --prefix apps/web run test` (including adoption, repository, and auth tests).
- Lint: `npm --prefix apps/web run lint`.
- Build: `npm --prefix apps/web run build`.
- Monorepo gate: `npm run verify`.

## Notes for the AI

- Strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, docs, or responses.
- Respect monorepo application isolation boundaries: zero cross-application imports.
- Never commit, merge, or push without separate, explicit user approval.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11728,"specSha256":"2fe8b1b427d70300f33cf3311512426284b7ee1fe465885ed5fa6ba1010c85e1","branch":"refs/heads/feature/web-account-adoption-workspace-isolation-and-synchronization-correctness","head":"8b0ac417541afb651c7b87813f135d62d62e6ce6","baseRef":"refs/heads/main","baseCommit":"8b0ac417541afb651c7b87813f135d62d62e6ce6","sourceTree":"0601962d77b448dc771a52157e5fe118bf3526f8","absentOptional":[]} -->
