# Feature: Windows Tasks view parity and task modal dialog

**From build-plan:** feature 59  
**Build attempt:** 1  
**Branch:** feature/windows-tasks-view-parity-and-task-modal-dialog  
**Status:** verified  

---

## Goal

Rebuild the Windows desktop `TasksView` (`apps/windows/TaskFlow/Views/TasksView.xaml`) to achieve complete visual and functional parity with the Next.js web application (`TasksScreen.tsx`, `TaskItem.tsx`, `TaskForm.tsx`), featuring Web-matching task cards (custom modern checkbox, strikethrough completion, rich HTML description preview with Show More / Show Less toggle, category pills, priority pills, due date / overdue badges, effort estimate, and note backlink) and a focused Task Modal dialog for creating and editing tasks with the full rich-text `WysiwygEditorControl`.

---

## Design reference

- **Web Task Item Component:** [`apps/web/components/tasks/TaskItem.tsx`](file:///c:/Users/oreofe/Desktop/Agentic AI/taskflow/apps/web/components/tasks/TaskItem.tsx)
- **Web Task Form Component:** [`apps/web/components/tasks/TaskForm.tsx`](file:///c:/Users/oreofe/Desktop/Agentic AI/taskflow/apps/web/components/tasks/TaskForm.tsx)
- **Web Tasks Screen Container:** [`apps/web/components/tasks/TasksScreen.tsx`](file:///c:/Users/oreofe/Desktop/Agentic AI/taskflow/apps/web/components/tasks/TasksScreen.tsx)
- **Color Tokens & Badges:**
  - Card background: `#151C2C` (`BgSurface`), border `#232E42` (`BorderSubtle`), corner radius 8px.
  - Priority Badges:
    - High: `#3B0D0D` background, `#EF4444` rose border and dot indicator, "HIGH" label.
    - Medium: `#381E05` background, `#F59E0B` amber border and dot indicator, "MEDIUM" label.
    - Low: `#172033` background, `#94A3B8` slate border and dot indicator, "LOW" label.
  - Category Badges:
    - Work: `#102A45` background, `#38BDF8` sky border and dot indicator, "WORK" label.
    - Personal: `#2A1B4E` background, `#C084FC` purple border and dot indicator, "PERSONAL" label.
    - Urgent: `#3D141E` background, `#FB7185` rose border and dot indicator, "URGENT" label.
    - Study: `#0F2F24` background, `#34D399` emerald border and dot indicator, "STUDY" label.
    - Ideas: `#38260F` background, `#FBBF24` amber border and dot indicator, "IDEAS" label.
  - Due Date Badges:
    - Overdue: `#3B0D0D` background, `#EF4444` rose border, alert icon, "Overdue, <Date>" text.
    - Standard: `#1E273A` background, `#232E42` border, calendar icon, "<Date>" text.
  - Effort Badge: `BgSurfaceElevated` pill, stopwatch icon, "⏱️ <N>m" text.
  - Note Backlink: `accent/10` pill, note icon, "From note" text with quoted note excerpt.

---

## In scope

- Create `TaskItemViewModel` under `apps/windows/TaskFlow/ViewModels/`:
  - Enriches `TaskItem` model with observable view state: `IsExpanded` (for Show More/Less toggle), `IsOverdue`, `FormattedDueDate`, `FormattedEstimatedMinutes`, `IsLongDescription`, and `HasSourceNote`.
  - Safe overdue calculation comparing `DueDate` against current date.
- Add `ModernCheckBox` style to `apps/windows/TaskFlow/Themes/ModernTheme.xaml`:
  - 18x18 custom rounded checkbox with smooth border, dark surface background, and crisp vector checkmark on active/checked state.
- Create `TaskModalDialog` control under `apps/windows/TaskFlow/Controls/`:
  - Semi-transparent backdrop (`#99000000`) and centered modal card (`Width="680"`, `MaxHeight="680"`).
  - Header with dynamic title ("New Task" or "Edit Task"), close button (✕), and Esc key dismissal.
  - Form fields:
    - Title input (`ModernTextBox`) with placeholder watermark, character counter (0/200), and validation error banner.
    - Description editor using `WysiwygEditorControl` with full ribbon toolbar.
    - Category selector with 5 Web categories (Work, Personal, Urgent, Study, Ideas).
    - Priority selector (Low, Medium, High).
    - Due Date input (YYYY-MM-DD).
    - Effort estimate input (minutes).
  - Footer with Cancel button (`SecondaryButton`) and Save Task button (`ModernButton`).
- Rebuild `TasksView.xaml` & `TasksView.xaml.cs`:
  - Filter bar matching web: Status buttons (All, Active, Completed), Category dropdown, and "+ Add Task" button.
  - Card layout in ListBox:
    - Drag grip visual handle.
    - Modern custom checkbox with instant completion toggle.
    - Title with strikethrough when completed, hover accent styling.
    - Rich formatted HTML description rendered via `FormattedTextRendererControl` (from Feature 58), with bounded height and "Show more" / "Show less" toggle for long descriptions (>180 characters).
    - Badge row: Priority pill, Category pill, Due date / Overdue badge, Effort badge, and Source note backlink pill.
    - Quoted source note excerpt display when `SourceExcerpt` exists.
    - Action buttons: Edit button (opens Task Modal in Edit mode) and Delete button.
    - Empty state banner when filtered list has no tasks.
  - Embedded `TaskModalDialog` overlay responding to `IsModalOpen`.
- Update `TasksViewModel.cs`:
  - Support both Create and Edit modes in the Task Modal.
  - Methods: `OpenCreateModalCommand`, `OpenEditModalCommand(TaskItemViewModel)`, `CloseModalCommand`, `SaveModalCommand`.
  - Update task repository upon saving edited task via `_taskRepository.UpdateAsync(...)`.
- Unit tests under `apps/windows/TaskFlow.Tests/`:
  - `TasksViewTests.cs` covering `TaskItemViewModel` properties, `TasksViewModel` creation, editing, updating, filtering, validation, and STA control lifecycle.

---

## Out of scope

- Rebuilding the Note Reader document view or updating `NotesView` (scheduled for Feature 60).
- Modifying Web (`apps/web`) or Mobile (`apps/mobile`) applications.
- Changing database schema or SQLite migrations.
- Backend API route alterations.

---

## Build loop

- `workflow.stepReview`: feature
- `workflow.checkpointCommits`: disabled
- Each build step must leave `dotnet test apps/windows/TaskFlow.sln` passing.
- Final step must pass `npm run verify`.

---

## Build steps

- [x] 1. **Implement TaskItemViewModel and Modern CheckBox Theme Style**
  - Create `apps/windows/TaskFlow/ViewModels/TaskItemViewModel.cs` wrapping `TaskItem` with reactive properties (`IsExpanded`, `IsOverdue`, `FormattedDueDate`, `FormattedEstimatedMinutes`, `IsLongDescription`, `HasSourceNote`).
  - Add `ModernCheckBox` control template to `apps/windows/TaskFlow/Themes/ModernTheme.xaml` with custom 18x18 rounded check styling.
  - Done when: unit tests verify overdue detection, formatted date representations, description length checks, and toggle expansion.

- [x] 2. **Build TaskModalDialog with Embedded WysiwygEditorControl**
  - Create `apps/windows/TaskFlow/Controls/TaskModalDialog.xaml` and `TaskModalDialog.xaml.cs`.
  - Implement dimmed backdrop, centered modern card dialog, header with title and close button, title input with char counter and validation banner, embedded `WysiwygEditorControl` for rich description, category and priority pickers, due date input, effort minutes, and Cancel/Save buttons.
  - Done when: unit tests verify dialog viewmodel binding, validation handling for empty title, and cancel/close event emission.

- [x] 3. **Rebuild TasksView with Web-Matching Task Cards and Modal Integration**
  - Update `apps/windows/TaskFlow/Views/TasksView.xaml` and `TasksView.xaml.cs`:
    - Replace raw text blocks with `FormattedTextRendererControl` and Show More / Show Less toggle for long descriptions.
    - Implement custom checkbox, strikethrough completion, priority pill, category pill, overdue / due date badge, effort estimate badge, and source note backlink.
    - Integrate `TaskModalDialog` overlay into `TasksView.xaml`.
    - Update `TasksViewModel.cs` with modal editing state (`ModalTitle`, `ModalDescription`, `ModalCategory`, `ModalPriority`, `ModalDueDate`, `ModalEstimatedMinutes`, `SaveModalCommand`, `CloseModalCommand`, `OpenCreateModalCommand`, `OpenEditModalCommand`).
  - Done when: unit tests verify create and edit lifecycles, task completion toggles, and status/category filtering.

- [x] 4. **Add Comprehensive Test Coverage and Execute Verify Gate**
  - Create `apps/windows/TaskFlow.Tests/TasksViewTests.cs` covering ViewModel lifecycle, modal validation, editing, overdue calculations, and STA control rendering.
  - Run `dotnet test apps/windows/TaskFlow.sln` and full `npm run verify`.
  - Done when: `npm run verify` exits with code 0 (zero boundary violations, clean lint, and all tests passing across Windows, Web, and Mobile).

---

## Files / areas

- `apps/windows/TaskFlow/ViewModels/TaskItemViewModel.cs` (new)
- `apps/windows/TaskFlow/Controls/TaskModalDialog.xaml` & `.cs` (new)
- `apps/windows/TaskFlow/Views/TasksView.xaml` & `.cs` (modified)
- `apps/windows/TaskFlow/ViewModels/TasksViewModel.cs` (modified)
- `apps/windows/TaskFlow/Themes/ModernTheme.xaml` (modified)
- `apps/windows/TaskFlow.Tests/TasksViewTests.cs` (new)
- `apps/windows/TaskFlow.Tests/WpfTestHelper.cs` (new)
- `apps/windows/TaskFlow.Tests/ThemesAndViewsTests.cs` (modified)

---

## Data / contracts

- Task data fields:
  - `Title`: required, max 200 characters.
  - `Description`: optional HTML string (`taskflow-html-v1`).
  - `Priority`: `"low"`, `"medium"`, `"high"`.
  - `Category`: `"work"`, `"personal"`, `"urgent"`, `"study"`, `"ideas"`, or null.
  - `DueDate`: `"YYYY-MM-DD"` or ISO string, or null.
  - `EstimatedMinutes`: positive integer, or null.
  - `SourceNoteId`: string ID reference to notes table, or null.
  - `SourceExcerpt`: plain text excerpt quoted from source note, or null.

---

## Testing

- `dotnet test apps/windows/TaskFlow.sln`: executes all unit tests including new tasks view and modal tests.
- `npm run verify`: runs boundary check, mobile suite, web suite, production build, and windows suite.

---

## Notes for the AI

- Do not alter the top header bar (`SearchInput`, "+ Quick Create", Sync status badge) or sidebar navigation buttons in `MainWindow.xaml`.
- Use `DynamicResource` tokens for all theme brushes so dialog and task cards automatically adapt to runtime theme changes.
- Ensure `FormattedTextRendererControl` renders rich HTML without leaking raw markup tags or throwing thread-affinity exceptions.
- Provide accessible names (`AutomationProperties.Name`) on all buttons, inputs, and checkboxes in `TaskModalDialog` and `TasksView`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10300,"specSha256":"0a3f6650714f331b881f0859ea0aeb92467951adf9d2c6e47204b77f1f1876b0","branch":"refs/heads/feature/windows-tasks-view-parity-and-task-modal-dialog","head":"06efaee03d97bd971bf8b119890cf45cf143774a","baseRef":"refs/heads/main","baseCommit":"06efaee03d97bd971bf8b119890cf45cf143774a","sourceTree":"b3d9c27160b0e5665e63f66238100ec3cd01b1ef","absentOptional":[]} -->
