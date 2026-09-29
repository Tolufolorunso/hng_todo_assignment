# TaskFlow

A single-user, offline-capable task and notes app. No sign-up, no server, no
account: everything you create lives in your own browser, in IndexedDB.

It targets the middle ground between a bare checklist and a heavyweight project
tool: a fast task list that also holds free-form notes and gives tasks just
enough structure (a priority and a due date) to be useful.

## Features

Mandatory items from the assignment brief:

- **Task management** - create a task by title, view the list, edit a task's title
  and description, mark it complete, and delete it with an inline confirmation.
- **Notes** - a standalone notes section with full create, edit, and delete, plus
  search across note titles and bodies. Notes are independent of tasks.
- **Additional features** - search, filter, and sort for tasks; priorities and due
  dates with overdue highlighting; and an installable, offline-first PWA.

How to verify each from the live URL:

| Rubric item | What to do |
| --- | --- |
| Create a task | Type in **Add a task** on the Tasks screen and submit |
| View tasks | The list renders every stored task |
| Edit a task | Click the pencil on a row; change title, description, priority, or due date; Save |
| Complete a task | Toggle the checkbox; the row strikes through |
| Delete a task | Click the trash, confirm, and the row disappears |
| Notes CRUD | Open **Notes**, create, edit, search, and delete notes |
| Search tasks | Use the search box in the sticky control bar |
| Filter and sort | Use the All / Active / Completed control and the sort select |
| Priorities and due dates | Set them in the edit form; badges and an overdue chip appear on the row |
| Offline | Load once online, then reload with the network off; the app still renders |
| Install as an app | The browser offers install from the manifest and icons |

## Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** in strict mode
- **Tailwind CSS v4**, configured from CSS in `app/globals.css` (`@import` plus
  `@theme`); there is no `tailwind.config.*`
- **IndexedDB** via `idb` for storage, wrapped in a small typed repository
- **Vitest** with `fake-indexeddb` for unit tests
- A hand-written **service worker** and web manifest for offline and install
- **npm** as the package manager

There is no backend, no API routes, no remote database, and no auth.

## How it works

The entire app is client-side. Tasks and notes are stored in IndexedDB in two
object stores, `tasks` and `notes`. The repositories in `lib/tasks.ts` and
`lib/notes.ts` are the single source of truth; after every successful mutation the
screen reloads from them rather than patching state optimistically. Search,
filter, sort, and overdue status are derived in memory and never stored.

## Your data and privacy

Everything stays on your device.

- No server means nothing is uploaded, and there is no account to sign into.
- Nothing leaves the browser: no analytics, no telemetry, no third-party calls.
- Data is **not backed up**. Clearing your browser's site data, or switching
  browser or device, starts you with an empty app. There is no sync.

## Local development

```bash
npm run dev     # dev server at http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run test    # unit tests (Vitest)
npm run lint    # ESLint
```

Run `npm run build` and `npm run start` to exercise the app as a visitor will,
including the service worker, which registers in production only.

## Offline and install

A versioned service worker caches the app shell so the app works offline after a
first load. Navigations are network-first, static build assets are cache-first,
and the data itself is already local in IndexedDB.

The cache name is versioned in `public/sw.js`. **When you change the app shell,
bump that version constant**, or returning visitors may keep the previous shell.
The header shows an offline indicator when the browser has no network.

## Deployment

Deployed to Vercel from this GitHub repository and served at a public
`*.vercel.app` URL.

- Vercel detects Next.js automatically, so there is **no `vercel.json`** and no
  special build configuration.
- **No environment variables** are required.
- **No server-side storage**: all data is per-browser IndexedDB.
- Build is `npm run build`; the health path is `/` (the shell renders and the
  client mounts).

To deploy: import the repository at vercel.com, accept the detected Next.js
settings, and deploy. Then smoke-test the main flows from the live URL.
