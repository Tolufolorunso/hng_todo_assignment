# Fix: BackupModal prominent close button and backdrop dismissal

**Type:** Fix
**Status:** verified
**Branch:** fix/backup-modal-close-button

## The problem

In `components/backup/BackupModal.tsx`:
1. **No bottom Close/Cancel button in Export tab:** The Export Backup panel only features a single full-width primary button ("Download JSON Backup"). After downloading or while inspecting workspace data, there is no visible "Close" or "Done" button at the bottom of the modal, forcing users to reload the page to exit.
2. **Backdrop click does not dismiss:** Clicking outside the modal dialog on the darkened backdrop overlay does nothing because there is no `onClick` dismissal handler on the overlay.
3. **Hard-to-spot top close icon:** The top-right close button is a small, unbordered icon that blends into the background, making it difficult for users to notice.
4. **No Cancel button in Restore tab:** The Restore panel lacks a clear "Close" or "Cancel" action when viewing the file picker or validated restore preview.

## The fix

1. **Backdrop Overlay Dismissal:**
   - Add `onClick={onClose}` on the fixed backdrop container.
   - Add `onClick={(e) => e.stopPropagation()}` on the inner dialog card to prevent clicks inside the modal from closing it.
2. **High-Visibility Header Close Button:**
   - Upgrade the top-right close button into a distinct, elevated icon button with rounded styling (`h-8 w-8 rounded-xl border border-border/80 bg-surface-muted/60 hover:bg-surface-muted hover:border-border`), clear hover/focus states, and `aria-label="Close modal"`.
3. **Prominent Bottom Action Buttons in Both Tabs:**
   - **Export tab:** Add a dedicated secondary "Close" button alongside the "Download JSON Backup" action button.
   - **Restore tab:** Add a secondary "Cancel" / "Close" button alongside the "Confirm & Restore Data" action button, and provide a bottom "Close" button when no file is currently selected.

## Build steps

1. [x] **Update `BackupModal.tsx` with backdrop dismissal and prominent Close buttons**
   - Add backdrop click dismissal with stopPropagation on dialog card.
   - Add elevated header close button.
   - Add secondary Close / Cancel buttons in both the Export and Restore tabs.
   - Done when: Clicking the backdrop, the header close button, or the bottom Close/Cancel buttons smoothly closes the modal without requiring a page reload.

2. [x] **Run full verification suite**
   - Run `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero lint warnings, and production build compiles with no errors.

## Verify

1. Open workspace at `/` and click the **Data** button in the header to open the Backup & Restore modal.
2. Verify the prominent **Close** button is clearly visible at the bottom of the Export tab next to "Download JSON Backup".
3. Click the bottom **Close** button: modal closes cleanly without page reload.
4. Open the modal again and click anywhere on the darkened backdrop outside the dialog: modal closes cleanly.
5. Open the modal, switch to **Restore Backup** tab: verify the bottom **Close** / **Cancel** button is available and closes the modal.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":3155,"specSha256":"ef8e50478b8988d588ae947d8b16aa20df20a5c057d2514107047a91ce622f06","branch":"refs/heads/fix/backup-modal-close-button","head":"ca6e21f8f4283a31ae67c99076fe9b4a3744c28e","baseRef":"refs/heads/main","baseCommit":"ca6e21f8f4283a31ae67c99076fe9b4a3744c28e","sourceTree":"3363367f1c2e30f868419eaabd26ce614e42629d","absentOptional":[]} -->
