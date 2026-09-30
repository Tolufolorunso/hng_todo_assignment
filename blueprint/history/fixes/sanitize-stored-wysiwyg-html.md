# Fix: Sanitize stored WYSIWYG HTML in task descriptions and note bodies

**Type:** Fix
**Status:** verified
**Branch:** fix/sanitize-stored-wysiwyg-html
**Fixes:** F-04

## The problem

In `components/tasks/TaskItem.tsx:273`, `components/calendar/DayInspector.tsx:194`, and `components/notes/StandaloneNoteView.tsx:346`, task descriptions and note bodies are injected into the DOM via `dangerouslySetInnerHTML`.

Neither `lib/validation.ts` nor `lib/backup.ts` sanitizes rich text markup (they only check string lengths and object shapes). While the browser-based WYSIWYG editor does not provide direct script authoring tools, the backup restore route in `lib/backup.ts:restoreDatabaseBackup` is a cross-origin trust boundary: any imported `.json` backup file can contain stored HTML with `<script>` tags, `<iframe>` elements, `<img src="x" onerror="...">` handlers, or `javascript:` links that execute script in the origin when rendered. In addition, `vercel.json` does not configure a Content Security Policy (CSP) header for defense in depth.

## The fix

1. In `lib/html.ts`:
   - Implement an inline `sanitizeHtml(rawHtml: string): string` function:
     - Whitelists only safe formatting tags produced by the editor: `p`, `div`, `span`, `br`, `hr`, `h1`, `h2`, `h3`, `b`, `strong`, `i`, `em`, `u`, `s`, `strike`, `del`, `blockquote`, `ul`, `ol`, `li`, `code`, `pre`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `font`, `a`, `sub`, `sup`.
     - Completely strips dangerous elements and their enclosed contents: `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<button>`, `<input>`, `<textarea>`, `<select>`, `<base>`, `<meta>`, `<link>`.
     - Strips all `on*` event handler attributes (`onerror`, `onload`, `onclick`, `onmouseover`, etc.).
     - Validates attributes on allowed tags:
       - On `<a>`: allow only safe `href` (`http:`, `https:`, `mailto:`, or relative `/`), and ensure `target="_blank"` includes `rel="noopener noreferrer"`; strip `javascript:`, `data:`, or `vbscript:` protocols.
       - On `<span>` and `<font>`: allow safe CSS in `style` attributes (whitelisting `color`, `background-color`, `text-align`, `font-size`) while discarding expressions, `url()`, and script escapes.
       - Discard `src` attributes on arbitrary tags and reject unknown dangerous attributes.
2. In `lib/validation.ts`:
   - Run `sanitizeHtml` on `description` in `validateTaskInput` and `validateTaskPatch`.
   - Run `sanitizeHtml` on `body` in `validateNoteInput` and `validateNotePatch`.
3. In `lib/backup.ts`:
   - In `restoreDatabaseBackup`, sanitize every `task.description` and `note.body` before writing into IndexedDB.
4. In `vercel.json`:
   - Add a Content-Security-Policy (CSP) header allowing self-origin resources, inline theme script, and safe fonts/images while denying frames and objects (`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`).
5. In `lib/html.test.ts`, `lib/validation.test.ts`, and `lib/backup.test.ts`:
   - Add unit tests verifying that XSS payloads (scripts, event handlers, javascript URIs, iframes) are neutralized, while safe WYSIWYG formatting (headings, lists, bold, colors) is preserved.

## Build steps

1. [x] **Implement `sanitizeHtml` in `lib/html.ts` and add tests in `lib/html.test.ts`**
   - Add `sanitizeHtml` whitelist-based sanitizer stripping active content and unsafe attributes.
   - Add unit tests covering XSS vectors (script tags, event handlers, javascript: URIs) and safe rich-text markup preservation.
   - Done when: `sanitizeHtml` strips active executable content while preserving clean formatting, verified by unit tests.

2. [x] **Integrate sanitization into `lib/validation.ts` and `lib/backup.ts`**
   - Sanitize task description and note body on validation and on backup restore.
   - Add unit tests in `lib/validation.test.ts` and `lib/backup.test.ts` verifying sanitization on save and import.
   - Done when: Tasks and notes saved via validators or restored via backup import have their HTML sanitized before persistence.

3. [x] **Add Content-Security-Policy to `vercel.json` and run full verification suite**
   - Add CSP header configuration in `vercel.json`.
   - Run `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: CSP header is configured, all unit tests pass, zero lint warnings, and production build succeeds.

## Verify

1. Run `npm run test` to verify all sanitization and security tests pass.
2. Simulate importing a backup containing `<img src=x onerror="alert(1)">` and `<script>alert(2)</script>`: verify the imported task description and note body have script tags removed and event handlers stripped.
3. Edit a task with valid bold, italic, and colored text: verify formatting renders correctly without regression.
4. Run `npm run build` and `npm run lint` to verify clean build and lint status.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5024,"specSha256":"f3eeee4467b42a2ff34c504e1d948287b3ac9d0917a727a887beaaaf37064248","branch":"refs/heads/fix/sanitize-stored-wysiwyg-html","head":"90675209f2dbe96173f36d6c5db3d34c249d5e6e","baseRef":"refs/heads/main","baseCommit":"90675209f2dbe96173f36d6c5db3d34c249d5e6e","sourceTree":"65c0c3425a4b4392ea48f997f045b363c60d8895","absentOptional":[]} -->
