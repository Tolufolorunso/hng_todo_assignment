# Fix: Calendar day inspector WYSIWYG HTML rendering

**Type:** Fix
**Status:** verified
**Branch:** fix/calendar-inspector-wysiwyg-html
**Fixes:** F-03

## The problem

In `components/calendar/DayInspector.tsx:169-177`:
Task descriptions saved via the Microsoft Word-style WYSIWYG editor contain HTML markup (e.g., `<p>...</p>`, `<b>...</b>`, `<ul>...</ul>`). While `TaskItem.tsx` detects HTML markup and renders formatted rich text, `DayInspector.tsx` renders `{task.description}` directly as a React string child inside a `<p>` tag:

```tsx
{task.description !== "" && (
  <p
    className={`mt-0.5 text-[11px] leading-relaxed ${
      task.completed ? "text-faint line-through" : "text-muted"
    }`}
  >
    {task.description}
  </p>
)}
```

Because React escapes string children, tasks with formatted descriptions display raw HTML markup (e.g., `<p>Buy milk</p>`) when inspected in the calendar day drawer instead of properly styled rich text.

## The fix

In `components/calendar/DayInspector.tsx`:
1. Check whether `task.description` contains HTML using `/<[a-z][\s\S]*>/i.test(task.description)`.
2. When HTML tags are detected, render via `dangerouslySetInnerHTML={{ __html: task.description }}` wrapped in scoped typography styles matching the inspector's compact scale (`text-[11px] leading-relaxed`, with scoped tags for headings, bold, italics, underline, lists, and paragraphs).
3. When plain text without HTML is present, render inside `<p className="whitespace-pre-wrap">{task.description}</p>`.
4. Ensure completion styling (`text-faint line-through` / `opacity-60`) applies consistently in both states.

## Build steps

1. [x] **Update `DayInspector.tsx` to render rich WYSIWYG HTML descriptions**
   - In `components/calendar/DayInspector.tsx`, replace the raw `{task.description}` string interpolation with HTML detection and scoped rich text rendering.
   - Support lists, emphasis, and paragraphs cleanly in the day inspector card.
   - Done when: Tasks with formatted HTML descriptions render bold, italics, and lists properly in the calendar DayInspector without displaying raw markup tags.

2. [x] **Run full verification suite**
   - Run `npm run test`, `npm run lint`, and `npm run build`.
   - Done when: All unit tests pass, zero ESLint warnings, and production build succeeds.

## Verify

1. Navigate to `/` and create or edit a task with a due date, adding rich text formatting in the description (bold, bullet points).
2. Navigate to `/calendar` and click on that date in the calendar grid to open the Day Inspector drawer.
3. Confirm that the task description displays formatted rich text (bold, list items) with zero escaped HTML tags (`<p>`, `<b>`, etc.).
4. Toggle completion on the task to confirm completion styling applies cleanly.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":2772,"specSha256":"154469689f7cf86377d5bf2fced527a39750cc642417de600da5704d4f1a8783","branch":"refs/heads/fix/calendar-inspector-wysiwyg-html","head":"709e4c47f49983d303474a39131c7ad80bb6bbc3","baseRef":"refs/heads/main","baseCommit":"709e4c47f49983d303474a39131c7ad80bb6bbc3","sourceTree":"4db4bd1c5dbcb45243a64d892ccb9af197155aa0","absentOptional":[]} -->
