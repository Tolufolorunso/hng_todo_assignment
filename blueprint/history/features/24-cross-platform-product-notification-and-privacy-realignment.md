# Feature: Cross-platform product, notification, and privacy realignment

**From build-plan:** feature 24
**Build attempt:** 1
**Branch:** feature/cross-platform-product-notification-and-privacy-realignment
**Status:** verified

## Goal

Document TaskFlow's cross-platform architecture, privacy model, notification limitations, platform support policy, and explicit non-goals across both developer repository documentation and a user-facing in-app privacy and architecture notice. This aligns the project for the upcoming differentiated features (Follow Up, Plan My Day, Actionable Notes, Fast Capture) and cross-platform native clients.

## In scope

- Repository documentation updates:
  - Update `README.md` to reflect TaskFlow's evolution into a personal productivity suite across Web, Android/iOS, and Windows with optional synchronization.
  - Create `docs/product-alignment.md` detailing the three independently maintained clients, optional account model, local-only vs. synchronized privacy, Follow Up contact handling, notification limitations, platform support policy, and explicit non-goals.
- In-app privacy and architecture notice:
  - Add `app/privacy/page.tsx` as an accessible Server Component that explains local-first storage, the absence of cloud uploads in local-only mode, the lack of end-to-end encryption in synchronized cloud mode, communication launcher mechanics, notification delivery realities, and platform support.
  - Add SEO metadata and Open Graph attributes for `/privacy`.
  - Add `/privacy` to `app/sitemap.ts`.
  - Add a "Privacy & Architecture" link in `components/app/AppFooter.tsx` so users can access the notice from any screen.
- Verification and testing:
  - Add unit test coverage in `lib/privacy.test.ts` to assert privacy constants, route availability in sitemap, and security disclosures.
  - Verify that `npm run test`, `npm run lint`, and `npm run build` pass cleanly.

## Out of scope

- Moving the Next.js app to `apps/web` or creating `apps/mobile` / `apps/windows` (reserved for Feature 29).
- Building the backend `/api/v1` Route Handlers, database schema, or authentication (reserved for Features 30-33).
- Implementing Follow Up commitments or recurrence logic (reserved for Feature 25).
- Third-party analytics, tracking libraries, or external privacy policy hosting services.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. **Repository documentation alignment** - Update `README.md` and create `docs/product-alignment.md` to document the three independently maintained clients (Web, React Native, C# WPF), optional accounts, local-only vs. synchronized privacy, Follow Up contact data privacy and URI launchers, notification delivery limitations, platform support policies, and explicit non-goals.
  **Done when:** `README.md` and `docs/product-alignment.md` are present, accurate, free of em dashes, and describe all seven pillars from the build-plan packet.
- [x] 2. **In-app privacy and architecture notice page (`/privacy`)** - Create `app/privacy/page.tsx` as a responsive Server Component that presents the privacy model, local-only guarantees, cloud synchronization disclosures (no E2EE notice), launcher safety, notification realities, and non-goals using the TaskFlow theme.
  **Done when:** Navigating to `/privacy` renders the complete privacy notice with accessible semantic sections, clear typography, and responsive styling.
- [x] 3. **Site-wide footer link and sitemap discovery** - Update `components/app/AppFooter.tsx` to include an accessible link to `/privacy` alongside the existing brand and developer attribution, and update `app/sitemap.ts` to include the `/privacy` route.
  **Done when:** The Privacy & Architecture link appears in `AppFooter`, clicks successfully navigate to `/privacy`, and `app/sitemap.ts` includes the route.
- [x] 4. **Testing and quality gate verification** - Add `lib/privacy.test.ts` to verify privacy metadata and sitemap inclusion, then run `npm run test`, `npm run lint`, and `npm run build`.
  **Done when:** All unit tests pass, linter reports no errors or warnings, and the production build completes with exit code 0.

## Files / areas

- `README.md` - updated project introduction, cross-platform overview, privacy, and non-goals.
- `docs/product-alignment.md` - detailed cross-platform architectural specification and privacy disclosure.
- `app/privacy/page.tsx` - user-facing privacy and architecture notice route.
- `components/app/AppFooter.tsx` - addition of Privacy & Architecture link.
- `app/sitemap.ts` - addition of `/privacy` route to sitemap entries.
- `lib/privacy.test.ts` - test assertions for privacy disclosures and sitemap entries.

## Data / contracts

- No schema migrations or IndexedDB store changes.
- Route contract: `/privacy` serves `text/html` with `200 OK` status and canonical metadata.
- Privacy disclosures contract:
  - Local-only mode: 100% of tasks, notes, follow-ups, and settings remain on-device; no data is uploaded.
  - Synchronized mode: account data synchronizes over HTTPS to PostgreSQL without end-to-end encryption.
  - Communication launchers: external email, WhatsApp, and telephone URIs are user-initiated and do not verify delivery or autonomously send messages.
  - Notification limitations: local reminders are scheduled directly by native operating systems; web closed-app push requires accounts and network; delivery is best-effort.

## Testing

- Unit tests in `lib/privacy.test.ts` asserting metadata and sitemap integrity.
- Verification command: `npm run test` (Vitest).
- Static analysis: `npm run lint` (ESLint).
- Build compilation: `npm run build` (Next.js).

## Notes for the AI

- Adhere to the strict writing standards: no em dashes (U+2014), en dashes (U+2015), or ellipsis characters. Use hyphens, colons, or commas.
- Keep `app/privacy/page.tsx` as a Server Component without `'use client'`.
- Match the existing color palette: `bg`, `surface`, `border`, `text`, `muted`, `faint`, and `accent`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6228,"specSha256":"c771a41853d72e4e689f5a496ad5d68c4bb3d3a69f29cdad98c6e02e2bb62c98","branch":"refs/heads/feature/cross-platform-product-notification-and-privacy-realignment","head":"0c33e1813bfe0ff79177c61b8555d496fdfba4b6","baseRef":"refs/heads/main","baseCommit":"0c33e1813bfe0ff79177c61b8555d496fdfba4b6","sourceTree":"1e06047a7cb2b8ecd6a5090d67c2845b522968d9","absentOptional":[]} -->
