# Build Plan

List the features that make up the project, high level and in rough build order.
Keep each item to one line; the details come later in `/feature`.

Run `/feature` to spec the next unchecked item, or `/feature 9` to pick one.
Keep completed items checked and append new features as the project grows. Do not
renumber completed features; their archived specs refer to those IDs.

Scaffolding the app and prototyping its look are pre-build steps, not features.
The Blueprint overlay, `AGENTS.md`, and the Onboard setup are already done.

## Milestone A: Foundation

- [x] 1. **Task data layer and persistence** - a typed repository over IndexedDB
  (`idb`): schema v1 with `tasks` and `notes` stores, indexes, and task CRUD
  functions. Adds Vitest plus `fake-indexeddb`, the first unit tests, the `test`
  script (which turns the logic test gate on), and input validation helpers.
- [x] 2. **Task list: create, view, and complete** - the first user-visible slice.
  Render stored tasks, add a task by title, toggle complete, and show an empty
  state.

## Milestone B: Core task management

- [x] 3. **Edit and delete tasks** - edit a task's title and description, and
  delete with confirmation. Covers the update and delete paths and their tests.
- [x] 4. **Notes** - a standalone notes section: list, create, edit, and delete
  notes (title plus body), with search across notes.

## Milestone C: Additional features

- [x] 5. **Due dates and priorities** - extend the task model with `dueDate` and
  `priority`, add controls to set them, and show overdue highlighting plus priority
  styling. Adds indexes and tests for the derived logic.
- [x] 6. **Search, filter, and sort for tasks** - a sticky control bar with text
  search, status filter (all / active / completed), and sorting by due date,
  priority, or creation date. Pure functions with unit tests.
- [x] 7. **Offline-first PWA** - web manifest, icons, and a versioned service
  worker so the app installs and works offline after first load, with an offline
  indicator.

## Milestone D: Delivery

- [x] 8. **Deployment readiness and live URL** - verify the production build, write
  a real project README, add Vercel configuration, then confirm the public URL and
  smoke-test the main flows there.

## Milestone E: Advanced Productivity and Multi-Page Overhaul

- [x] 9. **Modern SaaS design system and widescreen desktop layout** - revamp theme
  tokens, typography, elevated card surfaces, and introduce the responsive 2-column
  desktop workspace (`max-w-6xl`) with the updated 4-page navigation header.
- [x] 10. **Drag-and-drop task reordering and custom positioning** - native HTML5
  drag-and-drop reordering with visual grab handles and drop indicators, persisting
  an `order` index to IndexedDB.
- [x] 11. **Curated task categories and category filtering** - schema v2 upgrade
  adding `category` (Work, Personal, Urgent, Study, Ideas), category pill badges,
  and category filter controls.
- [x] 12. **Calendar and schedule view (`/calendar`)** - interactive monthly
  calendar grid mapping tasks to due dates, with overdue highlights and date-based
  task inspection.
- [x] 13. **Analytics and productivity insights (`/analytics`)** - dedicated
  metrics page showing task completion rate, category distribution breakdowns,
  priority splits, and productivity stats.
- [x] 14. **Data backup and restore** - timestamped JSON export and validated JSON
  import to ensure offline data durability.

## Milestone F: Polish, Branding, and Word-Style Rich Notes

- [x] 15. **Theme toggle: dark mode default with light mode option** - obsidian dark mode by default, sun/moon toggle beside the Data button in the header, inline anti-flash script, and localStorage persistence.
- [x] 16. **TaskFlow vector branding and Next.js starter asset cleanup** - bespoke SVG brand logo placed before "TaskFlow" in the header and set as browser favicon, removing unused boilerplate Next.js SVG files from `public/`.
- [x] 17. **Site-wide footer and interactive developer showcase modal** - responsive footer across all pages with creator attribution and a dedicated modal highlighting Tolulope Folorunso (AI Product Engineer, HNG Intern) with social links and bio.
- [x] 18. **Microsoft Word-style WYSIWYG rich text notes editor** - rich text formatting ribbon (bold, italic, underline, strikethrough, alignment, text color, highlight, font size, headings, lists, icons, super/subscript) saving clean HTML with tag-free excerpts in the note list.

## Milestone G: Rich Tasks, Standalone Note Reader, and SEO & Deployment

- [x] 19. **Microsoft Word-style rich text formatting for task descriptions** - integrate the formatting ribbon into task creation and editing, expanding description limits, rendering rich HTML in task view, and extracting clean excerpts in task cards.
- [x] 20. **Standalone note document reader (`/notes/[id]`)** - dedicated distraction-free reading route for notes with document typography, word count, reading time, print/PDF export, and quick-launch links from the note list.
- [x] 21. **Search engine optimization (SEO), Open Graph & Vercel deployment** - full page-level metadata, Open Graph and Twitter preview cards, JSON-LD structured data, dynamic sitemap and robots.txt, and vercel.json deployment configuration.

## Milestone H: Mobile-First App Bar & Fixed Bottom Dock

- [x] 22. **Professional mobile header and responsive bottom navigation tab bar** - streamline top header on mobile (<640px) to brand and utility actions, introducing a fixed thumb-friendly bottom navigation bar for Tasks, Notes, Calendar, and Analytics.
- [x] 23. **Fixed bottom dock footer and page scroll clearance** - pin the site-wide footer to the bottom of the viewport with glassmorphic backdrop blur and responsive layout, ensuring proper bottom scroll padding across all pages so content never clips behind the dock.

