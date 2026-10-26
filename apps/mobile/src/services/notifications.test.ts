import { describe, it, expect, beforeEach } from "vitest";
import { NotificationScheduler } from "./notifications.js";
import type { FollowUp } from "../types/followup.js";

describe("NotificationScheduler", () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
  });

  const sampleFollowUp: FollowUp = {
    id: "fu_123",
    personName: "Alice Walker",
    commitment: "Send quarterly financial projection",
    details: "Reviewed with team",
    dueAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    timeZone: "UTC",
    status: "open",
    preferredAction: "email",
    emailAddress: "alice@example.com",
    phoneNumber: null,
    whatsAppNumber: null,
    recurrence: null,
    sourceNoteId: null,
    sourceExcerpt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("schedules follow-up reminder 15 minutes before due time", async () => {
    const notif = await scheduler.scheduleFollowUpReminder(sampleFollowUp, 15);
    expect(notif.id).toBe("notif_fu_fu_123");
    expect(notif.title).toBe("Upcoming: Alice Walker");
    expect(notif.body).toBe("Send quarterly financial projection");
    expect(notif.type).toBe("followup_reminder");
    expect(notif.targetId).toBe("fu_123");
    expect(notif.nativeId).toBeDefined();

    const dueTime = new Date(sampleFollowUp.dueAt).getTime();
    const triggerTime = new Date(notif.triggerAt).getTime();
    expect(dueTime - triggerTime).toBe(15 * 60 * 1000);
  });

  it("schedules daily plan check-in reminder", async () => {
    const notif = await scheduler.scheduleDailyPlanReminder("2026-10-30", "08:30");
    expect(notif.id).toBe("notif_plan_2026-10-30");
    expect(notif.title).toBe("Plan My Day Check-in");
    expect(notif.type).toBe("plan_checkin");
    expect(notif.triggerAt).toBe("2026-10-30T08:30:00.000Z");
    expect(notif.nativeId).toBeDefined();
  });

  it("cancels a scheduled notification by id", async () => {
    const notif = await scheduler.scheduleFollowUpReminder(sampleFollowUp);
    const cancelled = await scheduler.cancel(notif.id);
    expect(cancelled).toBe(true);

    const pending = await scheduler.listPending();
    expect(pending.find((n) => n.id === notif.id)).toBeUndefined();
  });

  it("cancels scheduled notifications by target id", async () => {
    await scheduler.scheduleFollowUpReminder(sampleFollowUp);
    const count = await scheduler.cancelByTargetId("fu_123");
    expect(count).toBe(1);

    const pending = await scheduler.listPending();
    expect(pending.find((n) => n.targetId === "fu_123")).toBeUndefined();
  });

  it("requests permissions successfully", async () => {
    const granted = await scheduler.requestPermission();
    expect(granted).toBe(true);
  });
});
