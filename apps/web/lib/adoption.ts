import { getDb } from "@/lib/db";
import {
  createWorkspace,
  getWorkspace,
  setActiveWorkspaceId,
  DEFAULT_WORKSPACE_ID,
} from "@/lib/repository";
import type { OutboxMutationRecord, OutboxEntityType } from "@/types/storage";

export function getAccountWorkspaceId(accountId: string): string {
  return `account_${accountId}`;
}

function generateAdoptedId(prefix: string, oldId: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}_adopt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${oldId.slice(0, 8)}`;
}

export async function hasLocalDataToAdopt(
  localWorkspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<boolean> {
  const db = await getDb();
  const tasks = await db.getAll("tasks");
  if (tasks.some((t) => (t.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId)) {
    return true;
  }
  const notes = await db.getAll("notes");
  if (notes.some((n) => (n.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId)) {
    return true;
  }
  const followups = await db.getAll("followups");
  if (followups.some((f) => (f.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId)) {
    return true;
  }
  const plans = await db.getAll("daily_plans");
  if (plans.some((p) => (p.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId)) {
    return true;
  }
  const captures = await db.getAll("inbox_captures");
  if (captures.some((c) => (c.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId)) {
    return true;
  }
  return false;
}

export interface AdoptionResult {
  accountWorkspaceId: string;
  tasksCount: number;
  notesCount: number;
  followupsCount: number;
  occurrencesCount: number;
  plansCount: number;
  capturesCount: number;
  taskOrdersCount: number;
  idMap: Record<string, string>;
}

export async function adoptLocalDataIntoAccount(
  accountId: string,
  localWorkspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<AdoptionResult> {
  const accountWorkspaceId = getAccountWorkspaceId(accountId);
  const now = new Date().toISOString();

  // Ensure account workspace exists
  const existingWs = await getWorkspace(accountWorkspaceId);
  if (!existingWs) {
    await createWorkspace({
      id: accountWorkspaceId,
      name: "Account Workspace",
      type: "account",
      accountId,
    });
  }

  const db = await getDb();

  // Load all local data
  const allTasks = await db.getAll("tasks");
  const localTasks = allTasks.filter(
    (t) => (t.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId
  );

  const allNotes = await db.getAll("notes");
  const localNotes = allNotes.filter(
    (n) => (n.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId
  );

  const allFollowups = await db.getAll("followups");
  const localFollowups = allFollowups.filter(
    (f) => (f.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId
  );

  const allOccurrences = await db.getAll("followup_occurrences");
  const localOccurrences = allOccurrences.filter(
    (o) => (o.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId
  );

  const allPlans = await db.getAll("daily_plans");
  const localPlans = allPlans.filter(
    (p) => (p.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId
  );

  const allCaptures = await db.getAll("inbox_captures");
  const localCaptures = allCaptures.filter(
    (c) => (c.workspaceId ?? DEFAULT_WORKSPACE_ID) === localWorkspaceId
  );

  const localTaskOrder = await db.get("task_orders", localWorkspaceId);

  // Map old local IDs to new adopted IDs so local data remains completely intact
  const idMap: Record<string, string> = {};
  for (const t of localTasks) {
    idMap[t.id] = generateAdoptedId("tsk", t.id);
  }
  for (const n of localNotes) {
    idMap[n.id] = generateAdoptedId("not", n.id);
  }
  for (const f of localFollowups) {
    idMap[f.id] = generateAdoptedId("fol", f.id);
  }
  for (const o of localOccurrences) {
    idMap[o.id] = generateAdoptedId("occ", o.id);
  }
  for (const p of localPlans) {
    idMap[p.id] = generateAdoptedId("pln", p.id);
  }
  for (const c of localCaptures) {
    idMap[c.id] = generateAdoptedId("cap", c.id);
  }

  // Transaction to copy records and enqueue initial outbox mutations
  const tx = db.transaction(
    [
      "tasks",
      "notes",
      "followups",
      "followup_occurrences",
      "daily_plans",
      "inbox_captures",
      "task_orders",
      "outbox",
    ],
    "readwrite"
  );

  const taskStore = tx.objectStore("tasks");
  const noteStore = tx.objectStore("notes");
  const followupStore = tx.objectStore("followups");
  const occurrenceStore = tx.objectStore("followup_occurrences");
  const dailyPlanStore = tx.objectStore("daily_plans");
  const captureStore = tx.objectStore("inbox_captures");
  const orderStore = tx.objectStore("task_orders");
  const outboxStore = tx.objectStore("outbox");

  function queueMutation(
    entityType: OutboxEntityType,
    entityId: string,
    payload: unknown
  ) {
    const mutationId = `mut_adopt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const mutation: OutboxMutationRecord = {
      mutationId,
      workspaceId: accountWorkspaceId,
      protocolVersion: 1,
      entityType,
      entityId,
      action: "put",
      baseRevision: null,
      payload,
      createdAt: new Date().toISOString(),
    };
    return outboxStore.put(mutation);
  }

  // Copy tasks with mapped sourceNoteId
  for (const t of localTasks) {
    const newId = idMap[t.id];
    const cleanTask = { ...t, revision: undefined };
    const adopted = {
      ...cleanTask,
      id: newId,
      workspaceId: accountWorkspaceId,
      sourceNoteId: t.sourceNoteId ? idMap[t.sourceNoteId] ?? t.sourceNoteId : null,
    };
    await taskStore.put(adopted);
    await queueMutation("task", adopted.id, adopted);
  }

  // Copy notes
  for (const n of localNotes) {
    const newId = idMap[n.id];
    const cleanNote = { ...n, revision: undefined };
    const adopted = {
      ...cleanNote,
      id: newId,
      workspaceId: accountWorkspaceId,
    };
    await noteStore.put(adopted);
    await queueMutation("note", adopted.id, adopted);
  }

  // Copy followups with mapped sourceNoteId
  for (const f of localFollowups) {
    const newId = idMap[f.id];
    const cleanFu = { ...f, revision: undefined };
    const adopted = {
      ...cleanFu,
      id: newId,
      workspaceId: accountWorkspaceId,
      sourceNoteId: f.sourceNoteId ? idMap[f.sourceNoteId] ?? f.sourceNoteId : null,
    };
    await followupStore.put(adopted);
    await queueMutation("followup", adopted.id, adopted);
  }

  // Copy occurrences with mapped followUpId
  for (const o of localOccurrences) {
    const newId = idMap[o.id];
    const cleanOcc = { ...o, revision: undefined };
    const adopted = {
      ...cleanOcc,
      id: newId,
      workspaceId: accountWorkspaceId,
      followUpId: idMap[o.followUpId] ?? o.followUpId,
    };
    await occurrenceStore.put(adopted);
    await queueMutation("occurrence", adopted.id, adopted);
  }

  // Copy daily plans with mapped item targetIds
  for (const p of localPlans) {
    const newId = idMap[p.id];
    const cleanPlan = { ...p, revision: undefined };
    const mappedItems = p.items.map((item) => ({
      ...item,
      id: generateAdoptedId("item", item.id),
      targetId: idMap[item.targetId] ?? item.targetId,
    }));
    const adopted = {
      ...cleanPlan,
      id: newId,
      workspaceId: accountWorkspaceId,
      items: mappedItems,
    };
    await dailyPlanStore.put(adopted);
    await queueMutation("plan", adopted.id, adopted);
  }

  // Copy inbox captures with mapped targetId
  for (const c of localCaptures) {
    const newId = idMap[c.id];
    const cleanCap = { ...c, revision: undefined };
    const adopted = {
      ...cleanCap,
      id: newId,
      workspaceId: accountWorkspaceId,
      targetId: c.targetId ? idMap[c.targetId] ?? c.targetId : null,
    };
    await captureStore.put(adopted);
    await queueMutation("inbox", adopted.id, adopted);
  }

  // Copy task order if present with mapped orderedIds
  let taskOrdersCount = 0;
  if (localTaskOrder) {
    const mappedOrderedIds = localTaskOrder.orderedIds.map((id) => idMap[id] ?? id);
    const adoptedOrder = {
      id: accountWorkspaceId,
      workspaceId: accountWorkspaceId,
      orderedIds: mappedOrderedIds,
      updatedAt: now,
    };
    await orderStore.put(adoptedOrder);
    await queueMutation("task_order", adoptedOrder.id, adoptedOrder);
    taskOrdersCount = 1;
  }

  await tx.done;

  // Switch active workspace to the new account workspace
  setActiveWorkspaceId(accountWorkspaceId);

  return {
    accountWorkspaceId,
    tasksCount: localTasks.length,
    notesCount: localNotes.length,
    followupsCount: localFollowups.length,
    occurrencesCount: localOccurrences.length,
    plansCount: localPlans.length,
    capturesCount: localCaptures.length,
    taskOrdersCount,
    idMap,
  };
}
