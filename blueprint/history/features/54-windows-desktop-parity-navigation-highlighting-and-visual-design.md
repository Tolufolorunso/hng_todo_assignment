# Feature: Windows Desktop Parity, Navigation Highlighting, and Visual Design

**From build-plan:** feature 54
**Build attempt:** 1
**Status:** verified
**Branch:** feature/windows-desktop-parity-navigation-highlighting-and-visual-design

## Goal

Bring the Windows desktop application into full visual and functional parity with the web client. Implement active tab sidebar indicators with accent highlights, provide explicit labels and watermark placeholders for all input fields across task, follow-up, and note forms, replace default OS ComboBox controls with custom themed templates for dark, light, and high-contrast modes, bundle and configure the official TaskFlow application icon on the window and taskbar, enhance the monthly calendar with prominent today highlighting and distinct badges for tasks versus follow-ups, and add text formatting toolbars for task descriptions and note bodies.

## In scope

- Official TaskFlow application branding and window icon:
  - Generate multi-resolution `Assets/app.ico` and high-resolution `Assets/logo.png` inside `apps/windows/TaskFlow/Assets/` matching official TaskFlow branding (indigo-violet rounded square with crisp white checkmark).
  - Configure `<ApplicationIcon>Assets\app.ico</ApplicationIcon>` in `apps/windows/TaskFlow/TaskFlow.csproj` and include assets as WPF resources.
  - Set `Icon="Assets/app.ico"` on the root `<Window>` in `apps/windows/TaskFlow/MainWindow.xaml`.
  - Add `<Image Source="Assets/logo.png" Width="24" Height="24" Margin="0,0,8,0" VerticalAlignment="Center" />` alongside the brand title in the top bar.
- Sidebar navigation active tab highlighting:
  - Update `SidebarButton` style in `MainWindow.xaml` with active-state visual indicators driven by the existing `Is<TabName>TabActive` boolean properties on `MainViewModel` (`IsTasksTabActive`, `IsFollowUpsTabActive`, `IsPlanMyDayTabActive`, `IsNotesTabActive`, `IsInboxTabActive`, `IsCalendarTabActive`, `IsAnalyticsTabActive`, `IsBackupTabActive`, `IsAccountTabActive`).
  - When active, render an accent background tint (`{DynamicResource BgSurfaceElevated}` or soft accent fill), white/primary text, a distinct 3px left border indicator (`{DynamicResource AccentBlue}`), and bold font weight.
  - When inactive, display muted text with transparent background and hover elevation.
- Custom themed ComboBox controls:
  - Create a custom `Style TargetType="ComboBox"` and `ControlTemplate` in `MainWindow.xaml` `<Window.Resources>`.
  - Replace the default legacy Win32 control with flat rounded borders (`CornerRadius="6"`), dynamic theme background (`{DynamicResource BgSurface}`), border brush (`{DynamicResource BorderSubtle}`), and vector chevron arrow.
  - Implement a theme-aware popup dropdown list (`{DynamicResource BgSurfaceElevated}`) with hover highlighting (`{DynamicResource AccentBlue}`).
  - Ensure immediate reactive color updates across Dark, Light, and High Contrast themes.
- Form field labels and watermark placeholders:
  - Add explicit `<TextBlock>` labels above every input in Task, Follow-Up, and Note creation and edit panels.
  - Add placeholder watermarks inside or beneath empty input controls to guide expected formats (e.g. title, due date format `YYYY-MM-DD`, contact details, commitment notes).
  - Structure form layouts into clean vertical `<StackPanel>` rows with consistent margins.
- Enhanced monthly calendar with today highlighting and distinct badges:
  - Extend `CalendarDayItem.cs` with `TaskCount`, `FollowUpCount`, `HasTasks`, and `HasFollowUps` properties.
  - In `MainWindow.xaml` calendar monthly grid, prominently accent today's date cell with a visible border outline (`AccentBlue`) and "Today" indicator.
  - Render distinct badge indicators on date cells: a blue badge for tasks due and an amber badge for follow-up commitments due.
  - Add unit tests in `apps/windows/TaskFlow.Tests/` verifying calendar day item calculations.
- Text formatting toolbar for notes and task descriptions:
  - Add a formatting toolbar above Note Body and Task Description inputs with quick action buttons for Bold (`**`), Italic (`*`), Strikethrough (`~~`), Heading 1 (`# `), Heading 2 (`## `), Bullet List (`- `), Numbered List (`1. `), and Quote (`> `).
  - Implement text selection wrapping and snippet insertion logic in `MainWindow.xaml.cs` or ViewModel commands.
- Verification and boundaries:
  - Verify boundary check (`npm run check:boundaries`), windows unit test suite (`dotnet test`), and clean build.

## Out of scope

- Modifying web client UI or mobile client UI (completed in Features 52 and 53).
- Modifying backend PostgreSQL migrations, schema, or API v1 contracts.
- Introducing third-party WPF UI packages (e.g. MaterialDesignInXAML or MahApps.Metro); keep the codebase lightweight and repository-native.

## Build loop

- Build each step cleanly, adhering to proportional engineering.
- Commitments: strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, docs, or responses.
- Verify tests after each step.
- Never commit, merge, or push without explicit user approval.

## Build steps

- [x] 1. **Branding Assets and Application Icon:**
   - Create `apps/windows/TaskFlow/Assets/` directory.
   - Generate `app.ico` containing 16x16, 32x32, 48x48, 64x64, 128x128, and 256x256 icons, and `logo.png` vector raster with TaskFlow brand colors.
   - Configure `<ApplicationIcon>` and `<Resource>` in `apps/windows/TaskFlow/TaskFlow.csproj`.
   - Update `apps/windows/TaskFlow/MainWindow.xaml` with window `Icon` and top bar branding image.
   - Done when: `TaskFlow.csproj` contains `<ApplicationIcon>Assets\app.ico</ApplicationIcon>`, `MainWindow.xaml` references the window icon and top bar logo, and assets exist.

- [x] 2. **Sidebar Navigation Active Tab Highlighting:**
   - Update sidebar navigation buttons in `MainWindow.xaml` to bind their active state to `MainViewModel` tab active booleans.
   - Apply active visual styles: accent background fill, 3px left border bar (`AccentBlue`), and highlighted text.
   - Retain hover triggers for inactive tabs.
   - Done when: navigating between tabs updates the sidebar button highlight to reflect the currently selected tab.

- [x] 3. **Custom Themed ComboBox Control Template:**
   - Define custom `ComboBox` `ControlTemplate` and `Style` in `MainWindow.xaml` `<Window.Resources>` utilizing `{DynamicResource BgSurface}`, `{DynamicResource BgSurfaceElevated}`, `{DynamicResource BorderSubtle}`, `{DynamicResource TextPrimary}`, and `{DynamicResource AccentBlue}`.
   - Replace default Win32 ComboBox appearance across Task category filter, New Task category, New Task priority, and Follow-Up preferred action.
   - Verify styling across Dark, Light, and High Contrast themes.
   - Done when: dropdowns render with modern rounded borders, custom chevron icons, and themed popup containers matching `ModernTextBox`.

- [x] 4. **Explicit Form Labels and Watermark Placeholders:**
   - Add clear `<TextBlock>` field labels to all input fields in New Task, New Follow-Up, and New Note panels.
   - Implement watermark placeholder text in inputs showing helpful format cues when fields are empty.
   - Reorganize inputs into structured `<StackPanel>` containers with uniform spacing.
   - Done when: all form input fields display explicit labels and placeholder watermarks when empty.

- [x] 5. **Calendar Today Highlighting and Dual Task/Follow-up Badges:**
   - Update `apps/windows/TaskFlow/Models/CalendarDayItem.cs` to expose `TaskCount`, `FollowUpCount`, `HasTasks`, and `HasFollowUps`.
   - Update `apps/windows/TaskFlow/MainWindow.xaml` calendar cell template to highlight today's cell with an accent border and render separate badges for tasks (blue) and follow-ups (amber).
   - Add unit tests in `apps/windows/TaskFlow.Tests/CalendarViewModelTests.cs` verifying item count separation.
   - Done when: today is visually distinctive on the calendar grid, days with tasks and follow-ups show distinct colored badges, and tests pass.

- [x] 6. **Text Formatting Toolbar for Note Bodies and Task Descriptions:**
   - Add a formatting toolbar with Bold, Italic, Strikethrough, Heading 1, Heading 2, Bullet List, Numbered List, and Quote buttons above Note Body and Task Description inputs.
   - Connect toolbar actions to wrap selected text or insert markdown formatting markers.
   - Add unit tests for formatting helper logic.
   - Done when: clicking formatting buttons inserts or wraps text with the corresponding markdown syntax.

- [x] 7. **Verification and Quality Gate:**
   - Run `npm run check:boundaries` to verify zero cross-application imports.
   - Run `dotnet test apps/windows/TaskFlow.Tests/TaskFlow.Tests.csproj --no-build` to confirm all unit tests pass.
   - Review XAML and C# code to ensure clean syntax and complete adherence to coding standards.
   - Done when: all tests pass, boundaries are clean, and no build or lint errors exist.

## Files / areas

- `apps/windows/TaskFlow/Assets/app.ico`
- `apps/windows/TaskFlow/Assets/logo.png`
- `apps/windows/TaskFlow/TaskFlow.csproj`
- `apps/windows/TaskFlow/MainWindow.xaml`
- `apps/windows/TaskFlow/MainWindow.xaml.cs`
- `apps/windows/TaskFlow/Models/CalendarDayItem.cs`
- `apps/windows/TaskFlow/ViewModels/CalendarViewModel.cs`
- `apps/windows/TaskFlow/Common/TextFormattingHelper.cs`
- `apps/windows/TaskFlow.Tests/CalendarViewModelTests.cs`
- `apps/windows/TaskFlow.Tests/TextFormattingHelperTests.cs`

## Data / contracts

- `CalendarDayItem`:
  - `TaskCount`: integer count of items with `Type == "task"`.
  - `FollowUpCount`: integer count of items with `Type == "followup"`.
  - `HasTasks`: boolean indicating `TaskCount > 0`.
  - `HasFollowUps`: boolean indicating `FollowUpCount > 0`.
- Text Formatting:
  - Bold: wraps selection in double asterisks
  - Italic: wraps selection in single asterisks
  - Strikethrough: wraps selection in double tildes
  - Heading 1: prefixes line with `# `
  - Heading 2: prefixes line with `## `
  - Bullet List: prefixes line with `- `
  - Numbered List: prefixes line with `1. `
  - Blockquote: prefixes line with `> `

## Testing

- Unit tests in `apps/windows/TaskFlow.Tests/CalendarViewModelTests.cs` for `TaskCount`, `FollowUpCount`, and `IsToday` logic.
- Unit tests in `apps/windows/TaskFlow.Tests/TextFormattingHelperTests.cs` verifying markdown insertion and selection wrapping behavior.
- Monorepo boundary check `npm run check:boundaries`.
- Full Windows test suite execution via `dotnet test`.

## Notes for the AI

- Strictly zero em dashes, en dashes, or ellipsis in any code, comments, commit messages, docs, or responses.
- Respect running process locks: the user is currently running `dotnet run --project apps/windows/TaskFlow/TaskFlow.csproj` in a background terminal. Unit tests can be verified using `--no-build` or targeting `TaskFlow.Tests.csproj`.
- Never commit, merge, or push without separate, explicit user approval.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":10937,"specSha256":"d177e9d3abdfaee608c2f912703e927d73baebf854b03ff3b009ef9f1d238540","branch":"refs/heads/feature/windows-desktop-parity-navigation-highlighting-and-visual-design","head":"6fed4a0d4fce374bf23e7dd77fe9166bc83d6287","baseRef":"refs/heads/main","baseCommit":"6fed4a0d4fce374bf23e7dd77fe9166bc83d6287","sourceTree":"6098ceeb5e1468063b2ef38d9370e953a2e8a780","absentOptional":[]} -->
