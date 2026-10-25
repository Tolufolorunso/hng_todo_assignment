import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { deleteDb, getDb } from "@/lib/db";
import {
  adoptLocalDataIntoAccount,
  getAccountWorkspaceId,
  hasLocalDataToAdopt,
} from "@/lib/adoption";
import {
  getActiveWorkspaceId,
  getWorkspace,
  listOutbox,
} from "@/lib/repository";
import type { Task } from "@/types/task";
import type { Note } from "@/types/note";

describe("local data adoption", () => {
  beforeEach(async () => {
    await deleteDb();
  });

  it("checks whether local workspace has data to adopt", async () => {
    expect(await hasLocalDataToAdopt()).toBe(false);

    const db = await getDb();
    const task: Task = {
      id: "t1",
      workspaceId: "local",
      title: "Local task",
      description: "Description",
      completed: false,
      priority: "medium",
      dueDate: null,
      category: "work",
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
      completedAt: null,
    };
    await db.put("tasks", task);

    expect(await hasLocalDataToAdopt()).toBe(true);
  });

  it("adopts all local entities into account workspace with staged outbox mutations", async () => {
    const db = await getDb();
    const accountId = "acc_user_123";
    const expectedWsId = getAccountWorkspaceId(accountId);

    const task: Task = {
      id: "t1",
      workspaceId: "local",
      title: "Local task",
      description: "Description",
      completed: false,
      priority: "medium",
      dueDate: null,
      category: "work",
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
      completedAt: null,
      sourceNoteId: "n1",
    };
    const note: Note = {
      id: "n1",
      workspaceId: "local",
      title: "Local note",
      body: "Note body",
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
    };
    await db.put("tasks", task);
    await db.put("notes", note);
    await db.put("task_orders", {
      id: "local",
      workspaceId: "local",
      orderedIds: ["t1"],
      updatedAt: "2026-10-25T10:00:00.000Z",
    });

    const res = await adoptLocalDataIntoAccount(accountId);
    expect(res.accountWorkspaceId).toBe(expectedWsId);
    expect(res.tasksCount).toBe(1);
    expect(res.notesCount).toBe(1);
    expect(res.taskOrdersCount).toBe(1);

    // Verify account workspace was created
    const ws = await getWorkspace(expectedWsId);
    expect(ws?.type).toBe("account");
    expect(ws?.accountId).toBe(accountId);

    // Verify active workspace was switched
    expect(getActiveWorkspaceId()).toBe(expectedWsId);

    // Verify original local records remain completely intact
    const originalTask = await db.get("tasks", "t1");
    expect(originalTask?.workspaceId).toBe("local");
    const originalNote = await db.get("notes", "n1");
    expect(originalNote?.workspaceId).toBe("local");

    // Verify adopted records exist in account workspace with mapped IDs
    const newTaskId = res.idMap["t1"];
    const newNoteId = res.idMap["n1"];
    expect(newTaskId).toBeDefined();
    expect(newNoteId).toBeDefined();

    const adoptedTask = await db.get("tasks", newTaskId);
    expect(adoptedTask?.workspaceId).toBe(expectedWsId);
    expect(adoptedTask?.sourceNoteId).toBe(newNoteId);

    const adoptedOrder = await db.get("task_orders", expectedWsId);
    expect(adoptedOrder?.orderedIds).toEqual([newTaskId]);

    // Verify outbox mutations were enqueued in account workspace
    const outbox = await listOutbox(expectedWsId);
    expect(outbox).toHaveLength(3); // 1 task + 1 note + 1 task order
    const types = outbox.map((m) => m.entityType).sort();
    expect(types).toEqual(["note", "task", "task_order"]);
  });
});
