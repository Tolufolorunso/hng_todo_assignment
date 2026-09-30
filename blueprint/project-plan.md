# Project Plan

> One of the two user-owned planning docs. Drafted through `/discovery` from the
> assignment brief, confirmed decisions, and Milestone E overhaul. Edit directly
> any time. When it is ready, run `/overview`.

## 1. Problem - What problem are we solving?

The assignment requires a working To-Do application that demonstrates full task
management (create, view, edit, delete), a notes feature, and at least one
additional feature, using a browser database, built entirely with AI, and
deployed to a public URL.

The product problem is ordinary: people lose track of small tasks and the context
around them (why a task matters, related thoughts, deadlines). Lightweight lists
force a choice between a bare checklist and a heavyweight project tool. This app
targets the sweet spot: a fast, offline-capable, single-user productivity suite
featuring tasks, notes, interactive scheduling, and productivity analytics with
no sign-up and no server.

Milestone E elevates the application from a basic single-column checklist into a
widescreen, multi-page desktop workspace with a modern SaaS aesthetic (inspired
by Linear and Raycast), drag-and-drop reordering, curated categories, an
interactive calendar, and data backup.

Milestone F adds theme toggle controls (dark mode default with light mode option),
bespoke TaskFlow vector branding, clean starter asset pruning, a site-wide footer
with an interactive developer showcase modal (honoring Tolulope Folorunso), and a
Microsoft Word-style WYSIWYG rich text notes editor.

Milestone G brings Microsoft Word-style rich formatting to task descriptions, adds
a dedicated distraction-free standalone note reader route (`/notes/[id]`), and
delivers complete production SEO, Open Graph preview metadata, and Vercel deployment
configuration.

Milestone H delivers an ergonomic mobile-first app navigation experience and a
fixed bottom dock: a streamlined mobile top bar (<640px) eliminating tab overflow,
a dedicated thumb-friendly bottom navigation tab bar on mobile viewports, and a
pinned glassmorphic bottom dock footer across all pages with dedicated page scroll
clearance.

**Desired outcome:** a live URL where a visitor experiences an attractive,
feature-rich productivity suite (Tasks, Notes, Standalone Note Reader, Calendar,
Analytics) that works offline, defaults to a sleek dark mode, supports Word-style
formatted notes and tasks, navigates effortlessly on both mobile and desktop with
docked bars, shares beautifully on social platforms, and keeps all data securely
in their own browser.


## 2. Users - Who is this for?

- Primary: one individual managing their own tasks and schedule on one device.
  Students, developers, and knowledge workers who want a high-performance personal
  workspace.
- Secondary: the assignment reviewer, who must confirm each mandated rubric item
  and experience a polished, high-scoring product.
- Not for: teams, shared lists, or anyone needing cross-device cloud sync. There
  are no accounts; all data belongs to the active browser profile.

## 3. Features - What does the MVP need?

Mandatory (from the brief):

- Task management: create, view, edit/update, and delete tasks, and mark complete.
- Notes: a standalone notes feature with its own list, full CRUD, and search.
- Additional features: search, filter, and sort tasks; due dates and priorities
  (low / medium / high) with overdue highlighting; offline-first PWA.

Milestone E additions (Advanced Productivity and Multi-Page Overhaul):

- Modern Dark/Light SaaS design system: obsidian surfaces, glowing violet/indigo
  accents, crisp micro-borders, and animated feedback.
- Widescreen desktop layout: responsive 2-column workspace eliminating empty
  space on wide screens.
- Drag-and-drop task reordering: native HTML5 drag-and-drop with custom order
  persistence in IndexedDB.
- Curated categories: color-coded tags (Work, Personal, Urgent, Study, Ideas)
  and category filtering.
- Calendar view (`/calendar`): interactive monthly grid mapping tasks to due
  dates, date selection, and overdue chips.
- Analytics view (`/analytics`): productivity dashboard with completion rate
  gauges, category distribution bars, and priority breakdowns.
- Data backup and restore: timestamped JSON export and validated JSON import to
  guarantee data portability.

Milestone F additions (Polish, Branding, and Word-Style Rich Notes):

- Theme toggle: dark mode default with light mode option, toggled beside the
  Data button in the app header, with instant transitions and localStorage
  persistence.
- TaskFlow vector branding: bespoke SVG logo integrated before "TaskFlow" in the
  header and configured as the browser favicon, with default Next.js SVG files
  cleaned out.
- Site-wide footer and interactive developer showcase modal: responsive footer
  featuring Tolulope Folorunso (`Tolulope_builds`), AI Product Engineer & AI
  System Engineer / HNG Intern, with direct links to LinkedIn, X, and GitHub,
  paired with an in-depth "About the Developer" modal.
- Microsoft Word-style WYSIWYG rich text notes editor: formatting ribbon with
  bold, italic, underline, strikethrough, text alignment, highlight color,
  text color, font size, headings, bullet/numbered lists, icon/symbol inserter,
  and superscript/subscript controls, storing clean HTML and displaying clean
  plain-text excerpts in the notes list.

Milestone G additions (Rich Tasks, Standalone Note Reader, and SEO & Deployment):

- Microsoft Word-style rich text formatting for task descriptions: formatting
  ribbon integrated into task creation and editing, expanding description limits
  to 20,000 characters, rendering rich HTML in task inspection, and displaying
  clean tag-stripped excerpts in task list cards.
- Standalone note document reader (`/notes/[id]`): dedicated reading route for
  notes with document typography, word count, reading time estimates, print/PDF
  export (`window.print()`), copy text, and quick-launch links from note cards.
- SEO, Open Graph & Vercel deployment: complete page-level metadata, Open Graph
  and Twitter preview cards, JSON-LD structured data (`WebApplication`), dynamic
  `sitemap.ts` and `robots.ts`, and `vercel.json` deployment configuration with
  security and caching headers.

Milestone H additions (Mobile-First App Bar & Fixed Bottom Dock):

- Professional mobile app header: streamlined top bar on viewports under 640px
  containing the brand logo, theme toggle, data backup button, and offline status
  indicator without tab overflow or horizontal scrolling.
- Mobile bottom navigation tab bar: thumb-friendly fixed bottom tab bar for mobile
  viewports housing Tasks, Notes, Calendar, and Analytics tabs with active pill
  styling.
- Pinned fixed bottom dock footer: glassmorphic footer pinned to the viewport
  bottom (`fixed bottom-0`) with creator attribution (Tolulope Folorunso), developer
  showcase modal trigger, and direct social links.
- Viewport scroll clearance: calibrated bottom padding across all route containers
  (`/`, `/notes`, `/notes/[id]`, `/calendar`, `/analytics`) ensuring content never
  collides with or hides behind the bottom dock.

Platform and delivery:


- Persist everything in a browser database (IndexedDB).
- Deploy publicly to a live URL (Vercel).
- `AGENTS.md` with structured agent rules.
- Vitest unit tests over the data layer and logic.

## 4. Data - What are we storing?

Everything lives in IndexedDB in the user's browser. No server, no remote
database, no accounts.

**Task (Schema Version 2)**

- `id`: string (uuid)
- `title`: string (required)
- `description`: string (optional, stores formatted HTML produced by the WYSIWYG editor up to 20,000 characters)
- `completed`: boolean
- `priority`: `"low" | "medium" | "high"`
- `dueDate`: string | null (ISO date, date-only)
- `category`: `"work" | "personal" | "urgent" | "study" | "ideas" | null`
- `order`: number (for custom drag-and-drop arrangement)
- `createdAt`, `updatedAt`: string (ISO datetime)
- `completedAt`: string | null (ISO datetime)

**Note**

- `id`: string (uuid)
- `title`: string (required)
- `body`: string (stores formatted HTML content produced by the WYSIWYG editor)
- `createdAt`, `updatedAt`: string (ISO datetime)

Object stores: `tasks` and `notes`.
Indexes on `tasks`: `dueDate`, `updatedAt`, `category`.
Indexes on `notes`: `updatedAt`.
Schema version 2 upgrade handler provides automated migration from version 1,
assigning default orders and null categories to existing records.

Derived, never stored: overdue status, filtered/sorted lists, calendar day
mappings, and analytics aggregates.

## 5. Tech - What stack are we using?

- Framework: Next.js 16 (App Router), React 19, TypeScript strict mode.
- Pages: `/` (Tasks), `/notes` (Notes), `/notes/[id]` (Standalone Note Reader),
  `/calendar` (Calendar), `/analytics` (Analytics).
- Styling: Tailwind CSS v4 (CSS-first config in `app/globals.css`).
- Database: IndexedDB via `idb` typed repository wrapper.
- Drag and Drop: Native HTML5 drag-and-drop API (zero heavy third-party bundles).
- Rich Text / WYSIWYG: Microsoft Word-style contenteditable architecture with
  custom styling, semantic markup output, and tag-free excerpt generation for
  both notes and tasks.
- SEO & Meta: Next.js App Router Metadata API, JSON-LD structured schema,
  dynamic `sitemap.ts` and `robots.ts`.
- Testing: Vitest for unit tests with `fake-indexeddb`.
- Package manager: npm.
- Hosting: Vercel with `vercel.json` headers.

Interactive screens are client components (`'use client'`) because all state is
local IndexedDB.

## 6. Monetize - How will this make money?

None. This is an assignment deliverable; monetization is explicitly out of scope.

## 7. UI/UX - How should this look and feel?

Modern Dark/Light SaaS design inspired by Linear and Raycast:

- Obsidian/charcoal dark mode with glowing indigo and violet accents, crisp
  micro-borders, and refined card elevations.
- Dark mode active by default for all visitors, with an instant theme toggle
  beside the Data button in the header.
- Clean, high-contrast light mode with subtle shadows and border highlights.
- Bespoke TaskFlow vector logo (dynamic checkmark icon) in the header and as the
  browser favicon, with unused Next.js SVGs removed.
- Widescreen layout (`max-w-6xl`): on desktop, a two-column workspace pairing
  the main task feed with a live productivity sidebar. Collapses cleanly to a
  single column on mobile and tablet.
- 4-page unified header navigation with active indicators and offline status.
- Site-wide footer with creator attribution and an interactive "About the
  Developer" modal dedicated to Tolulope Folorunso (`Tolulope_builds`), AI
  Product Engineer & AI System Engineer / HNG Intern.
- Microsoft Word-style WYSIWYG rich text ribbon toolbar for notes with bold,
  italic, underline, strikethrough, alignment, highlight, text color, font size,
  headings, bullet/numbered lists, icon inserter, and super/subscripts.
- Polished interactions: animated checkboxes, smooth drag ghosts, color-coded
  category pills, and friendly illustrated empty states.

## 8. Deployment - Where and how will this ship?

- Host: Vercel, deployed from the GitHub repository (`*.vercel.app`).
- App type: Next.js app, no server data required.
- Build: `npm run build`; local preview: `npm run start`.
- Output: Next.js default (`.next`).
- Environment variables: none.
- Storage: per-browser IndexedDB.
- Health check path: `/`.

## 9. Usage model and constraints

- Users: single-user, personal browser profile.
- Scale: one browser profile, estimated up to several thousand tasks and notes;
  all aggregations run in-memory.
- Trust and validation: client-side untrusted input is strictly validated (length
  limits, non-empty titles, valid ISO dates, safe JSON imports).
- Privacy: 100% private; no telemetry, analytics beacons, or server uploads.

## 10. Explicit non-goals

Out of scope: user accounts and passwords; multi-user sharing; cloud/remote
database sync; real-time collaboration; server-side APIs; push/email
notifications; natural-language date parsing; monetization.

## 11. Assumptions, risks, and open questions

Assumptions:

- IndexedDB is supported on the target browser.
- Offline support is handled via the installed service worker.

Risks:

- Schema upgrade from v1 to v2: handled by an explicit `upgrade` callback in
  `lib/db.ts` to preserve existing tasks without data loss.
- Browser cache clearing: mitigated by the new JSON backup and restore feature.

Open questions: none blocking.

## 12. Success criteria

- All 4 pages (`/`, `/notes`, `/calendar`, `/analytics`) are functional,
  responsive, and visually cohesive.
- Drag-and-drop task reordering updates visual order and persists to IndexedDB.
- Curated categories can be assigned to tasks and filtered.
- Calendar view maps tasks to due dates with date selection and overdue states.
- Analytics view renders completion rate metrics, category distributions, and
  priority breakdowns.
- JSON backup exports valid files and restores data cleanly.
- Dark mode is active by default and toggles cleanly to light mode, persisted
  in localStorage without theme flash.
- TaskFlow vector brand logo displays in the header and tab favicon; unused
  boilerplate Next.js SVGs are removed.
- Site-wide footer renders on all pages and opens the developer showcase modal
  presenting Tolulope Folorunso's bio and working links to LinkedIn, X, and
  GitHub.
- Notes editor provides Microsoft Word-style WYSIWYG formatting, persists HTML
  cleanly, and displays tag-free excerpts in the notes list.
- Task descriptions support Microsoft Word-style WYSIWYG rich text formatting,
  rendering HTML in details and tag-free excerpts in task cards.
- Standalone note document reader (`/notes/[id]`) provides focused reading with
  word count, reading time, print/PDF export, and smooth navigation.
- Site-wide SEO, Open Graph & Twitter preview cards, JSON-LD schema, sitemap,
  robots.txt, and `vercel.json` are fully configured.
- Vitest unit tests pass for data layer, sorting, filtering, and aggregations.
- The app builds cleanly and deploys to Vercel.
