# Feature: Analytics and productivity insights (/analytics)

**From build-plan:** feature 13
**Build attempt:** 1
**Branch:** feature/analytics-and-productivity-insights
**Status:** verified

## Goal

Provide users with a dedicated productivity and analytics dashboard at `/analytics`. The page analyzes their offline-stored tasks to compute and visualize completion rates, productivity velocity, category distribution breakdowns, priority splits, and due date health stats. All calculations are performed in-memory on the client without external telemetry or heavy third-party charting libraries, utilizing modern SVG gauges and CSS bar charts aligned with Milestone E's SaaS aesthetic.

## Design reference

Modern SaaS analytics dashboards (Linear Insights, Raycast, and Vercel Analytics style):
- Productivity Health Hero Card:
  - Circular SVG completion ring gauge with percentage in center.
  - Overall status rating badge (e.g. "Peak Focus", "Steady Progress", "Action Needed").
  - Contextual summary text based on active vs overdue ratio.
- Key Metrics Summary Grid (4 cards):
  - Total Tasks, Completed, Active in Progress, and Overdue items.
- Category Distribution Card:
  - Progress bar breakdowns for each curated category (Work, Personal, Urgent, Study, Ideas, Unassigned) using authentic brand colors.
  - Count, percentage of total, and completion rate within each category.
- Priority Split Card:
  - Visual distribution of High, Medium, Low priority tasks.
  - Highlighting high-priority tasks requiring urgent attention.
- Recent Activity & Velocity (7-Day Trend):
  - Pure CSS/SVG bar chart showing tasks completed over the last 7 days.
- Schedule Health Breakdown:
  - Segments showing Overdue, Due Today, Due Upcoming, and Unscheduled backlog items.

## In scope

1. **Analytics metrics calculation (`lib/analytics.ts`, `lib/analytics.test.ts`):**
   - Pure functions to compute summary metrics: total, completed, active, completion percentage, overdue count, due today count.
   - Category distribution statistics (total, completed, rate per category).
   - Priority distribution statistics (high, medium, low counts and completion rate).
   - 7-day completion velocity calculation based on `completedAt` timestamps and current date.
   - Productivity score and rating generator.
   - Comprehensive Vitest unit tests verifying calculations, empty task arrays, and boundary cases.
2. **Analytics visualization components (`components/analytics/`):**
   - Metric overview cards with subtle hover lift and icons.
   - Visual progress bars for category and priority distributions.
   - Pure CSS/SVG 7-day completion velocity chart with day labels.
   - Circular SVG completion gauge for productivity health.
3. **Analytics screen & page integration (`components/analytics/AnalyticsScreen.tsx`, `app/analytics/page.tsx`):**
   - Full client screen loading live IndexedDB tasks via `listTasks()`.
   - Polished empty state with quick navigation link when no tasks exist.
   - Responsive widescreen desktop workspace layout (`max-w-6xl`).

## Out of scope

- External telemetry, third-party analytics scripts, or tracking cookies (100% browser-local privacy).
- Heavy external charting dependencies (Chart.js, Recharts, D3); everything is built with native React, Tailwind CSS, and lightweight SVG.
- JSON data backup and restore (Feature 14).

## Build loop

- Step review mode: feature
- Checkpoint commits: disabled

## Build steps

1. [x] **Implement analytics calculation logic in `lib/analytics.ts` and tests in `lib/analytics.test.ts`**
   - Implement summary stats, category distribution, priority distribution, 7-day velocity, and productivity score calculations.
   - Add unit tests verifying percentages, division by zero protection, 7-day rolling window math, and edge cases.
   - Done when: `npm run test` passes with full coverage on analytics functions.

2. [x] **Create analytics visual cards and chart components**
   - Build metrics summary cards, category progress breakdown, priority split card, and 7-day velocity bar chart in `components/analytics/`.
   - Ensure color accents match existing design tokens (work: sky, personal: purple, urgent: rose, study: emerald, ideas: amber).
   - Done when: Components render crisp, responsive visual charts and cards.

3. [x] **Assemble `AnalyticsScreen.tsx` and integrate into `app/analytics/page.tsx`**
   - Connect live IndexedDB task loading, loading/error states, and empty state handling.
   - Replace placeholder in `app/analytics/page.tsx` with full interactive `AnalyticsScreen`.
   - Done when: Visiting `/analytics` displays live productivity metrics and charts derived from stored tasks.

4. [x] **Run full verification suite**
   - Execute `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero linter warnings, and production Next.js build compiles with no errors.

## Files / areas

- `lib/analytics.ts`
- `lib/analytics.test.ts`
- `components/analytics/AnalyticsCards.tsx`
- `components/analytics/AnalyticsScreen.tsx`
- `app/analytics/page.tsx`

## Data / contracts

- `AnalyticsSummary`:
  ```typescript
  interface AnalyticsSummary {
    total: number;
    completed: number;
    active: number;
    completionRate: number; // 0 - 100 integer
    overdue: number;
    dueToday: number;
    highPriorityActive: number;
    productivityScore: number; // 0 - 100
    productivityRating: "Peak Focus" | "On Track" | "Steady" | "Action Needed";
  }
  ```
- `CategoryMetric`:
  ```typescript
  interface CategoryMetric {
    category: TaskCategory | "unassigned";
    label: string;
    total: number;
    completed: number;
    percentageOfTotal: number;
    completionRate: number;
  }
  ```
- `PriorityMetric`:
  ```typescript
  interface PriorityMetric {
    priority: TaskPriority;
    label: string;
    total: number;
    completed: number;
    active: number;
    percentageOfTotal: number;
  }
  ```
- `VelocityDay`:
  ```typescript
  interface VelocityDay {
    isoDate: string;
    dayLabel: string;
    completedCount: number;
  }
  ```

## Testing

- Unit tests (`npm run test`):
  - Verification of calculations with empty task list, all completed, all active, overdue tasks, and varied categories/priorities.
  - Accurate rolling 7-day velocity mapping.
- Linter (`npm run lint`): ESLint clean with zero errors or warnings.
- Production build (`npm run build`): Next.js 16 App Router build succeeds with zero type errors.

## Notes for the AI

- Use proportional engineering: lightweight SVG and Tailwind CSS utilities; avoid heavy chart libraries.
- Zero em dashes in comments, documentation, or UI text.
- Maintain high accessibility with proper headings, ARIA roles, and readable contrast.

## Open questions

None.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6766,"specSha256":"c38bc5ef10cfef8359cab67c5cd5dabc35b1dabaed574af98911487bfd7494fb","branch":"refs/heads/feature/analytics-and-productivity-insights","head":"990c9c57806e787d1ed68237f4d60fbad937832a","baseRef":"refs/heads/main","baseCommit":"990c9c57806e787d1ed68237f4d60fbad937832a","sourceTree":"a7bbcbc6de9f8d90210ebcb50982534d29651de7","absentOptional":[]} -->
