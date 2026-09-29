# Feature: Data backup and restore

**From build-plan:** feature 14
**Build attempt:** 1
**Branch:** feature/data-backup-and-restore
**Status:** verified

## Goal

Provide users with a reliable, offline-first data backup and restore solution. Users can export their complete workspace data (tasks, priorities, due dates, categories, ordering, and notes) as a timestamped, formatted JSON snapshot file for safe storage or migration. Users can restore data by uploading a JSON backup file with rigorous schema validation, pre-import inspection (viewing item counts and export date), and choice between merging with existing data or replacing it completely.

## Design reference

Modern desktop productivity tools (Obsidian, Linear, and Notion data portability):
- Header Data Access:
  - Accessible "Data" or "Backup & Restore" button in `AppHeader.tsx` adjacent to the offline status badge, available from every page.
- Backup & Restore Modal Dialog:
  - Accessible dialog (`role="dialog"`, `aria-modal="true"`) with backdrop blur and keyboard escape closing.
  - Two distinct tabs or panels:
    - **Export Backup Panel**:
      - Overview of current workspace statistics (e.g. "12 tasks, 5 notes ready to export").
      - Explanatory note assuring 100% client-side privacy (no server uploads).
      - One-click "Download JSON Backup" button generating `taskflow-backup-YYYY-MM-DD-HHmm.json`.
    - **Restore Backup Panel**:
      - Drag-and-drop / file selector zone accepting `.json` files.
      - Pre-import validation card: displays file version, export timestamp, number of valid tasks, and number of notes.
      - Restore Mode selector:
        - **Merge (Recommended)**: Preserves existing items and adds imported records.
        - **Replace Workspace**: Wipes current stores and replaces with the backup snapshot, guarded by a confirmation prompt.
      - "Restore Data" action button with loading and success feedback.
      - Clear error banners for invalid JSON, incompatible schema, or corrupted files.

## In scope

1. **Backup data layer & validation (`lib/backup.ts`, `lib/backup.test.ts`):**
   - Define versioned `BackupPayload` schema (`version: 1`, `app: "TaskFlow"`, `exportedAt: string`, `data: { tasks: Task[]; notes: Note[] }`).
   - Implement `buildBackupPayload(tasks, notes)` and `generateBackupFilename()`.
   - Implement `parseAndValidateBackup(jsonString)` checking JSON syntax, schema version, required fields, and item validity.
   - Implement `exportDatabaseBackup()` reading directly from IndexedDB.
   - Implement `restoreDatabaseBackup(payload, mode)` executing an atomic transaction over both `tasks` and `notes` stores.
   - Comprehensive unit tests covering export formatting, valid payload imports, invalid JSON, corrupted records, merge mode, and replace mode.
2. **Backup modal interface (`components/backup/BackupModal.tsx`):**
   - Modal component with tabs/cards for Export and Restore.
   - HTML file input and drag-and-drop handling for `.json` uploads.
   - File preview showing counts of tasks and notes before user confirms restore.
   - Radio selector for Merge vs Replace mode.
   - Success and error alerts with accessible ARIA live regions.
3. **AppHeader integration (`components/app/AppHeader.tsx`):**
   - Add Backup button to the right utility bar of `AppHeader`.
   - Trigger `BackupModal` open/close.
   - On successful restore, reload window data or trigger state refresh.

## Out of scope

- Cloud sync or automatic remote server backup (strictly client-side offline-first architecture).
- CSV or PDF report exporting (the plan specifies JSON backup and restore for data portability).

## Build loop

- Step review mode: feature
- Checkpoint commits: disabled

## Build steps

1. [x] **Implement backup data logic, validation, and tests in `lib/backup.ts` & `lib/backup.test.ts`**
   - Create payload builders, JSON validators, and atomic import/export functions.
   - Write comprehensive unit tests for validation, edge cases, and transaction modes.
   - Done when: `npm run test` passes with full coverage on backup and restore logic.

2. [x] **Build `BackupModal.tsx` component**
   - Implement export button with file download, file upload input with validation preview, and merge/replace mode selector.
   - Add accessible modal dialog markup, focus handling, and error states.
   - Done when: Modal permits downloading a valid backup and uploading/restoring a backup file.

3. [x] **Integrate Backup modal into `AppHeader.tsx`**
   - Add trigger button to `AppHeader` header utilities.
   - Wire modal open/close state and trigger data reload upon successful restore.
   - Done when: Clicking the header button opens the modal from any page and restores data smoothly.

4. [x] **Run full verification suite**
   - Execute `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero linter warnings, and production Next.js build compiles with no errors.

## Files / areas

- `lib/backup.ts`
- `lib/backup.test.ts`
- `components/backup/BackupModal.tsx`
- `components/app/AppHeader.tsx`

## Data / contracts

- `BackupPayload`:
  ```typescript
  interface BackupPayload {
    version: 1;
    app: "TaskFlow";
    exportedAt: string;
    data: {
      tasks: Task[];
      notes: Note[];
    };
  }
  ```
- Validation requirements:
  - JSON parse must succeed.
  - `payload.version === 1` and `payload.app === "TaskFlow"`.
  - `payload.data.tasks` must be an array of objects matching Task structure.
  - `payload.data.notes` must be an array of objects matching Note structure.
- Atomic restore:
  - If `mode === "replace"`: clears `tasks` and `notes` stores before putting imported items.
  - If `mode === "merge"`: puts imported items into existing stores, updating duplicates and appending new items.

## Testing

- Unit tests (`npm run test`):
  - Export structure, filename generation, and timestamping.
  - Validation of valid payloads, invalid JSON, wrong version, wrong app identifier, and missing required properties.
  - Database restoration in merge mode (preserving existing untouched items) and replace mode (clearing existing items).
- Linter (`npm run lint`): ESLint clean with zero errors or warnings.
- Production build (`npm run build`): Next.js 16 App Router build succeeds with zero type errors.

## Notes for the AI

- Use proportional engineering: native browser APIs (`Blob`, `URL.createObjectURL`, `FileReader`) without third-party file saving libraries.
- Zero em dashes in comments, documentation, or UI text.
- Provide clear, reassuring confirmation warnings before any replace/overwrite action.

## Open questions

None.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6653,"specSha256":"12259ef026848ef7e26338cbc9a2cd2c7e12562895bae46bd3a53e7a1d5d8558","branch":"refs/heads/feature/data-backup-and-restore","head":"d60eed5cdf4043b37d38bb3e83944740087a4863","baseRef":"refs/heads/main","baseCommit":"d60eed5cdf4043b37d38bb3e83944740087a4863","sourceTree":"bd275b380159a469f6b5ff2c7a9eec36e556e389","absentOptional":[]} -->
