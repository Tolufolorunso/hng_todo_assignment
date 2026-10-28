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
  setActiveWorkspaceId,
  getWorkspace,
  listOutbox,
} from "@/lib/repository";
import type { Task } from "@/types/task";
import type { Note } from "@/types/note";
import type { FollowUp, FollowUpOccurrence } from "@/types/followup";
import type { DailyPlan } from "@/types/plan";
import type { InboxCapture } from "@/types/inbox";

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

  it("adopts followups, occurrences, daily plans, and captures with correct relational mapping", async () => {
    const db = await getDb();
    const accountId = "acc_full_456";
    const expectedWsId = getAccountWorkspaceId(accountId);

    const fu: FollowUp = {
      id: "f1",
      workspaceId: "local",
      personName: "Bob",
      commitment: "Send contract",
      details: "Full details",
      dueAt: "2026-11-01T12:00:00.000Z",
      timeZone: "UTC",
      emailAddress: "bob@example.com",
      phoneNumber: null,
      whatsAppNumber: null,
      preferredAction: null,
      recurrence: null,
      status: "open",
      sourceNoteId: null,
      sourceExcerpt: null,
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
    };

    const occ: FollowUpOccurrence = {
      id: "occ1",
      workspaceId: "local",
      followUpId: "f1",
      dueAt: "2026-11-01T12:00:00.000Z",
      outcome: "completed",
      resolvedAt: "2026-11-01T13:00:00.000Z",
      nextDueAt: null,
      notes: "All done",
    };

    const plan: DailyPlan = {
      id: "p1",
      workspaceId: "local",
      date: "2026-10-25",
      timeZone: "UTC",
      availableMinutes: 240,
      items: [
        {
          id: "item1",
          type: "followup",
          targetId: "f1",
          title: "Send contract to Bob",
          estimatedMinutes: 30,
          completed: false,
          order: 0,
        },
      ],
      acceptedAt: null,
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
    };

    const cap: InboxCapture = {
      id: "c1",
      workspaceId: "local",
      text: "Call Bob about contract",
      sharedUrl: null,
      sourceAppLabel: null,
      capturedAt: "2026-10-25T10:00:00.000Z",
      state: "pending",
      targetType: null,
      targetId: null,
      processedAt: null,
      discardedAt: null,
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
    };

    await db.put("followups", fu);
    await db.put("followup_occurrences", occ);
    await db.put("daily_plans", plan);
    await db.put("inbox_captures", cap);

    const res = await adoptLocalDataIntoAccount(accountId);
    expect(res.followupsCount).toBe(1);
    expect(res.occurrencesCount).toBe(1);
    expect(res.plansCount).toBe(1);
    expect(res.capturesCount).toBe(1);

    const newFuId = res.idMap["f1"];
    const newOccId = res.idMap["occ1"];
    const newPlanId = res.idMap["p1"];
    const newCapId = res.idMap["c1"];

    expect(newFuId).toBeDefined();
    expect(newOccId).toBeDefined();
    expect(newPlanId).toBeDefined();
    expect(newCapId).toBeDefined();

    // Verify occurrence has mapped followUpId
    const adoptedOcc = await db.get("followup_occurrences", newOccId);
    expect(adoptedOcc?.workspaceId).toBe(expectedWsId);
    expect(adoptedOcc?.followUpId).toBe(newFuId);

    // Verify daily plan items have mapped targetId
    const adoptedPlan = await db.get("daily_plans", newPlanId);
    expect(adoptedPlan?.workspaceId).toBe(expectedWsId);
    expect(adoptedPlan?.items[0].targetId).toBe(newFuId);

    // Verify outbox contains all mutations
    const outbox = await listOutbox(expectedWsId);
    expect(outbox).toHaveLength(4);
    const types = outbox.map((m) => m.entityType).sort();
    expect(types).toEqual(["followup", "inbox", "occurrence", "plan"]);
  });

  it("preserves local data untouched and empty account workspace when starting fresh", async () => {
    const db = await getDb();
    const accountId = "acc_fresh_789";
    const accountWsId = getAccountWorkspaceId(accountId);

    // Seed local data
    const localTask: Task = {
      id: "t_local",
      workspaceId: "local",
      title: "Keep local only",
      description: "",
      completed: false,
      priority: "medium",
      dueDate: null,
      category: null,
      createdAt: "2026-10-25T10:00:00.000Z",
      updatedAt: "2026-10-25T10:00:00.000Z",
      completedAt: null,
    };
    await db.put("tasks", localTask);

    // Start fresh: switch active workspace to account without calling adoptLocalDataIntoAccount
    setActiveWorkspaceId(accountWsId);
    expect(getActiveWorkspaceId()).toBe(accountWsId);

    // Local task is still in local workspace
    const localFetched = await db.get("tasks", "t_local");
    expect(localFetched).toBeDefined();
    expect(localFetched?.workspaceId).toBe("local");

    // Account workspace has zero tasks and zero outbox mutations
    const allTasks = await db.getAll("tasks");
    const accountTasks = allTasks.filter((t) => t.workspaceId === accountWsId);
    expect(accountTasks).toHaveLength(0);

    const outbox = await listOutbox(accountWsId);
    expect(outbox).toHaveLength(0);

    // Restoring local workspace restores access to local records
    setActiveWorkspaceId("local");
    expect(getActiveWorkspaceId()).toBe("local");
  });
});
