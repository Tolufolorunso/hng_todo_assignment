import { describe, expect, it } from "vitest";
import {
  filterTasksByCategory,
  filterTasksByStatus,
  searchTasks,
  sortTasks,
  interleaveReorderedTasks,
  type TaskCategoryFilter,
  type TaskSortKey,
  type TaskStatusFilter,
} from "@/lib/tasks";
import { filterNotes } from "@/lib/notes";
import { createExcerpt } from "@/lib/html";
import type { Task, TaskPriority } from "@/types/task";
import type { Note } from "@/types/note";

function computeVisibleTasks(
  tasks: Task[],
  query: string,
  statusFilter: TaskStatusFilter,
  categoryFilter: TaskCategoryFilter,
  sort: TaskSortKey,
): Task[] {
  return sortTasks(
    filterTasksByCategory(
      filterTasksByStatus(searchTasks(tasks, query), statusFilter),
      categoryFilter,
    ),
    sort,
  );
}

function createSampleTask(index: number, priority: TaskPriority = "medium"): Task {
  return {
    id: `task-${index}`,
    title: `Task item ${index}`,
    description: `Description for task ${index}`,
    completed: index % 2 === 0,
    priority,
    dueDate: index % 3 === 0 ? "2026-10-30" : null,
    category: index % 2 === 0 ? "work" : "personal",
    order: index,
    createdAt: new Date(1700000000000 + index * 1000).toISOString(),
    updatedAt: new Date(1700000000000 + index * 1000).toISOString(),
    completedAt: index % 2 === 0 ? new Date(1700000000000 + index * 1000).toISOString() : null,
  };
}

describe("Performance and Selector Memoization", () => {
  it("memoized selector returns referentially stable output when inputs are unchanged", () => {
    const tasks = [
      createSampleTask(1, "high"),
      createSampleTask(2, "low"),
      createSampleTask(3, "medium"),
    ];

    let cachedInputs: [Task[], string, TaskStatusFilter, TaskCategoryFilter, TaskSortKey] | null = null;
    let cachedResult: Task[] | null = null;

    function getMemoizedVisibleTasks(
      t: Task[],
      q: string,
      s: TaskStatusFilter,
      c: TaskCategoryFilter,
      k: TaskSortKey,
    ): Task[] {
      if (
        cachedInputs &&
        cachedInputs[0] === t &&
        cachedInputs[1] === q &&
        cachedInputs[2] === s &&
        cachedInputs[3] === c &&
        cachedInputs[4] === k &&
        cachedResult !== null
      ) {
        return cachedResult;
      }
      cachedInputs = [t, q, s, c, k];
      cachedResult = computeVisibleTasks(t, q, s, c, k);
      return cachedResult;
    }

    const firstRun = getMemoizedVisibleTasks(tasks, "", "all", "all", "manual");
    const secondRun = getMemoizedVisibleTasks(tasks, "", "all", "all", "manual");

    // Exact reference equality confirms memoization bypasses re-filtering and re-sorting
    expect(secondRun).toBe(firstRun);
    expect(firstRun.length).toBe(3);

    // Filter change triggers recomputation
    const activeRun = getMemoizedVisibleTasks(tasks, "", "active", "all", "manual");
    expect(activeRun).not.toBe(firstRun);
    expect(activeRun.length).toBe(2);
  });

  it("handles high volume task filtering and sorting within milliseconds", () => {
    const largeDataset: Task[] = Array.from({ length: 500 }, (_, i) =>
      createSampleTask(i, i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low"),
    );

    const start = performance.now();
    const result = computeVisibleTasks(largeDataset, "item 1", "active", "work", "priority");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(150); // Generous ceiling, typically runs in < 2ms
    expect(Array.isArray(result)).toBe(true);
  });

  it("interleaveReorderedTasks efficiently maintains relative ordering at scale", () => {
    const tasks = Array.from({ length: 100 }, (_, i) => createSampleTask(i));
    const reorderedVisible = [tasks[30], tasks[10], tasks[20]];

    const start = performance.now();
    const interleaved = interleaveReorderedTasks(tasks, reorderedVisible);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(interleaved.length).toBe(100);
    expect(interleaved.indexOf(tasks[30])).toBeLessThan(interleaved.indexOf(tasks[10]));
    expect(interleaved.indexOf(tasks[10])).toBeLessThan(interleaved.indexOf(tasks[20]));
  });

  it("note excerpt caching avoids redundant html stripping", () => {
    const htmlBody = "<p>Meeting notes: <strong>Action items</strong> for the team project.</p>";
    
    // Simulate memoized excerpt cache
    const cache = new Map<string, string>();
    function getExcerpt(body: string, maxLength: number = 120): string {
      const cached = cache.get(body);
      if (cached !== undefined) return cached;
      const computed = createExcerpt(body, maxLength);
      cache.set(body, computed);
      return computed;
    }

    const excerpt1 = getExcerpt(htmlBody);
    const excerpt2 = getExcerpt(htmlBody);

    expect(excerpt1).toBe("Meeting notes: Action items for the team project.");
    expect(excerpt1).toBe(excerpt2);
    expect(cache.size).toBe(1);
  });

  it("filters notes efficiently without regex bottlenecks", () => {
    const notes: Note[] = Array.from({ length: 100 }, (_, i) => ({
      id: `note-${i}`,
      title: `Project documentation ${i}`,
      body: `<p>Detailed body content for note ${i} with <strong>formatting</strong>.</p>`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const start = performance.now();
    const matched = filterNotes(notes, "documentation 4");
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(matched.length).toBeGreaterThan(0);
  });
});
