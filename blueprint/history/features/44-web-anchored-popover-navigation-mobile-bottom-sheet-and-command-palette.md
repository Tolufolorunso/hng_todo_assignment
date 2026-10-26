# Feature: Web anchored popover navigation, mobile bottom sheet, and command palette

**From build-plan:** feature 44
**Build attempt:** 1
**Branch:** feature/web-anchored-popover-navigation-mobile-bottom-sheet-and-command-palette
**Status:** verified

## Goal

Modernize web navigation by replacing the heavy slide-over right drawer with a non-blocking anchored floating popover on desktop viewports, an interactive draggable bottom sheet on mobile viewports, two-key keyboard shortcut sequences (G T, G F, G N, G I, G P, G C, G A), and a global Command Palette (Cmd+K / Ctrl+K) for instant keyboard-driven navigation across all TaskFlow destinations and utilities.

## In scope

- Expansion of navigation metadata in \`apps/web/lib/navigation.ts\` with shortcut keys, category tags, and command definitions.
- Global keyboard shortcut sequencer hook (\`apps/web/hooks/useGlobalShortcuts.ts\`) supporting two-key sequences (\`g\` then \`t\`, \`f\`, \`n\`, \`i\`, \`p\`, \`c\`, \`a\`) and \`Cmd+K\` / \`Ctrl+K\` detection, safely disabled when focused inside input, textarea, or contenteditable elements.
- Global \`CommandPalette\` component (\`apps/web/components/app/CommandPalette.tsx\`) with search filtering, keyboard Up/Down arrow selection, Enter execution, Escape dismissal, and shortcut badges.
- Desktop anchored floating popover menu (\`apps/web/components/app/MorePopover.tsx\`) anchored directly to the "More" button in the navigation bar, featuring categorized tools (Workflows vs Tools & Settings), shortcut indicators, outside-click detection, and zero canvas blockage.
- Mobile bottom sheet component (\`apps/web/components/app/MobileBottomSheet.tsx\`) for narrow viewports (< 640px) with grab handle, backdrop fade, touch dismissal, and minimum 44x44px touch targets.
- Integration into \`apps/web/components/app/AppHeader.tsx\` and \`apps/web/components/app/MobileNavBar.tsx\`, retiring the full-screen slide-over \`MoreDrawer\`.
- Comprehensive Vitest unit and component tests in \`apps/web/lib/navigation.test.ts\` and \`apps/web/lib/shortcuts.test.ts\`.

## Out of scope

- Mobile app (React Native) navigation changes (deferred to Milestone L.4, Features 46-47).
- Persistent layout memoization and list selector optimization (deferred to Feature 45).
- Windows WPF client navigation (deferred to Milestone M, Feature 48).
- New API routes, database migrations, or server-side schema alterations.

## Build loop

- Step review: feature (review after the full feature implementation is staged and verified).
- Checkpoint commits: disabled.
- Verification command: \`npm run verify\` (monorepo boundary checks, mobile typecheck/test, web lint, web tests, and production build).

## Build steps

- [x] 1. **Navigation metadata expansion and shortcut definitions:** Update `apps/web/lib/navigation.ts` to define keyboard shortcut sequences, category groupings, and searchable commands for both primary views and secondary tools. Add comprehensive unit tests in `apps/web/lib/navigation.test.ts`.
  - _Done when:_ All navigation items have associated shortcut metadata and tests verify command items and shortcut mappings with zero errors.

- [x] 2. **Global keyboard shortcut sequencer and hook:** Implement `apps/web/hooks/useGlobalShortcuts.ts` and helper functions in `apps/web/lib/shortcuts.ts` to process two-key navigation sequences (`G` then `T`, `F`, `N`, `I`, `P`, `C`, `A`), `Cmd+K` / `Ctrl+K`, and `Alt+C`, ignoring keystrokes when editing text inputs. Add unit tests in `apps/web/lib/shortcuts.test.ts`.
  - _Done when:_ Vitest tests pass for key sequencing, timeout resets, input element suppression, and shortcut routing.

- [x] 3. **Global Command Palette component:** Build `apps/web/components/app/CommandPalette.tsx` providing an instant floating modal triggered by `Cmd+K` or `Ctrl+K`. Include a search input with instant filtering across all views and actions, arrow key item navigation, Enter key execution, Escape closing, and dark obsidian visual styling.
  - _Done when:_ The palette renders cleanly, filters destinations and actions by query, handles keyboard selection and execution, and closes gracefully.

- [x] 4. **Desktop anchored floating popover:** Build `apps/web/components/app/MorePopover.tsx` positioned directly beneath the desktop navigation "More" button with obsidian card styling, clear grouping (Workflows, Tools & Settings), keyboard shortcut hints, badge counts, and click-outside dismissal without body scroll locking.
  - _Done when:_ Clicking "More" on desktop opens a floating dropdown below the button that does not obstruct the main content canvas and dismisses on outside click or Escape.

- [x] 5. **Mobile interactive bottom sheet:** Build `apps/web/components/app/MobileBottomSheet.tsx` (or integrated responsive mode) for viewports under 640px, featuring a grab handle, backdrop blur, smooth slide-up, tap-to-dismiss backdrop, and comfortable touch targets with safe area padding.
  - _Done when:_ Triggering "More" from the mobile bottom navigation opens a slide-up sheet anchored to the bottom with touch targets meeting accessibility guidelines.

- [x] 6. **AppHeader and MobileNavBar integration:** Refactor `apps/web/components/app/AppHeader.tsx` and `apps/web/components/app/MobileNavBar.tsx` to mount `MorePopover`, `MobileBottomSheet`, and `CommandPalette`, wiring shortcut callbacks and removing the obsolete `MoreDrawer.tsx`.
  - _Done when:_ Both desktop header and mobile bottom bar trigger the new navigation interfaces cleanly, `Cmd+K` opens the command palette from any route, and all existing modals (Capture, Backup, Account, About) remain fully operational.

- [x] 7. **End-to-end verification and quality gate:** Run the full verification suite (`npm run verify`) covering application boundary checks, ESLint, Vitest test suites across mobile and web, and Next.js production build.
  - _Done when:_ Boundary check reports zero violations, all unit tests pass, and `next build` compiles cleanly.

## Files / areas

- \`apps/web/lib/navigation.ts\` - navigation items, command definitions, and shortcut bindings
- \`apps/web/lib/navigation.test.ts\` - tests for navigation items and shortcut definitions
- \`apps/web/lib/shortcuts.ts\` - shortcut event helpers and sequence state machine
- \`apps/web/lib/shortcuts.test.ts\` - tests for shortcut sequencer and key combo handlers
- \`apps/web/hooks/useGlobalShortcuts.ts\` - client hook listening to global key sequences
- \`apps/web/components/app/CommandPalette.tsx\` - global command search and execution modal
- \`apps/web/components/app/MorePopover.tsx\` - desktop floating popover anchored to More nav button
- \`apps/web/components/app/MobileBottomSheet.tsx\` - mobile touch-friendly bottom sheet
- \`apps/web/components/app/AppHeader.tsx\` - desktop nav integration and command palette mount
- \`apps/web/components/app/MobileNavBar.tsx\` - mobile bottom bar integration
- \`apps/web/components/app/MoreDrawer.tsx\` - retired legacy slide-over drawer

## Data / contracts

- Navigation Command Interface:
  \`\`\`typescript
  export interface NavCommand {
    id: string;
    title: string;
    description: string;
    category: "navigation" | "actions" | "settings";
    href?: string;
    action?: "capture" | "backup" | "account" | "about" | "theme";
    shortcut?: string;
    badgeCount?: number;
  }
  \`\`\`
- Keyboard Sequence Protocol:
  - Sequence key: \`KeyG\` initiates two-key sequence. Next key within 1000ms triggers target:
    - \`KeyT\`: Navigate to \`/\`
    - \`KeyF\`: Navigate to \`/followups\`
    - \`KeyN\`: Navigate to \`/notes\`
    - \`KeyI\`: Navigate to \`/inbox\`
    - \`KeyP\`: Navigate to \`/plan\`
    - \`KeyC\`: Navigate to \`/calendar\`
    - \`KeyA\`: Navigate to \`/analytics\`
  - Command palette shortcut: \`Meta+K\` or \`Control+K\` toggles the palette.
  - Quick capture: \`Alt+C\` triggers capture modal.
  - Suppression rule: Active element is \`HTMLInputElement\`, \`HTMLTextAreaElement\`, \`HTMLSelectElement\`, or \`isContentEditable === true\`.

## Testing

- Unit tests in \`apps/web/lib/navigation.test.ts\`:
  - Validate all command definitions, categories, and route destinations.
  - Validate shortcut badge extraction and resolution.
- Unit tests in \`apps/web/lib/shortcuts.test.ts\`:
  - Validate sequence handler transitions on \`G\` + key.
  - Validate timeout expiration resets sequence state.
  - Validate suppression when focus is in an input or editable field.
  - Validate \`Cmd+K\` / \`Ctrl+K\` shortcut trigger.
- Verification command: \`npm run verify\` (boundary check, lint, tests, build).

## Notes for the AI

- Do not use em dashes, en dashes, or ellipsis in any code, comments, or documentation.
- Maintain isolated monorepo boundaries: apps/web must not import anything from apps/mobile or apps/windows.
- Desktop popover must be non-blocking: do NOT set \`overflow: hidden\` on \`document.body\` when the desktop popover is open, allowing users to scroll and interact with the canvas naturally.
- Use Tailwind CSS v4 design tokens matching TaskFlow obsidian dark and clean light mode (\`bg-surface\`, \`border-border\`, \`text-text\`, \`text-muted\`, \`accent\`).
- Ensure touch targets on mobile bottom sheet meet the minimum 44x44px accessibility threshold.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":9287,"specSha256":"28c5279daaeb0a099746c1267f52549e6f900a2c2c24991c20654c8dd831f1f6","branch":"refs/heads/feature/web-anchored-popover-navigation-mobile-bottom-sheet-and-command-palette","head":"8aef6ff869c4e7079d55bc88c41c7128baa276d5","baseRef":"refs/heads/main","baseCommit":"8aef6ff869c4e7079d55bc88c41c7128baa276d5","sourceTree":"82a0eed77e6b94df2b6a2692fdce56b8cf8a57cf","absentOptional":[]} -->
