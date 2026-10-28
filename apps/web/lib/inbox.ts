import { validateCaptureInput } from "@/lib/validation";
import { createTask, getTask } from "@/lib/tasks";
import { createNote, getNote } from "@/lib/notes";
import { createFollowUp, getFollowUp } from "@/lib/followups";
import {
  getActiveWorkspaceId,
  createInboxCapture as repoCreateInboxCapture,
  getInboxCapture as repoGetInboxCapture,
  listInboxCaptures as repoListInboxCaptures,
  updateInboxCapture as repoUpdateInboxCapture,
  deleteInboxCapture as repoDeleteInboxCapture,
} from "@/lib/repository";
import type {
  InboxCapture,
  InboxCaptureState,
  CreateCaptureInput,
  ProcessCaptureAction,
  ProcessCaptureResult,
} from "@/types/inbox";

export async function createCapture(input: CreateCaptureInput): Promise<InboxCapture> {
  const validated = validateCaptureInput(input);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const workspaceId = getActiveWorkspaceId();
  return repoCreateInboxCapture(
    {
      text: validated.value.text,
      sharedUrl: validated.value.sharedUrl,
      sourceAppLabel: validated.value.sourceAppLabel,
    },
    { workspaceId }
  );
}

export async function getCapture(id: string): Promise<InboxCapture | null> {
  const workspaceId = getActiveWorkspaceId();
  return repoGetInboxCapture(id, { workspaceId });
}

export async function listCaptures(filter?: {
  state?: InboxCaptureState;
}): Promise<InboxCapture[]> {
  const workspaceId = getActiveWorkspaceId();
  const captures = await repoListInboxCaptures({
    workspaceId,
    state: filter?.state,
  });

  // Sort by capturedAt descending (newest first)
  return captures.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export async function getPendingCapturesCount(): Promise<number> {
  const captures = await listCaptures({ state: "pending" });
  return captures.length;
}

export async function updateCapture(
  id: string,
  patch: Partial<InboxCapture>
): Promise<InboxCapture> {
  const workspaceId = getActiveWorkspaceId();
  return repoUpdateInboxCapture(id, patch, { workspaceId });
}

export async function discardCapture(id: string): Promise<InboxCapture> {
  const workspaceId = getActiveWorkspaceId();
  return repoUpdateInboxCapture(
    id,
    {
      state: "discarded",
    },
    { workspaceId }
  );
}

export async function deleteCapture(id: string): Promise<void> {
  const workspaceId = getActiveWorkspaceId();
  await repoDeleteInboxCapture(id, { workspaceId });
}

function deriveTitle(text: string, fallback: string): string {
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length > 0) {
    return firstLine.length > 100 ? firstLine.slice(0, 100) : firstLine;
  }
  return fallback;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function processCapture(
  captureId: string,
  action: ProcessCaptureAction
): Promise<ProcessCaptureResult> {
  const capture = await getCapture(captureId);
  if (!capture) {
    throw new Error(`Capture with id ${captureId} not found.`);
  }

  // Idempotency: if already processed into the requested target, return existing
  if (
    capture.state === "processed" &&
    capture.targetType === action.targetType &&
    capture.targetId
  ) {
    if (action.targetType === "task") {
      const task = await getTask(capture.targetId);
      if (task) {
        return {
          capture,
          targetType: "task",
          targetId: task.id,
          isExisting: true,
        };
      }
    } else if (action.targetType === "note") {
      const note = await getNote(capture.targetId);
      if (note) {
        return {
          capture,
          targetType: "note",
          targetId: note.id,
          isExisting: true,
        };
      }
    } else if (action.targetType === "followup") {
      const followup = await getFollowUp(capture.targetId);
      if (followup) {
        return {
          capture,
          targetType: "followup",
          targetId: followup.id,
          isExisting: true,
        };
      }
    }
  }

  let createdTargetId: string;
  const now = new Date().toISOString();

  if (action.targetType === "task") {
    const title = action.title?.trim() || deriveTitle(capture.text, "Captured Task");
    const description = capture.sharedUrl
      ? `${capture.text}\n\nShared Link: ${capture.sharedUrl}`
      : capture.text;

    const task = await createTask({
      title,
      description,
      priority: action.priority ?? "medium",
      category: action.category ?? null,
      dueDate: action.dueDate ?? null,
    });
    createdTargetId = task.id;
  } else if (action.targetType === "note") {
    const title = action.title?.trim() || deriveTitle(capture.text, "Captured Note");
    const escapedText = escapeHtml(capture.text).replace(/\n/g, "<br />");
    let body = `<p>${escapedText}</p>`;
    if (capture.sharedUrl) {
      body += `<p><a href="${escapeHtml(capture.sharedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(capture.sharedUrl)}</a></p>`;
    }

    const note = await createNote({
      title,
      body,
    });
    createdTargetId = note.id;
  } else if (action.targetType === "followup") {
    const personName = action.personName?.trim() || "Contact";
    const commitment =
      action.commitment?.trim() ||
      action.title?.trim() ||
      deriveTitle(capture.text, "Follow up on capture");

    const dueAt = action.dueDate
      ? new Date(action.dueDate).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const followup = await createFollowUp({
      personName,
      commitment,
      details: capture.text,
      dueAt,
    });
    createdTargetId = followup.id;
  } else {
    throw new Error(`Unsupported target type: ${(action as { targetType: string }).targetType}`);
  }

  const updatedCapture = await updateCapture(captureId, {
    state: "processed",
    targetType: action.targetType,
    targetId: createdTargetId,
    processedAt: now,
  });

  return {
    capture: updatedCapture,
    targetType: action.targetType,
    targetId: createdTargetId,
    isExisting: false,
  };
}
