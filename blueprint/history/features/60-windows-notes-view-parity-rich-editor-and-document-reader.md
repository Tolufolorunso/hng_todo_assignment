# Feature: Windows Notes view parity, rich editor, and document reader

**From build-plan:** feature 60  
**Build attempt:** 1  
**Branch:** feature/windows-notes-view-parity-rich-editor-and-document-reader  
**Status:** verified  

---

## Goal

Rebuild the Windows desktop `NotesView` (`apps/windows/TaskFlow/Views/NotesView.xaml` and `NotesViewModel.cs`) to achieve complete visual and functional parity with the Next.js web application (`NotesScreen.tsx`, `NoteList.tsx`, `StandaloneNoteView.tsx`), featuring a modern card list with clean formatted excerpts, word count, and reading time badges, full integration of `WysiwygEditorControl` for rich note authoring, a dedicated Document Reader view with clean reading typography and `FormattedTextRendererControl`, and actionable text extraction for creating linked tasks and follow-ups with backlink tracking.

---

## Design reference

- **Web Notes Screen Container:** [`apps/web/components/notes/NotesScreen.tsx`](file:///c:/Users/oreofe/Desktop/Agentic%20AI/taskflow/apps/web/components/notes/NotesScreen.tsx)
- **Web Note List & Cards:** [`apps/web/components/notes/NoteList.tsx`](file:///c:/Users/oreofe/Desktop/Agentic%20AI/taskflow/apps/web/components/notes/NoteList.tsx)
- **Web Standalone Note Reader:** [`apps/web/components/notes/StandaloneNoteView.tsx`](file:///c:/Users/oreofe/Desktop/Agentic%20AI/taskflow/apps/web/components/notes/StandaloneNoteView.tsx)
- **Web Note Backlinks:** [`apps/web/components/notes/NoteBacklinks.tsx`](file:///c:/Users/oreofe/Desktop/Agentic%20AI/taskflow/apps/web/components/notes/NoteBacklinks.tsx)
- **Color Tokens & Styling:**
  - Card background: `#151C2C` (`BgSurface`), border `#232E42` (`BorderSubtle`), corner radius 8px.
  - Active note card: border `#38BDF8` (`AccentBlue`), subtle accent ring.
  - Reading stats pill: `BgSurfaceElevated` background, subtle border, stopwatch icon, `{words} words ({readingTimeMinutes}m)` text.
  - Action extraction banner: `BgSurfaceElevated` background, `#38BDF8` highlight, actionable excerpt input, and "+ Task" / "+ Follow-Up" buttons.
  - Backlinks container: `BorderSubtle` top separator, linked task checkboxes and follow-up badges.

---

## In scope

- Create `NoteItemViewModel` under `apps/windows/TaskFlow/ViewModels/`:
  - Enriches `NoteItem` model with reactive presentation properties: `Excerpt` (plain text up to 120 chars via `HtmlMetricsHelper.CreateExcerpt`), `WordCount`, `ReadingTimeMinutes`, `FormattedReadingStats`, `FormattedUpdatedAt`, and `HasBody`.
- Update `NotesViewModel.cs`:
  - Maintain an observable collection of `NoteItemViewModel` items.
  - Dual-mode workflow: Editor Mode (`IsReaderMode == false`) and Document Reader Mode (`IsReaderMode == true`).
  - Search filtering across note titles and bodies.
  - Note creation, editing, and deletion with rich HTML bodies (`taskflow-html-v1`).
  - Actionable notes integration: extract custom excerpt or note selection to create linked Tasks or Follow-Ups via `ActionableNotesService`.
  - Linked actions (backlinks): load and expose tasks and follow-ups linked to the selected note (`SourceNoteId == note.Id`).
  - Plain text copy command with feedback.
- Rebuild `NotesView.xaml` & `NotesView.xaml.cs`:
  - Left pane (Master / Card list):
    - Search input (`ModernTextBox`) with placeholder watermark ("Search notes...") and real-time query filtering.
    - Header with note count badge and "+ New Note" button (`ModernButton`).
    - Note card template: Title in bold, formatted plain text excerpt, word count and reading time pill, updated date timestamp, and direct "Read Document" icon button.
    - Active note highlighting and empty state when no notes match.
  - Right pane (Detail / Editor / Document Reader):
    - **Editor Mode**: Note title input (`ModernTextBox`), embedded [`WysiwygEditorControl`](file:///c:/Users/oreofe/Desktop/Agentic%20AI/taskflow/apps/windows/TaskFlow/Controls/WysiwygEditorControl.xaml) with full Word-style ribbon toolbar, live reading stats indicator, and "Save Note" / "Delete Note" / "Read Document" actions.
    - **Document Reader Mode**: Clean distraction-free document typography, document header (title, updated timestamp, reading stats pill), top action bar ("Edit Note", "Copy Plain Text", "Print / Export", "Create Action"), rich formatted body rendered via [`FormattedTextRendererControl`](file:///c:/Users/oreofe/Desktop/Agentic%20AI/taskflow/apps/windows/TaskFlow/Controls/FormattedTextRendererControl.xaml), and linked actions (backlinks) section.
    - Actionable text extraction panel: input field for selected or custom excerpt, "+ Task" button, and "+ Follow-Up" button with instant backlink refresh.
- Unit tests under `apps/windows/TaskFlow.Tests/`:
  - `NotesViewTests.cs` covering `NoteItemViewModel`, `NotesViewModel` CRUD, search filtering, reader mode toggle, actionable text extraction, backlink queries, and STA UI instantiation.

---

## Out of scope

- Modifying Web (`apps/web`) or Mobile (`apps/mobile`) applications.
- Changing database schema or SQLite migrations (existing `notes`, `tasks`, and `follow_ups` tables already support `source_note_id` and `source_excerpt`).
- Milestone Q Feature 61 (Follow Ups, Plan My Day, Calendar, Analytics, and Inbox parity).

---

## Build loop

- `workflow.stepReview`: feature
- `workflow.checkpointCommits`: disabled
- Each build step must leave `dotnet test apps/windows/TaskFlow.sln` passing.
- Final step must pass `npm run verify`.

---

## Build steps

- [x] 1. **Implement NoteItemViewModel and Backlinks Query Support**
  - Create `apps/windows/TaskFlow/ViewModels/NoteItemViewModel.cs` wrapping `NoteItem` with reactive properties (`Excerpt`, `WordCount`, `ReadingTimeMinutes`, `FormattedReadingStats`, `FormattedUpdatedAt`, `HasBody`).
  - Add `ListBySourceNoteAsync` query helpers in `ITaskRepository` / `IFollowUpRepository` (or implement in `NotesViewModel`) to retrieve linked actions.
  - Update `NotesViewModel.cs` to manage `ObservableCollection<NoteItemViewModel>` and expose `LinkedTasks` and `LinkedFollowUps` for the active note.
  - Done when: unit tests verify excerpt generation, reading stats calculation, date formatting, and backlink loading.

- [x] 2. **Rebuild NotesView Left Pane with Web-Matching Card Grid and Search**
  - Update `apps/windows/TaskFlow/Views/NotesView.xaml` left pane:
    - Search input (`ModernTextBox`) with placeholder watermark and real-time filtering.
    - Header with note count indicator and "+ New Note" button.
    - Note cards showing bold title, plain excerpt, reading stats pill, updated date, and "Read Document" shortcut button.
    - Empty state banner when filtered collection has no items.
  - Done when: unit tests verify search filtering, card selection, and empty state visibility.

- [x] 3. **Implement Document Reader Mode and Wire WysiwygEditorControl**
  - Update `apps/windows/TaskFlow/Views/NotesView.xaml` right pane:
    - Editor Mode: title input, embedded `WysiwygEditorControl` with full ribbon toolbar, live reading stats, and Save/Delete/Reader buttons.
    - Document Reader Mode: clean document typography matching Web `StandaloneNoteView`, document header (title, timestamp, stats), top action bar (Edit, Copy Text, Print, Create Action), rich body rendered with `FormattedTextRendererControl`, and linked actions (backlinks) section.
    - Actionable text extraction panel: excerpt input with quick "+ Task" and "+ Follow-Up" buttons.
  - Update `NotesViewModel.cs` with mode switching, rich HTML synchronization, actionable extraction commands, and copy feedback.
  - Done when: unit tests verify mode switching, HTML note persistence, actionable action creation, and clipboard copy.

- [x] 4. **Add Comprehensive Test Coverage and Execute Verify Gate**
  - Create `apps/windows/TaskFlow.Tests/NotesViewTests.cs` (in `[Collection("WpfTests")]` using `WpfTestHelper`) covering ViewModel lifecycle, search filtering, rich editor serialization, reader mode, actionable note extraction, backlinks, and STA UI instantiation.
  - Run `dotnet test apps/windows/TaskFlow.sln` and full `npm run verify`.
  - Done when: `npm run verify` exits with code 0 (zero boundary violations, clean lint, and all tests passing across Windows, Web, and Mobile).

---

## Files / areas

- `apps/windows/TaskFlow/ViewModels/NoteItemViewModel.cs` (new)
- `apps/windows/TaskFlow/Views/NotesView.xaml` & `.cs` (modified)
- `apps/windows/TaskFlow/ViewModels/NotesViewModel.cs` (modified)
- `apps/windows/TaskFlow/App.xaml.cs` (modified to inject task/followup repositories into NotesViewModel)
- `apps/windows/TaskFlow.Tests/NotesViewTests.cs` (new)

---

## Data / contracts

- Note data fields:
  - `Title`: required, max 200 characters.
  - `Body`: optional HTML string (`taskflow-html-v1`), up to 50,000 characters.
  - `CreatedAt`, `UpdatedAt`: RFC 3339 UTC ISO strings.
- Actionable Extraction fields:
  - `SourceNoteId`: string note ID.
  - `SourceExcerpt`: extracted text excerpt from note body, max 2,000 characters.
  - Resulting Task: `SourceNoteId`, `SourceExcerpt`, `Title`, `Priority`, `Category`.
  - Resulting FollowUp: `SourceNoteId`, `SourceExcerpt`, `PersonName`, `Commitment`, `DueAt`.

---

## Testing

- `dotnet test apps/windows/TaskFlow.sln`: executes all unit tests including new notes view, reader, and actionable extraction tests.
- `npm run verify`: runs boundary check, mobile suite, web suite, production build, and windows suite.

---

## Notes for the AI

- Do not alter the top header bar (`SearchInput`, "+ Quick Create", Sync status badge) or sidebar navigation buttons in `MainWindow.xaml`.
- Use `DynamicResource` tokens for all theme brushes so document reader and cards automatically adapt to runtime theme changes.
- Ensure `FormattedTextRendererControl` renders rich HTML without leaking raw markup tags or throwing thread-affinity exceptions.
- Provide accessible names (`AutomationProperties.Name`) on all buttons, inputs, and interactive elements.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9989,"specSha256":"b765d0e8e5f1da2c249a4728dbcfa1d33b2d5f9aafb711347a7e6767d2433fd8","branch":"refs/heads/feature/windows-notes-view-parity-rich-editor-and-document-reader","head":"10843590ee48f75b596d350756f996791f578f4b","baseRef":"refs/heads/main","baseCommit":"10843590ee48f75b596d350756f996791f578f4b","sourceTree":"42f8ea8468747ebf51c275090ee779acca711989","absentOptional":[]} -->
