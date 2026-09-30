# TaskFlow - Project Overview

<!-- blueprint:source-hash 31705689240fb39bda4ef6ac17188c2fb860475aaeb7211c0c79854fee279291 -->

> A single-user, offline-capable productivity suite with tasks, notes, interactive calendar, and analytics; all data lives in the browser.

## Problem

The HNG assignment requires a working To-Do application with full task management,
a notes feature, and at least one additional feature, using a browser database,
built entirely with AI, and deployed to a public URL. The product problem behind
it: people lose track of small tasks and the context around them, while existing
tools force a choice between a bare checklist and a heavyweight project tool. This
app bridges that gap with a fast, offline-capable productivity suite featuring
tasks, notes, interactive scheduling, and productivity analytics.

Milestone E elevates the experience into a widescreen, multi-page desktop
workspace with a modern SaaS aesthetic (Linear and Raycast style), drag-and-drop
reordering, curated categories, calendar scheduling, and data portability.

Milestone F adds theme toggle controls (dark mode default with light mode option),
bespoke TaskFlow vector branding, clean starter asset pruning, a site-wide footer
with an interactive developer showcase modal (honoring Tolulope Folorunso), and a
Microsoft Word-style WYSIWYG rich text notes editor.

Milestone G brings Microsoft Word-style rich text formatting to task descriptions,
adds a dedicated distraction-free standalone note reader route (`/notes/[id]`), and
delivers complete production SEO, Open Graph preview metadata, and Vercel deployment
configuration.

Milestone H delivers an ergonomic mobile-first app navigation experience and a
fixed bottom dock: a streamlined mobile top bar (<640px) eliminating tab overflow,
a dedicated thumb-friendly bottom navigation tab bar on mobile viewports, and a
pinned glassmorphic bottom dock footer across all pages with dedicated page scroll
clearance.

## Users

- **Individual on one device** - manages personal tasks, notes, and schedules;
  wants speed, zero sign-up, offline availability, and an attractive desktop
  workspace.
- **Assignment reviewer** - must confirm every mandated rubric item and
  experience a high-scoring, feature-complete product from the live URL.
- **Not for** - teams, shared lists, or cross-device cloud sync. There are no
  accounts, so a user is whoever opened this browser profile.

## Usage model

- **Scale:** one browser profile, estimated up to several thousand tasks and
  notes; all filtering, sorting, and aggregations run in-memory.
- **Reachability:** internet-facing app with no server, so no server-side input,
  secret, or remote data store is reachable by anyone else.
- **Trust:** single trusted actor (the user). Untrusted text inputs are strictly
  validated client-side (non-empty titles, length limits, valid ISO dates, and safe
  JSON import validation).
- **Data ownership:** data is confined to the browser. While clearing site data
  resets the app, data loss is mitigated by the JSON export/backup feature.
- **Privacy:** 100% private; nothing leaves the device (no analytics, telemetry,
  or third-party network calls).
- **Non-requirements:** no auth, no multi-tenancy, no compliance regime, no
  availability SLA, no audit logging, no server API, no cloud database.

## Features

Built in this order (from `build-plan.md`). Headline: task management with
advanced productivity tools.

1. **Task data layer and persistence** - typed repository over IndexedDB (`idb`):
   schema v1 with `tasks` and `notes` stores, indexes, and task CRUD.
2. **Task list: create, view, and complete** - first user-visible slice: render
   stored tasks, add by title, toggle complete, empty state.
3. **Edit and delete tasks** - edit title and description; delete with
   confirmation.
4. **Notes** - standalone notes section: list, create, edit, delete (title +
   body), with search across notes.
5. **Due dates and priorities** - task `dueDate` and `priority` (low/medium/high),
   controls to set them, overdue highlighting, priority styling.
6. **Search, filter, and sort for tasks** - sticky control bar: text search, status
   filter (all / active / completed), sort by due date, priority, or creation date.
7. **Offline-first PWA** - web manifest, icons, versioned service worker so the app
   installs and works offline after first load, with an offline indicator.
8. **Deployment readiness and live URL** - production build verified, real README,
   Vercel config, public URL confirmed and smoke-tested.
9. **Modern SaaS design system and widescreen desktop layout** - revamp theme
   tokens, typography, elevated card surfaces, and introduce the responsive 2-column
   desktop workspace (`max-w-6xl`) with the updated 4-page navigation header.
10. **Drag-and-drop task reordering and custom positioning** - native HTML5
    drag-and-drop reordering with visual grab handles and drop indicators, persisting
    an `order` index to IndexedDB.
11. **Curated task categories and category filtering** - schema v2 upgrade
    adding `category` (Work, Personal, Urgent, Study, Ideas), category pill badges,
    and category filter controls.
12. **Calendar and schedule view (`/calendar`)** - interactive monthly calendar
    grid mapping tasks to due dates, with overdue highlights and date-based task
    inspection.
13. **Analytics and productivity insights (`/analytics`)** - dedicated metrics
    page showing task completion rate, category distribution breakdowns, priority
    splits, and productivity stats.
14. **Data backup and restore** - timestamped JSON export and validated JSON
    import to ensure offline data durability.
15. **Theme toggle: dark mode default with light mode option** - obsidian dark
    mode by default, sun/moon toggle beside the Data button in the header, inline
    anti-flash script, and localStorage persistence.
16. **TaskFlow vector branding and Next.js starter asset cleanup** - bespoke SVG
    brand logo placed before "TaskFlow" in the header and set as browser favicon,
    removing unused boilerplate Next.js SVG files from `public/`.
17. **Site-wide footer and interactive developer showcase modal** - responsive
    footer across all pages with creator attribution and a dedicated modal
    highlighting Tolulope Folorunso (AI Product Engineer, HNG Intern) with social
    links and bio.
18. **Microsoft Word-style WYSIWYG rich text notes editor** - rich text
    formatting ribbon (bold, italic, underline, strikethrough, alignment, text
    color, highlight, font size, headings, lists, icons, super/subscript) saving
    clean HTML with tag-free excerpts in the note list.
19. **Microsoft Word-style rich text formatting for task descriptions** - integrate
    the formatting ribbon into task creation and editing, expanding description limits,
    rendering rich HTML in task view, and extracting clean excerpts in task cards.
20. **Standalone note document reader (`/notes/[id]`)** - dedicated distraction-free
    reading route for notes with document typography, word count, reading time,
    print/PDF export, and quick-launch links from the note list.
21. **Search engine optimization (SEO), Open Graph & Vercel deployment** - full
    page-level metadata, Open Graph and Twitter preview cards, JSON-LD structured
    data, dynamic sitemap and robots.txt, and vercel.json deployment configuration.
22. **Professional mobile header and responsive bottom navigation tab bar** - streamline
    top header on mobile (<640px) to brand and utility actions, introducing a fixed
    thumb-friendly bottom navigation bar for Tasks, Notes, Calendar, and Analytics.
23. **Fixed bottom dock footer and page scroll clearance** - pin the site-wide
    footer to the bottom of the viewport with glassmorphic backdrop blur and responsive
    layout, ensuring proper bottom scroll padding across all pages so content never
    clips behind the dock.

## Data model

Everything is stored client-side in IndexedDB through `idb`. No server database.
Two object stores, upgraded to schema version 2 in an `upgrade` handler so
existing version 1 databases migrate without data loss.

### Task (Schema Version 2)

- `id` (string) - uuid, primary key
- `title` (string) - required
- `description` (string) - optional, stores formatted HTML produced by the WYSIWYG editor (up to 20,000 characters)
- `completed` (boolean)
- `priority` (`"low" | "medium" | "high"`)
- `dueDate` (string | null) - ISO date, date-only
- `category` (`"work" | "personal" | "urgent" | "study" | "ideas" | null`)
- `order` (number) - for drag-and-drop custom sequence
- `createdAt`, `updatedAt` (string) - ISO datetime
- `completedAt` (string | null) - ISO datetime

Indexed on `dueDate`, `updatedAt`, and `category`.

### Note

- `id` (string) - uuid, primary key
- `title` (string) - required
- `body` (string) - formatted HTML produced by the WYSIWYG editor
- `createdAt`, `updatedAt` (string) - ISO datetime

Indexed on `updatedAt`. Notes are standalone without relationship to Task.

**Derived, never stored:** overdue status, filtered/sorted lists, calendar date
mappings, and analytics aggregates.

> The store shapes and indexes are a contract later features depend on. Schema
> migrations must increment the database version and supply an upgrade handler.

## Tech stack

- **Next.js 16 (App Router)** - framework and page routing
- **React 19 + TypeScript (strict)** - UI and typing; interactive screens are client
  components (`'use client'`) since all state is browser-local
- **Tailwind CSS v4** - styling with CSS-first design tokens in `app/globals.css`
- **IndexedDB via `idb`** - browser database and typed repository wrapper
- **HTML5 Drag and Drop API** - native browser drag-and-drop for task reordering
- **Rich Text / WYSIWYG** - Microsoft Word-style contenteditable architecture with
  custom styling, semantic HTML output, and tag-free plain text excerpts for
  notes and task descriptions
- **SEO & Meta** - Next.js App Router Metadata API, JSON-LD structured schema,
  dynamic `sitemap.ts` and `robots.ts`
- **Vitest + `fake-indexeddb`** - unit tests for data layer, sorting, and logic
- **npm** - package manager
- **Vercel** - hosting with `vercel.json` caching and security headers
- No backend, no API routes, no remote database, no auth provider.

## Monetization

None. An assignment deliverable; monetization is explicitly out of scope.

## UI/UX

Modern Dark/Light SaaS design inspired by Linear and Raycast: obsidian dark
surfaces, glowing indigo and violet accents, crisp micro-borders, and elevated
cards. Dark mode active by default, switchable via header toggle. Clean
high-contrast light mode. Responsive widescreen layout (`max-w-6xl`): a balanced
two-column workspace on desktop, collapsing to a single column on mobile.

Primary routes linked through a unified navigation header:

- `/` - **Tasks:** task creator with Word-style ribbon, search/filter/category controls,
  drag-and-drop reorderable list, and desktop productivity sidebar.
- `/notes` - **Notes:** standalone notes grid, search, and Word-style WYSIWYG
  rich text editor.
- `/notes/[id]` - **Standalone Note Reader:** distraction-free full document view with
  typography, word count, reading time, print/PDF export, and edit shortcut.
- `/calendar` - **Calendar:** interactive monthly calendar view, due date mapping,
  and date inspector.
- `/analytics` - **Analytics:** completion rate gauges, category distribution
  breakdown, priority distribution, and productivity stats.

Site-wide elements:
- AppHeader featuring the TaskFlow vector logo, nav links, Data button, and
  theme toggle button, streamlined on mobile viewports.
- Responsive mobile bottom navigation tab bar docked at the bottom of mobile screens
  for ergonomic thumb access to all workspaces.
- AppFooter pinned as a fixed glassmorphic dock across the bottom of the viewport
  with creator attribution, developer showcase modal trigger, and social links,
  paired with generous bottom scroll clearance across all pages.

## Deployment

- **Host:** Vercel, deployed from the GitHub repository (`*.vercel.app`)
- **App type:** Next.js App Router; no server data
- **Build:** `npm run build`; local preview: `npm run start`
- **Output:** Next.js default (`.next`); `vercel.json` with security headers
- **Env vars:** none
- **Storage:** none server-side; per-browser IndexedDB
- **Background work / cron:** none
- **Health path:** `/`
- **Domain:** default Vercel domain
