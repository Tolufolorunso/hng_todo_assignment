# Fix: Export failure shows error feedback in BackupModal

**Type:** Fix
**Status:** verified
**Branch:** fix/backup-export-error-feedback
**Fixes:** F-06

## The problem

In `components/backup/BackupModal.tsx:76-88`:
When `handleExport()` catches an error from `exportDatabaseBackup()` or `triggerDownload()`, it calls:
```tsx
setValidationError("Failed to generate backup export. Please try again.");
```
However, `validationError` is only rendered inside the **Restore** tab panel (`activeTab === "restore"`). When an export fails while the user is on the **Export** tab (`activeTab === "export"`), the spinner stops and the UI returns to an idle state with zero user feedback or error banner.

## The fix

1. In `components/backup/BackupModal.tsx`:
   - Introduce an `exportError` state: `const [exportError, setExportError] = useState<string | null>(null);`.
   - In `handleExport()`, reset `exportError` to `null` before initiating export, and on catch set `setExportError("Failed to generate backup export. Please try again.")` instead of setting `validationError`.
   - Clear `exportError` when the modal opens or when tab changes to avoid stale messages.
   - In the Export tab panel (`activeTab === "export"`), render an accessible alert banner (`role="alert"`) displaying `exportError` using consistent danger styling (`border-danger/30 bg-danger-soft text-danger`).
2. Run full verification suite (`npm run test`, `npm run lint`, `npm run build`).

## Build steps

1. [x] **Add `exportError` state and error banner to Export tab in `BackupModal.tsx`**
   - Add `exportError` state initialized to `null`.
   - Update `handleExport` to set `exportError` upon catch, and clear `exportError` on modal open.
   - Render the `exportError` alert banner within the Export tab panel above the action buttons.
   - Done when: Any export failure displays a clear, styled error banner within the Export tab.

2. [x] **Run full verification suite**
   - Run `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero lint warnings, and production build succeeds.

## Verify

1. Inspect `BackupModal.tsx` to verify `exportError` is dedicated to the Export tab and rendered when non-null.
2. Run `npm run test` to verify all test suites continue to pass.
3. Run `npm run lint` and `npm run build` to verify clean build and typecheck.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2367,"specSha256":"ee43a5cdfed7bf121430d7ec6f5ab81f4106597fe7db456db2f021d0f48e230e","branch":"refs/heads/fix/backup-export-error-feedback","head":"0233cfccde918fd6181a4c4559743e988389afa0","baseRef":"refs/heads/main","baseCommit":"0233cfccde918fd6181a4c4559743e988389afa0","sourceTree":"5259c249dd6027e91d43ce696a4b9648fce1bb72","absentOptional":[]} -->
