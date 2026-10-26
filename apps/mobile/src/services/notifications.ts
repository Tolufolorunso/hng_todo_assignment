import type { FollowUp } from "../types/followup.js";

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  triggerAt: string;
  type: "followup_reminder" | "plan_checkin";
  targetId?: string;
}

export class NotificationScheduler {
  private scheduled: Map<string, ScheduledNotification> = new Map();

  async scheduleFollowUpReminder(
    followUp: FollowUp,
    minutesBefore = 15
  ): Promise<ScheduledNotification> {
    const dueTime = new Date(followUp.dueAt).getTime();
    const triggerTime = new Date(dueTime - minutesBefore * 60 * 1000);
    const triggerAt = triggerTime.toISOString();

    const id = "notif_fu_" + followUp.id;
    const notification: ScheduledNotification = {
      id,
      title: `Upcoming: ${followUp.personName}`,
      body: followUp.commitment,
      triggerAt,
      type: "followup_reminder",
      targetId: followUp.id,
    };

    this.scheduled.set(id, notification);
    return notification;
  }

  async scheduleDailyPlanReminder(
    targetDate: string,
    time = "09:00",
    message = "Time to review your Plan My Day capacity and schedule!"
  ): Promise<ScheduledNotification> {
    const triggerAt = `${targetDate}T${time}:00.000Z`;
    const id = `notif_plan_${targetDate}`;

    const notification: ScheduledNotification = {
      id,
      title: "Plan My Day Check-in",
      body: message,
      triggerAt,
      type: "plan_checkin",
      targetId: targetDate,
    };

    this.scheduled.set(id, notification);
    return notification;
  }

  async cancel(id: string): Promise<boolean> {
    return this.scheduled.delete(id);
  }

  async cancelByTargetId(targetId: string): Promise<number> {
    let count = 0;
    for (const [id, notif] of this.scheduled.entries()) {
      if (notif.targetId === targetId) {
        this.scheduled.delete(id);
        count++;
      }
    }
    return count;
  }

  async listPending(): Promise<ScheduledNotification[]> {
    const now = new Date().toISOString();
    return Array.from(this.scheduled.values())
      .filter((n) => n.triggerAt >= now)
      .sort((a, b) => a.triggerAt.localeCompare(b.triggerAt));
  }
}

export const notificationScheduler = new NotificationScheduler();
