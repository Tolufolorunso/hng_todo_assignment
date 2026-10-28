# Feature: Windows Shell Navigation, Layout Containment, and WYSIWYG Command Stabilization

**From build-plan:** feature 62
**Build attempt:** 1
**Branch:** feature/windows-shell-navigation-layout-containment-and-wysiwyg-command-stabilization
**Status:** verified

## Goal

Stabilize the Windows desktop application shell by fixing active tab visual indicators in the sidebar, routing all `WysiwygEditorControl` ribbon commands with proper element targeting and focus handling so bold/italic/underline/lists/alignments/history work reliably, applying a consistent 12px vertical card gap across all list views, and encapsulating view layout containers with bounded scrolling to prevent view overlap and bleed.

## Design reference

- `websample/task page with add detail option opened.png`: Reference for active sidebar tab highlight styling (elevated surface background `#1E273A`, blue accent indicator border, bold white text) and WYSIWYG ribbon layout.
- `websample/followup page.png` and `websample/task page.png`: Reference for consistent vertical card spacing and card elevation margins.

## In scope

- Fix `SidebarButton` DataTrigger in `MainWindow.xaml` to correctly evaluate the active tab boolean condition using typed boolean matching, visibly highlighting the active navigation tab.
- Set `Focusable="False"` and `CommandTarget="{Binding ElementName=EditorBox}"` across all ribbon command buttons in `WysiwygEditorControl.xaml` and its `RibbonToolButton` style, ensuring Bold, Italic, Underline, Bullet list, Numbered list, Align Left, Align Center, Align Right, Align Justify, Undo, and Redo execute without stealing focus from the `RichTextBox`.
- Add explicit 12px vertical separation (`Margin="0,0,0,12"`) on card containers and list items across `TasksView.xaml`, `FollowUpsView.xaml`, `NotesView.xaml`, `InboxView.xaml`, and `PlanMyDayView.xaml`.
- Wrap the main work area and view containers in `MainWindow.xaml` with bounded scrolling and explicit column/row isolation to eliminate visual overlap between views (specifically isolating Analytics & Velocity from other views).
- Add automated unit tests in `apps/windows/TaskFlow.Tests` covering tab activation state properties, formatting command execution verification, and list container styling.

## Out of scope

- Full Tasks, Follow Ups, and Calendar screen parity redesign (reserved for Feature 63).
- Changes to `apps/web` or `apps/mobile`.
- Database schema changes or network sync API changes.

## Build loop

- Step review: feature (review after completing all steps).
- Checkpoint commits: disabled (work progresses locally on the branch).
- Final gate: verify with `dotnet test apps/windows/TaskFlow.Tests` and `npm run check:boundaries`.

## Build steps

1. - [x] **Fix sidebar active tab visual highlights in MainWindow.xaml**
     - Update the `SidebarButton` ControlTemplate DataTrigger in `MainWindow.xaml` to evaluate boolean `True` via `<sys:Boolean>True</sys:Boolean>` (or direct typed property binding) instead of failing on object-to-string comparison.
     - Verify active tab buttons (Tasks, Follow Ups, Plan My Day, Notes, Inbox, Calendar, Analytics, Backup, Account) apply `#1E273A` background, `#3B82F6` left indicator border, and bold text when selected.
     - *Done when:* Clicking any sidebar item or pressing `Ctrl+1` through `Ctrl+9` visibly switches the highlighted active tab indicator on the sidebar.

2. - [x] **Restore WYSIWYG editor ribbon command routing and focus handling**
     - Update `RibbonToolButton` style in `WysiwygEditorControl.xaml` to default `Focusable="False"`.
     - Explicitly bind `CommandTarget="{Binding ElementName=EditorBox}"` and `Focusable="False"` on all routed command buttons: Undo (`ApplicationCommands.Undo`), Redo (`ApplicationCommands.Redo`), Bold (`EditingCommands.ToggleBold`), Italic (`EditingCommands.ToggleItalic`), Underline (`EditingCommands.ToggleUnderline`), Bullets (`EditingCommands.ToggleBullets`), Numbering (`EditingCommands.ToggleNumbering`), Align Left (`EditingCommands.AlignLeft`), Align Center (`EditingCommands.AlignCenter`), Align Right (`EditingCommands.AlignRight`), and Justify (`EditingCommands.AlignJustify`).
     - *Done when:* Highlighting text in `EditorBox` and clicking Bold, Italic, Underline, Bullets, Numbers, or Alignment formats the selection immediately without losing cursor focus.

3. - [x] **Standardize 12px card spacing across all list views**
     - Add `Margin="0,0,0,12"` to item containers or data template root borders across `TasksView.xaml`, `FollowUpsView.xaml`, `NotesView.xaml`, `InboxView.xaml`, and `PlanMyDayView.xaml`.
     - Verify no cards touch vertically with zero gap in any list view.
     - *Done when:* Inspecting task cards, follow up cards, note cards, and inbox items shows clean, consistent 12px vertical spacing between adjacent items.

4. - [x] **Isolate view containment and prevent layout overflow in MainWindow.xaml**
     - Review the content container grid in `MainWindow.xaml` lines 530-575; ensure each view wrapper has `ClipToBounds="True"` and bounded scroll handling.
     - Constrain `AnalyticsView` so its KPI cards and distribution charts render within a dedicated scrollable container, preventing bleeding or overlapping into other tab viewports.
     - *Done when:* Switching between Tasks, Analytics, Calendar, and Follow Ups renders each view cleanly in isolation with no layout spillover or visual overlap.

5. - [x] **Add automated regression tests and verify full suite**
     - Add unit tests in `apps/windows/TaskFlow.Tests/` asserting tab activation state consistency, WYSIWYG command availability, and view model navigation commands.
     - Execute `dotnet test apps/windows/TaskFlow.Tests` and `npm run check:boundaries`.
     - *Done when:* All Windows unit tests pass with zero failures and the boundary check reports zero cross-application imports.

## Files / areas

- `apps/windows/TaskFlow/MainWindow.xaml`: SidebarButton triggers, content grid containment, view isolation.
- `apps/windows/TaskFlow/Controls/WysiwygEditorControl.xaml`: RibbonToolButton focus handling, CommandTarget routing for all ribbon buttons.
- `apps/windows/TaskFlow/Views/TasksView.xaml`: Task card vertical margin.
- `apps/windows/TaskFlow/Views/FollowUpsView.xaml`: Follow up card vertical margin.
- `apps/windows/TaskFlow/Views/NotesView.xaml`: Note card vertical margin.
- `apps/windows/TaskFlow/Views/InboxView.xaml`: Inbox card vertical margin.
- `apps/windows/TaskFlow/Views/PlanMyDayView.xaml`: Plan card vertical margin.
- `apps/windows/TaskFlow/Views/AnalyticsView.xaml`: Dashboard container bounds.
- `apps/windows/TaskFlow.Tests/ParityViewsTests.cs`: New test cases for shell navigation and command stability.

## Data / contracts

- Zero schema, entity, or API contract modifications.
- Preserves `taskflow-html-v1` format in `WysiwygEditorControl`.

## Testing

- Unit tests: `dotnet test apps/windows/TaskFlow.Tests` covering navigation commands, active tab state flags, and parity view models.
- Boundary verification: `npm run check:boundaries`.

## Notes for the AI

- Follow strict WPF rules: in `MainWindow.xaml`, declare `xmlns:sys="clr-namespace:System;assembly=mscorlib"` or `assembly=System.Runtime` for `<sys:Boolean>True</sys:Boolean>` comparisons in DataTriggers.
- Never remove existing event handlers or bindings in `WysiwygEditorControl.xaml.cs`.
- Maintain monorepo isolation: do not import from `apps/web` or `apps/mobile`.
- No em dashes in code comments or commit messages.

