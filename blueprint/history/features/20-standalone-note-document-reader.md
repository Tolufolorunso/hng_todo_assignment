# Feature: Standalone note document reader (/notes/[id])

**From build-plan:** feature 20
**Build attempt:** 1
**Branch:** feature/standalone-note-document-reader
**Status:** verified

## Goal

Provide a dedicated, distraction-free document reading view for any note at `/notes/[id]`. The page renders rich Word-style formatted note content with document-grade typography, live reading statistics (word count and estimated reading time), export actions (print and clean PDF export via native browser print, copy plain text), an edit shortcut that preselects the note in the editor (`/notes?id=[id]`), and direct quick-launch buttons from the main notes list.

## In scope

- Standalone route at `app/notes/[id]/page.tsx` rendering the document reader with `AppHeader` and `AppFooter`.
- Client component `components/notes/StandaloneNoteView.tsx` fetching the note by ID from IndexedDB via `getNote(id)`.
- Word count and estimated reading time calculation utility (`calculateReadingStats`) with focused unit tests.
- Document typography styling in dark and light modes, presenting formatted HTML cleanly with comfortable line height and maximum reading width.
- Action toolbar:
  - "Back to Notes" button linking back to `/notes`.
  - "Edit Note" button navigating to `/notes?id=[id]`.
  - "Print / Export PDF" button triggering `window.print()` with print-specific stylesheet rules (`print:` utility classes) hiding navigation, action buttons, and background chrome for crisp physical or PDF printing.
  - "Copy Plain Text" button copying sanitized text to clipboard with ephemeral "Copied!" feedback.
- Robust state handling: loading spinner, not found message with return link, and error boundary fallback.
- Quick-launch document reader icon button on each note card in `components/notes/NoteList.tsx`.
- Deep linking support in `components/notes/NotesScreen.tsx` using `useSearchParams` to automatically select and focus the requested note when `/notes?id=[id]` is opened.

## Out of scope

- Direct inline editing inside the standalone reader (editing happens in the rich WYSIWYG editor on `/notes`).
- Heavy external PDF rendering dependencies (Puppeteer, jsPDF, html2pdf); native `window.print()` with `@media print` styling satisfies PDF export without adding client bundle weight.
- Server-side metadata or dynamic Open Graph card generation for individual notes (belonging to Feature 21 SEO & Deployment).
- Modifying the underlying IndexedDB Note schema (no migrations needed).

## Build loop

- Step review: `feature` (stop after each step for review).
- Checkpoint commits: `disabled` (as configured in `blueprint/config.json`).
- Final completion: `/complete` creates the final squash commit and archives the spec.

## Build steps

- [x] 1. **Add reading statistics utility and unit tests** - implement `calculateReadingStats(html: string): { words: number; readingTimeMinutes: number }` in `lib/html.ts` (leveraging `stripHtmlToText`) and add comprehensive unit tests in `lib/html.test.ts`. Done when all 165+ tests pass with `npm run test`.
- [x] 2. **Build `StandaloneNoteView` component** - create `components/notes/StandaloneNoteView.tsx` with loading skeleton, not found state, header actions (Back, Edit, Print, Copy), reading stats badge, rich HTML container with document typography, and print-optimized media styles (`print:hidden`, `print:p-0`). Done when the component builds and handles all states cleanly.
- [x] 3. **Implement dynamic route `app/notes/[id]/page.tsx`** - wire the Next.js App Router dynamic route, pass the unwrapped route `id` to `StandaloneNoteView`, and ensure seamless navigation with `AppHeader`. Done when `npm run build` succeeds and routes are statically/dynamically registered.
- [x] 4. **Add quick-launch button to NoteList and query param support to NotesScreen** - update `components/notes/NoteList.tsx` with a document reader action button for each note linking to `/notes/${note.id}`, and update `components/notes/NotesScreen.tsx` with `useSearchParams()` support so that clicking "Edit Note" from the reader immediately selects the target note in the editor. Done when quick-launch links navigate to the reader and "Edit Note" returns to the editor with that note pre-selected.
- [x] 5. **Verification and quality gates** - run `npm run test`, `npm run lint`, and `npm run build` to confirm zero lint errors, zero type errors, all unit tests passing, and a clean Next.js build. Done when all commands exit code 0.

## Files / areas

- `lib/html.ts` - add `calculateReadingStats` function.
- `lib/html.test.ts` - unit tests for word count and reading time.
- `components/notes/StandaloneNoteView.tsx` - standalone reader component with document typography and print styles.
- `app/notes/[id]/page.tsx` - dynamic route page for standalone note reading.
- `components/notes/NoteList.tsx` - add document launch icon link to each note card.
- `components/notes/NotesScreen.tsx` - read URL search param `id` on load to select note.

## Data / contracts

- Existing Note type from `types/note.ts`:
  ```typescript
  export interface Note {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    updatedAt: string;
  }
  ```
- Reading statistics contract:
  ```typescript
  export interface ReadingStats {
    words: number;
    readingTimeMinutes: number;
  }
  ```
  Calculated at an average adult reading speed of 200 words per minute (`Math.max(1, Math.ceil(words / 200))`), returning 0 minutes for empty text.
- Print media styling contract:
  `@media print` elements hide header navigation (`AppHeader`), footers (`AppFooter`), and toolbar controls (`print:hidden`), presenting only document title, date, reading stats, and rich HTML body on plain white background.

## Testing

- Unit tests in `lib/html.test.ts`:
  - Empty string and whitespace HTML returns 0 words and 0 minutes reading time.
  - Short notes (<200 words) return exact word count and 1 minute reading time.
  - Longer formatted HTML (with headings, bold, paragraphs, lists) strips tags properly and calculates accurate word counts and rounded reading minutes.
- Automated gate:
  - `npm run test` (Vitest)
  - `npm run lint` (ESLint)
  - `npm run build` (Next.js Turbopack build)

## Notes for the AI

- Maintain zero em dashes across all code, comments, and strings.
- In Next.js 16 App Router, client dynamic routes can consume `useParams<{ id: string }>()` from `next/navigation` directly and safely.
- In `components/notes/NotesScreen.tsx`, wrapping search param access in `<Suspense>` or checking search params cleanly prevents Next.js client-side deopt warnings during build.
- Ensure the print action uses native `window.print()` and that print styling does not break page layout or bleed dark backgrounds onto physical paper.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6786,"specSha256":"2b8293f8998f65447cefc3d4d057d775a947334d2e50e55f197c86f6e210d78b","branch":"refs/heads/feature/standalone-note-document-reader","head":"932515e302a6e86f24c6ed60dc7c4c8f9400358c","baseRef":"refs/heads/main","baseCommit":"932515e302a6e86f24c6ed60dc7c4c8f9400358c","sourceTree":"cb1e21f4afd4a117f226559e017ac874ed8b7cb7","absentOptional":[]} -->
