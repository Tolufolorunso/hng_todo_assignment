# Feature: Windows design system, color tokens, and modular view architecture

**From build-plan:** feature 57  
**Build attempt:** 1  
**Status:** verified  
**Branch:** feature/windows-design-system-color-tokens-and-modular-view-architecture  

---

## Goal

Establish the Web-aligned Tailwind design system and color tokens for the Windows WPF application (`apps/windows/TaskFlow`), and refactor the monolithic 1847-line `MainWindow.xaml` content canvas into modular, maintainable UserControls (`TasksView`, `FollowUpsView`, `NotesView`, `PlanMyDayView`, `CalendarView`, `AnalyticsView`, `InboxView`) while preserving the top header and left sidebar shell.

---

## Design reference

- **Web Color Tokens:**
  - Deep dark canvas background: `#0B0F19` (`BgPrimary`)
  - Elevated card surfaces: `#151C2C` (`BgSurface`)
  - High-elevation / hover surfaces: `#1E273A` (`BgSurfaceElevated`)
  - Subtle borders: `#232E42` (`BorderSubtle`)
  - Text: Primary `#F8FAFC`, Secondary `#94A3B8`, Muted `#64748B`
  - Accents: Blue `#3B82F6`, Hover `#2563EB`, Green `#10B981`, Amber `#F59E0B`, Rose `#EF4444`
  - Category Pills: Sky `#38BDF8` (Work), Purple `#C084FC` (Personal), Rose `#FB7185` (Urgent), Emerald `#34D399` (Study), Amber `#FBBF24` (Ideas)
  - Priority Pills: Rose `#EF4444` (High), Amber `#F59E0B` (Medium), Slate `#94A3B8` (Low)
- **Component References:**
  - Card rounded corners: 8px to 12px
  - Pill badges: rounded corner 4px to 6px with dot indicator
  - Preserved shell: Window titlebar, header search bar (`SearchInput`), and sidebar navigation buttons (`SidebarButton`) remain untouched.

---

## In scope

- Create shared XAML resource dictionaries under `apps/windows/TaskFlow/Themes/`:
  - `ModernTheme.xaml`: Core palette brushes (Dark, Light, HighContrast), typography, base control templates (TextBox, ComboBox, Buttons).
  - `ModernCards.xaml`: Reusable card container styles with borders, corner radius, padding, and hover elevation.
  - `ModernBadges.xaml`: Reusable badge pill templates for categories and priorities with colored dot indicators.
- Merge the theme dictionaries into `App.xaml` / `MainWindow.xaml` so they are available application-wide.
- Refactor the 7 content views from `MainWindow.xaml` into dedicated UserControls under `apps/windows/TaskFlow/Views/`:
  - `TasksView.xaml` / `TasksView.xaml.cs`
  - `FollowUpsView.xaml` / `FollowUpsView.xaml.cs`
  - `NotesView.xaml` / `NotesView.xaml.cs`
  - `PlanMyDayView.xaml` / `PlanMyDayView.xaml.cs`
  - `CalendarView.xaml` / `CalendarView.xaml.cs`
  - `AnalyticsView.xaml` / `AnalyticsView.xaml.cs`
  - `InboxView.xaml` / `InboxView.xaml.cs`
- Bind each UserControl in `MainWindow.xaml` using clean visibility triggers and inherited DataContext.
- Preserve all existing commands, view model bindings, keyboard shortcuts (`Ctrl+1` through `Ctrl+9`, `Ctrl+F`, `Ctrl+N`), and dynamic theme switching in `MainWindow.xaml.cs`.
- Add unit/UI tests in `apps/windows/TaskFlow.Tests/` to verify resource dictionary loading, palette completeness, and UserControl instantiation.

---

## Out of scope

- WYSIWYG rich text editor implementation and HTML serialization (scheduled for Feature 58).
- Detailed Task Card HTML rendering and Task Modal Dialog (scheduled for Feature 59).
- Standalone Note Document Reader view (scheduled for Feature 60).
- Modifying Web (`apps/web`) or Mobile (`apps/mobile`) source code.
- Modifying backend API routes or database schemas.

---

## Build loop

- `workflow.stepReview`: feature
- `workflow.checkpointCommits`: disabled
- Each build step must leave `dotnet test apps/windows/TaskFlow.sln` passing.
- Final step must pass `npm run verify`.

---

## Build steps

- [x] 1. **Create shared theme dictionaries with Web Tailwind tokens**
  - Create `apps/windows/TaskFlow/Themes/ModernTheme.xaml`, `ModernCards.xaml`, and `ModernBadges.xaml`.
  - Define dynamic color brushes, typography, card styles, and badge templates matching the Web design tokens.
  - Merge the dictionaries into `App.xaml` and wire them into `TaskFlow.csproj`.
  - Update `ThemeViewModel` and `ApplyTheme` in `MainWindow.xaml.cs` to update theme brushes cleanly.
  - Done when: `dotnet build apps/windows/TaskFlow.sln` succeeds with zero errors, and unit tests verify that all theme color keys and brush resources resolve successfully.

- [x] 2. **Extract Core Productivity Views into UserControls (TasksView, FollowUpsView, NotesView)**
  - Create `apps/windows/TaskFlow/Views/TasksView.xaml` and `TasksView.xaml.cs`.
  - Create `apps/windows/TaskFlow/Views/FollowUpsView.xaml` and `FollowUpsView.xaml.cs`.
  - Create `apps/windows/TaskFlow/Views/NotesView.xaml` and `NotesView.xaml.cs`.
  - Extract the respective view markups from `MainWindow.xaml` into each UserControl, preserving all DataContext bindings (`TasksVM`, `FollowUpsVM`, `NotesVM`).
  - Replace the inline markup in `MainWindow.xaml` with `<views:TasksView />`, `<views:FollowUpsView />`, and `<views:NotesView />`.
  - Done when: `dotnet test apps/windows/TaskFlow.sln` passes and tests confirm that `TasksView`, `FollowUpsView`, and `NotesView` instantiate without XAML parsing errors and bind cleanly.

- [x] 3. **Extract Planning & Analytics Views into UserControls (PlanMyDayView, CalendarView, AnalyticsView, InboxView)**
  - Create `apps/windows/TaskFlow/Views/PlanMyDayView.xaml` and `PlanMyDayView.xaml.cs`.
  - Create `apps/windows/TaskFlow/Views/CalendarView.xaml` and `CalendarView.xaml.cs`.
  - Create `apps/windows/TaskFlow/Views/AnalyticsView.xaml` and `AnalyticsView.xaml.cs`.
  - Create `apps/windows/TaskFlow/Views/InboxView.xaml` and `InboxView.xaml.cs`.
  - Move the corresponding view markups from `MainWindow.xaml` into each UserControl, preserving all DataContext bindings (`PlanMyDayVM`, `CalendarVM`, `AnalyticsVM`, `InboxVM`).
  - Replace the inline markup in `MainWindow.xaml` with `<views:PlanMyDayView />`, `<views:CalendarView />`, `<views:AnalyticsView />`, and `<views:InboxView />`.
  - Done when: `dotnet test apps/windows/TaskFlow.sln` passes and tests confirm that all 4 planning and analytics views instantiate cleanly and bind without errors.

- [x] 4. **Harmonize visual styles, verify shell integration, and run verify gate**
  - Apply the modern card and badge resources to the extracted views to establish consistent borders, corner radius, and spacing.
  - Ensure all navigation tabs, keyboard shortcuts (`Ctrl+1`..`Ctrl+9`, `Ctrl+F`, `Ctrl+N`), search input, and window titlebar operate seamlessly in the preserved shell.
  - Add test coverage in `TaskFlow.Tests` validating view lifecycle, DataContext binding, and dynamic theme switching.
  - Run full verification (`npm run verify`).
  - Done when: `npm run verify` exits with code 0 (zero boundary violations, clean lint, and all unit tests passing across Windows, Web, and Mobile).

---

## Files / areas

- `apps/windows/TaskFlow/App.xaml`
- `apps/windows/TaskFlow/MainWindow.xaml`
- `apps/windows/TaskFlow/MainWindow.xaml.cs`
- `apps/windows/TaskFlow/Themes/ModernTheme.xaml` (new)
- `apps/windows/TaskFlow/Themes/ModernCards.xaml` (new)
- `apps/windows/TaskFlow/Themes/ModernBadges.xaml` (new)
- `apps/windows/TaskFlow/Views/TasksView.xaml` & `.cs` (new)
- `apps/windows/TaskFlow/Views/FollowUpsView.xaml` & `.cs` (new)
- `apps/windows/TaskFlow/Views/NotesView.xaml` & `.cs` (new)
- `apps/windows/TaskFlow/Views/PlanMyDayView.xaml` & `.cs` (new)
- `apps/windows/TaskFlow/Views/CalendarView.xaml` & `.cs` (new)
- `apps/windows/TaskFlow/Views/AnalyticsView.xaml` & `.cs` (new)
- `apps/windows/TaskFlow/Views/InboxView.xaml` & `.cs` (new)
- `apps/windows/TaskFlow.Tests/ThemesAndViewsTests.cs` (new)

---

## Data / contracts

- Preserves all existing SQLite local tables, ViewModels, and sync payloads.
- Dynamic resources in WPF:
  - `BgPrimary`, `BgSurface`, `BgSurfaceElevated`, `BorderSubtle`
  - `TextPrimary`, `TextSecondary`, `TextMuted`
  - `AccentBlue`, `AccentGreen`, `AccentAmber`, `AccentRose`
  - Category brushes: `CategoryWorkBrush`, `CategoryPersonalBrush`, `CategoryUrgentBrush`, `CategoryStudyBrush`, `CategoryIdeasBrush`
  - Priority brushes: `PriorityHighBrush`, `PriorityMediumBrush`, `PriorityLowBrush`

---

## Testing

- `dotnet test apps/windows/TaskFlow.sln`: executes all existing and new WPF unit tests.
- `npm run verify`: runs boundary check, mobile tests, web tests, and production build to guarantee zero monorepo regressions.

---

## Notes for the AI

- Do not alter the top header bar (`SearchInput`, "+ Quick Create", Sync status badge) or sidebar navigation buttons in `MainWindow.xaml`.
- Make sure all new UserControls use `DynamicResource` rather than `StaticResource` for theme brushes so runtime theme switching (Dark/Light/HighContrast) updates all views instantly.
- In `TasksView`, `NotesView`, etc., ensure `UserControl.DataContext` inherits properly from `MainWindow` or binds directly to sub-viewmodels (e.g. `TasksVM`, `NotesVM`).


<!-- blueprint:completion {"schemaVersion":1,"specBytes":8934,"specSha256":"11baa664b95fb087f9c3eda190f94c45e2ba2d95e248ab32df0a4bf05e20be80","branch":"refs/heads/feature/windows-design-system-color-tokens-and-modular-view-architecture","head":"a14ed124f6d0f8ab91f92288e49615ab05f58609","baseRef":"refs/heads/main","baseCommit":"a14ed124f6d0f8ab91f92288e49615ab05f58609","sourceTree":"3a198a504176dae21e1101f626d0f0019a3de439","absentOptional":[]} -->
