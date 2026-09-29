# Feature: Deployment readiness and live URL

**From build-plan:** feature 8
**Build attempt:** 1
**Status:** verified
**Branch:** feature/deployment-readiness-and-live-url

## Goal

Make the app ready to ship and document it for a real visitor: replace the
scaffold metadata and boilerplate README with the real product, verify the
production build and a local production run end to end, and record the exact
deploy and smoke-test path. The build-plan item also names confirming the public
URL; by your decision that confirmation is a follow-up you perform after
deploying, so this feature delivers and proves readiness and hands over the
deploy steps.

## In scope

- Real page metadata: title and description, replacing the `Create Next App`
  scaffold defaults, consistent with the manifest name.
- A real project README replacing the create-next-app boilerplate.
- A local production smoke test of both screens and the PWA surface.
- Documenting the deploy path (Vercel zero-config), the health path, and the
  operational note about bumping the service worker cache version on shell
  changes.

## Out of scope

- **Performing the deploy.** No Vercel CLI or token is available here, and the
  plan states deployment is a manual, confirmed step. You deploy through the
  Vercel dashboard; smoke-testing the resulting public URL is a follow-up.
- **A `vercel.json`.** You chose zero-config: the plan and overview both state
  Vercel auto-detects Next.js and needs no special config. Recorded as a decision.
- **Renaming the product.** "TaskFlow" is the working title used consistently in
  the manifest and metadata; a final rename is a separate, trivial change.
- Any change to the data layer, schema, service worker caching behavior, or app
  feature code. This feature adds no dependency and no route.
- Release automation or CI. `/ci` and `/release` own those.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present
  one feature-level review packet with the full diff and each step's evidence.
- `workflow.checkpointCommits` is `disabled`, so no checkpoint commits are offered.
- A read-only walkthrough of the finished code is available after the packet.
- `/complete` creates the single feature commit.

## Build steps

- [x] 1. **Real page metadata.** In `app/layout.tsx` replace the scaffold title and
  description with the product's: a title of "TaskFlow" (matching the manifest
  `name`) and a description drawn from the overview's one-liner about a
  single-user, offline-capable task and notes app that keeps data in the browser.
  Change nothing else about the layout.
  **Done when:** `npm run build` passes; on the running server the rendered HTML
  `<title>` is "TaskFlow" and the meta description is the product description, not
  the `Create Next App` text.

- [x] 2. **Real README.** Replace the boilerplate `README.md` with a project
  README that covers: what the app is and who it is for; the feature set mapped to
  the assignment's mandatory items (task CRUD and complete, notes CRUD, and the
  additional features) so a reviewer can check each from the live URL; the stack;
  where data lives and the privacy and no-backup caveat; local development
  commands (`dev`, `build`, `start`, `test`, `lint`); the PWA and offline behavior
  including the note that a shell change needs a service worker cache version
  bump; and deployment to Vercel with the zero-config note and the health path.
  Write it as the project's own documentation, not a copy of the Next.js docs.
  **Done when:** `README.md` describes this project with no leftover create-next-app
  text, the listed commands match `package.json` exactly, and every rubric feature
  it claims exists in the app.

- [x] 3. **Deployment readiness and local production smoke test.** Confirm the
  deployable surface with no code change beyond steps 1 and 2: run the production
  build, start it with `npm run start` on a spare port, and exercise the app the
  way a visitor would, recording each result. Confirm there are no required
  environment variables and no server-side storage, and that `/` is a valid health
  path. Stop the production server once the smoke test finishes and leave the
  running dev server untouched.
  **Done when:** against the production server, `/` and `/notes` both render; a
  task can be created, completed, edited (priority and due date), searched,
  filtered, and deleted; a note can be created, edited, searched, and deleted; the
  manifest and both icons return 200; the service worker registers and caches the
  shell; an offline reload after a first online load still renders; and the
  process is stopped afterward with the local dev server left untouched.

## Files / areas

- `app/layout.tsx` - real title and description
- `README.md` - full replacement

No other file changes. No `vercel.json`, no new route, no dependency, and no
change to `public/sw.js`, the manifest, or any feature component.

## Data / contracts

No storage or schema change. The app remains entirely client-side.

**Metadata contract** (`app/layout.tsx`):
- `title`: "TaskFlow", matching `app/manifest.ts` `name` and `short_name`.
- `description`: the product summary used in the overview, so the page and the
  PWA describe the same thing.
- The existing `viewport.themeColor` and the manifest stay as they are.

**Deployment contract** (documented, not configured):
- Host Vercel, deployed from the GitHub repository, producing a public
  `*.vercel.app` URL.
- Zero-config: Vercel detects Next.js; no `vercel.json` is added and none is
  needed. This is the recorded decision, consistent with the plan and overview.
- No environment variables and no server-side storage; data is per-browser
  IndexedDB.
- Build `npm run build`, output `.next`, start `npm run start`.
- Health path `/` (the shell renders and the client mounts).

**README contract:**
- States what the app is, the mandatory rubric features and how to verify each,
  the stack, the data and privacy caveat, the local commands, the PWA behavior
  with the cache-bump note, and the deploy path.
- All commands match `package.json`; every claimed feature exists.

**Live URL (handed off, not performed):** after you deploy, the same smoke test
in step 3 run against the public URL is what confirms the live deliverable. This
feature records readiness and the exact steps; it does not and cannot claim the
live URL works.

## Testing

- Commands: `npm run build` and `npm run test`. Both are the existing declared
  commands; no runner is added.
- This feature adds no logic, so it adds no unit tests. The change is metadata,
  documentation, and verification. The existing suite (4 files, 103 tests) must
  stay green and is unchanged.
- Evidence is the production build, the green suite, and a local production smoke
  test of both screens and the PWA surface over the DevTools protocol. There is no
  `Browser tests` command, so no runner is added. No live-URL, Vercel, or DNS
  claim is made, because no deploy happens here.

## Notes for the AI

- Keep the change minimal: metadata plus README plus verification. Do not refactor
  app code, add configuration, or touch the service worker.
- Use `next start` on a spare port (not 3000) so the running dev server is
  untouched, and stop that server when the smoke test finishes.
- Do not add AI attribution to the README or anywhere else.
- Do not claim the live URL, deployment, or any unrun check.
- No em dashes in code, comments, or docs. This includes the README.

## Open questions

- **The product name** remains a working title, "TaskFlow", now used in the
  manifest and page metadata. A final rename would touch `app/manifest.ts` and
  `app/layout.tsx` in one small change.
- **The live URL** is the one rubric item this feature cannot itself prove; your
  deploy is the confirming step, and the step 3 smoke test run against the public
  URL is the proof.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":7930,"specSha256":"6dc3e4c1b7ed32268e5043de9c2fc925f08befc79666ce0ee73789755b6274a4","branch":"refs/heads/feature/deployment-readiness-and-live-url","head":"c5645600b641b59fbc538382a8c9f7fec3254933","baseRef":"refs/heads/main","baseCommit":"c5645600b641b59fbc538382a8c9f7fec3254933","sourceTree":"72b25df3a33bb5ae9a238f2211534e03d41fe07b","absentOptional":[]} -->
