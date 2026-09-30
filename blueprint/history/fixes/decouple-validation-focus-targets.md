# Fix: Decouple edit-form focus targets from validation message copy

**Type:** Fix
**Status:** verified
**Branch:** fix/decouple-validation-focus-targets
**Fixes:** F-02

## The problem

In `components/tasks/TaskEditForm.tsx:27-43` and `components/notes/NoteEditor.tsx:28-30`:
`focusFieldFor` chooses which input to focus on validation failure by inspecting human-readable error message prefixes (`error.startsWith("Description")`, `error.startsWith("Priority")`, `error.startsWith("Due date")`, `error.startsWith("Category")`, `error.startsWith("Body")`).

Any future tweak or phrasing change to validator messages in `lib/validation.ts` silently breaks this string-matching logic and causes focus to fall back to the title input, violating the done-when requirement to focus the offending control.

## The fix

1. In `lib/validation.ts`:
   - Extend `ValidationResult<T>` with an optional `field?: F` property.
   - Return stable field identifiers from every sub-validator:
     - `validateTitle`: `field: "title"`
     - `validateDescription`: `field: "description"`
     - `validatePriority`: `field: "priority"`
     - `validateDueDate`: `field: "dueDate"`
     - `validateCategory`: `field: "category"`
     - `validateNoteTitle`: `field: "title"`
     - `validateNoteBody`: `field: "body"`
2. In `components/tasks/TaskEditForm.tsx`:
   - Eliminate `focusFieldFor`.
   - Read `validation.field` directly to set `errorField` and focus the corresponding input ref (`titleRef`, `priorityRef`, `dueDateRef`, `categoryRef`).
3. In `components/notes/NoteEditor.tsx`:
   - Eliminate `focusFieldFor`.
   - Read `validation.field` directly to set `errorField` and focus `titleRef`.
4. In `lib/validation.test.ts`:
   - Add unit tests verifying that validation errors populate the correct `field` property.

## Build steps

1. [x] **Add stable field metadata to `lib/validation.ts` and add tests**
   - Update `ValidationResult` and sub-validators in `lib/validation.ts` to return `field`.
   - Add tests in `lib/validation.test.ts` verifying error `field` values.
   - Done when: Validation failures return the exact target field name alongside the error message, verified by unit tests.

2. [x] **Update `TaskEditForm.tsx` and `NoteEditor.tsx` to consume `validation.field`**
   - Remove string-matching `focusFieldFor` functions from both components.
   - Route focus and `errorField` state directly through `validation.field`.
   - Done when: Neither component contains string-matching message prefix logic for focus management.

3. [x] **Run full verification suite**
   - Run `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero lint warnings, and production build succeeds.

## Verify

1. Run `npm run test` to verify all validation unit tests pass.
2. Edit a task in `/` with an invalid due date (e.g. malformed date): verify error focuses the due date input.
3. Edit a note in `/notes` with an empty title: verify error highlights and focuses title input.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3004,"specSha256":"cdf3be8a2e75bae4e26392dce52a8f6e6464ff24950a930f0f3c676f126bf559","branch":"refs/heads/fix/decouple-validation-focus-targets","head":"195ec45e92a058d716d3be69f052285230615290","baseRef":"refs/heads/main","baseCommit":"195ec45e92a058d716d3be69f052285230615290","sourceTree":"886be1e5372fbdea216e7114bdb7d0554639341a","absentOptional":[]} -->
