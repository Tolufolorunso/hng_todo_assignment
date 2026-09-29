# Feature: Offline-first PWA

**From build-plan:** feature 7
**Build attempt:** 1
**Status:** verified
**Branch:** feature/offline-first-pwa

## Goal

Make the app installable and usable offline after a first visit: a web manifest
with icons, a versioned service worker that caches the app shell and static
assets, and an offline indicator in the header. Everything the app needs is
already client-side, so the only missing piece is the shell caching that lets a
reload succeed with no network.

## Design reference

The theme is locked and ported (`app/globals.css`, light plus
`prefers-color-scheme` dark), and the consumed `prototypes/` folder is gone. The
offline indicator reuses the token vocabulary and mirrors the "Offline" pill
sketched in the earlier proto, which was never built. No new visual language.

## In scope

- A web manifest served at `/manifest.webmanifest` with name, short name, start
  URL, standalone display, theme/background colors, and icons.
- App icons: 192 and 512 regular plus a 512 maskable, and an Apple touch icon.
- A versioned service worker at `/sw.js`: network-first for navigations,
  cache-first for static build assets, network-first for other same-origin GETs,
  with old-cache cleanup on activation.
- Production-only registration of the service worker.
- An offline indicator in the shared header.

## Out of scope

- Any change to the task or note data layers, the schema, or the UI beyond the
  header indicator. All data is already in IndexedDB.
- A build-time precache list of hashed chunks. This feature uses runtime caching,
  which does not need to know Next.js hashed filenames.
- Background sync, push notifications, periodic sync, or an install prompt UI.
- Offline write queuing. IndexedDB writes already work offline.
- A custom offline fallback page beyond the cached app shell.
- Branding and the final product name (Feature 8). The manifest uses the working
  name "TaskFlow".
- Any new runtime or dev dependency. The service worker is hand written in plain
  JavaScript; no PWA plugin is installed.

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present
  one feature-level review packet with the full diff and each step's evidence.
- `workflow.checkpointCommits` is `disabled`, so no checkpoint commits are offered.
- A read-only walkthrough of the finished code is available after the packet.
- `/complete` creates the single feature commit.

## Build steps

- [x] 1. **Icons and manifest.** Generate the icon PNGs and commit them under
  `public/icons/`: `icon-192.png`, `icon-512.png`, and `maskable-512.png`, plus an
  `app/apple-icon.png` (180px). The mark is a check on the accent token color.
  Add `app/manifest.ts` (Next.js metadata route) returning a manifest with
  `name` "TaskFlow", `short_name` "TaskFlow", a description, `start_url` "/",
  `display` "standalone", `background_color` and `theme_color` matching the token
  values, and the three icons with correct `sizes`, `type`, and `purpose`
  (`"any"` for the two, `"maskable"` for the maskable one). In `app/layout.tsx`
  add the `viewport` export with the theme color so the browser chrome matches.
  **Done when:** `npm run build` passes; on the running server
  `/manifest.webmanifest` returns the expected JSON fields, each icon URL returns
  200 with an image content type, and the rendered HTML links the manifest.

- [x] 2. **Versioned service worker.** Add `public/sw.js`, plain JavaScript, with
  a versioned cache constant (for example `taskflow-v1`). On `install`, skip
  waiting. On `activate`, delete every cache whose name is not the current one and
  claim clients. On `fetch`, handle only same-origin GETs: navigations
  (`request.mode === "navigate"`) are network-first and fall back to the cached
  response or the cached `/`; requests under `/_next/static/` and static file
  extensions are cache-first; every other same-origin GET is network-first with a
  cache fallback. Cache successful responses as they pass through.
  **Done when:** `npm run build` passes and `node --check public/sw.js` reports no
  syntax error.

- [x] 3. **Register the worker in production.** Add
  `components/app/ServiceWorkerRegistrar.tsx`, a client component that registers
  `/sw.js` only when `process.env.NODE_ENV === "production"` and
  `"serviceWorker" in navigator`, wrapped so a registration failure is caught and
  logged, never thrown. Render it from `app/layout.tsx`. Registration stays off in
  development so the dev server is never behind a cache.
  **Done when:** against a production server (`npm run build` then
  `npm run start` on a non-default port), the page ends up with a controller
  (`navigator.serviceWorker.controller` is non-null after reload) and
  `navigator.serviceWorker.getRegistration()` resolves; on the dev server there is
  no registration.

- [x] 4. **Offline indicator.** Add `components/app/OfflineIndicator.tsx`, a client
  component that reads `navigator.onLine`, subscribes to the window `online` and
  `offline` events, and renders a small labeled pill in the header: a muted
  "Offline" state when the browser is offline and nothing (or a quiet online
  state) otherwise. It must not cause a hydration mismatch: render a stable
  neutral state on the server and update after mount. Render it in
  `components/app/AppHeader.tsx`.
  **Done when:** `npm run build` passes; in the browser, emulating offline shows
  the Offline pill and emulating online removes it, the pill is keyboard and
  screen-reader friendly (not color-only), and the console shows no hydration
  warning.

- [x] 5. **Offline-after-first-load evidence.** With the production server, load
  the app online once, then switch the browser to offline and reload. No code
  change is expected in this step; it is the feature's headline done-when and is
  recorded as verification evidence.
  **Done when:** with the network emulated offline and after a prior online load,
  reloading `/` renders the Tasks screen from the cache (not the browser's offline
  error page), the offline indicator is visible, and creating and completing a
  task still works because it is IndexedDB-backed.

## Files / areas

- `app/manifest.ts` - new: the web manifest metadata route
- `app/layout.tsx` - render the registrar; add the `viewport` export
- `app/apple-icon.png` - new: Apple touch icon
- `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` - new: manifest icons
- `public/sw.js` - new: the versioned service worker
- `components/app/ServiceWorkerRegistrar.tsx` - new: production-only registration
- `components/app/OfflineIndicator.tsx` - new: the header offline pill
- `components/app/AppHeader.tsx` - render the indicator

No route is added, no dependency is installed, and no data-layer file changes.
The dev server behavior and the task and note screens are otherwise unchanged.

## Data / contracts

No storage change. The service worker caches HTTP responses only; tasks and notes
remain in IndexedDB, which already works offline.

**Manifest contract** (`app/manifest.ts`, served at `/manifest.webmanifest`):
- `name` / `short_name`: "TaskFlow" (working name; Feature 8 may rename).
- `start_url`: `/`, `display`: `standalone`, `scope`: `/`.
- `background_color` and `theme_color` use the token values, so the manifest and
  the app agree on color.
- `icons`: `icon-192.png` (`192x192`, `image/png`, purpose `any`),
  `icon-512.png` (`512x512`, `image/png`, purpose `any`), and `maskable-512.png`
  (`512x512`, `image/png`, purpose `maskable`).

**Service worker contract** (`public/sw.js`):
- One versioned cache name; bumping it is how a new build replaces the old cache.
- `install`: skip waiting so an updated worker activates promptly.
- `activate`: delete non-current caches, then claim clients.
- `fetch`: same-origin GET only, split three ways:
  - navigate: network-first, fall back to the exact cached request, then to
    cached `/`.
  - static (`/_next/static/` or a static file extension): cache-first, filling the
    cache on a miss.
  - other GET: network-first with cache fallback, so client data stays fresh online
    while the shell still resolves offline.
- Only successful responses are cached. Errors fall through to the network.

**Registration contract** (`ServiceWorkerRegistrar`):
- Production only (`NODE_ENV === "production"`), and only when the browser exposes
  `serviceWorker`.
- Failures are caught and logged, never surfaced as an unhandled rejection.

**Indicator contract** (`OfflineIndicator`):
- Uses `navigator.onLine` plus `online`/`offline` events.
- Renders a stable state on the server and reconciles after mount, so there is no
  hydration mismatch.
- The offline state is carried by a word and a dot, not color alone.

**Required states:**
- online (default) and offline in the header; both readable in light and dark.
- no service worker registered in development.
- a first-visit online load caches the shell; a later offline reload serves it.

## Testing

- Command: `npm run test` (Vitest) and `npm run build`. The runner and build are
  the existing declared commands; no runner is added.
- This feature adds no pure, unit-testable logic. Its behavior is browser-only
  (service worker lifecycle, manifest, `navigator.onLine`), and the standards say
  to verify UI and integration surfaces with browser evidence and the build, not
  brittle unit tests. The existing suite (4 files, 103 tests) must stay green and
  is unchanged.
- There is no `Browser tests` command, so no browser runner is added and no
  harness coverage is claimed. Evidence is the build, the declared test suite, and
  direct browser verification against a production server over the DevTools
  protocol: manifest fields and icon responses, service worker registration and
  controller, cache names, the offline indicator under emulated offline, and the
  offline-after-first-load reload (step 5).
- Accessibility to verify manually: the offline indicator is announced, not
  color-only, and readable in both themes.

## Notes for the AI

- Keep the service worker plain JavaScript in `public/`; do not add a PWA plugin.
  Next.js serves `public/` files at the root, so `public/sw.js` is `/sw.js`.
- Do not precache hashed build chunks by name; runtime caching is the point.
- Register in production only. Never leave the dev server behind a service worker.
- The indicator must avoid a hydration mismatch; do not read `navigator.onLine`
  during the initial render.
- Use the `@/*` alias and TypeScript strict; no `any`. No inline styles.
- Use `next start` on a spare port for production verification; do not disturb the
  running dev server.
- No em dashes in code, comments, or docs.

## Open questions

- **Production-only registration** is recorded as the decision, so the dev server
  is never cached. If you would rather register in development too, say so.
- The manifest uses the working name "TaskFlow"; Feature 8 owns the final name and
  would update it in one place.
- Icons are generated as flat-color PNGs from the accent token. If you want a
  specific logo, provide an image and I will rebuild them from it.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":11144,"specSha256":"8077cc25667c7a05c5e9131f7da61f0d4852ecab4a0e20a18bc13c1bfba86a73","branch":"refs/heads/feature/offline-first-pwa","head":"d3db08ef8592b82fd176ad8f1c5022b1cdc378b5","baseRef":"refs/heads/main","baseCommit":"d3db08ef8592b82fd176ad8f1c5022b1cdc378b5","sourceTree":"aa1049c349a23bdf52ae83f446069b915465ab81","absentOptional":[]} -->
