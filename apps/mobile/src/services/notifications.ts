import * as Notifications from "expo-notifications";
import type { FollowUp } from "../types/followup.js";

// Configure default notification presentation behavior
try {
  if (typeof Notifications.setNotificationHandler === "function") {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch {
  // Graceful fallback for non-native environments
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  triggerAt: string;
  type: "followup_reminder" | "plan_checkin";
  targetId?: string;
  nativeId?: string;
}

export class NotificationScheduler {
  private scheduled: Map<string, ScheduledNotification> = new Map();

  async requestPermission(): Promise<boolean> {
    try {
      if (typeof Notifications.requestPermissionsAsync === "function") {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === "granted";
      }
    } catch {
      // Non-native fallback
    }
    return true;
  }

  async scheduleFollowUpReminder(
    followUp: FollowUp,
    minutesBefore = 15
  ): Promise<ScheduledNotification> {
    const dueTime = new Date(followUp.dueAt).getTime();
    const triggerTime = new Date(dueTime - minutesBefore * 60 * 1000);
    const triggerAt = triggerTime.toISOString();

    const id = "notif_fu_" + followUp.id;
    const title = `Upcoming: ${followUp.personName}`;
    const body = followUp.commitment;

    let nativeId: string | undefined;
    try {
      if (typeof Notifications.scheduleNotificationAsync === "function") {
        nativeId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: "followup_reminder", targetId: followUp.id },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
          },
        });
      }
    } catch {
      // In-memory fallback if native notification fails
    }

    const notification: ScheduledNotification = {
      id,
      title,
      body,
      triggerAt,
      type: "followup_reminder",
      targetId: followUp.id,
      nativeId,
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
    const title = "Plan My Day Check-in";
    const body = message;

    let nativeId: string | undefined;
    try {
      if (typeof Notifications.scheduleNotificationAsync === "function") {
        const triggerTime = new Date(triggerAt);
        nativeId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: "plan_checkin", targetId: targetDate },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerTime,
          },
        });
      }
    } catch {
      // In-memory fallback
    }

    const notification: ScheduledNotification = {
      id,
      title,
      body,
      triggerAt,
      type: "plan_checkin",
      targetId: targetDate,
      nativeId,
    };

    this.scheduled.set(id, notification);
    return notification;
  }

  async cancel(id: string): Promise<boolean> {
    const existing = this.scheduled.get(id);
    if (!existing) return false;

    if (existing.nativeId && typeof Notifications.cancelScheduledNotificationAsync === "function") {
      try {
        await Notifications.cancelScheduledNotificationAsync(existing.nativeId);
      } catch {
        // Suppress native cancellation error
      }
    }

    return this.scheduled.delete(id);
  }

  async cancelByTargetId(targetId: string): Promise<number> {
    let count = 0;
    for (const [id, notif] of this.scheduled.entries()) {
      if (notif.targetId === targetId) {
        if (notif.nativeId && typeof Notifications.cancelScheduledNotificationAsync === "function") {
          try {
            await Notifications.cancelScheduledNotificationAsync(notif.nativeId);
          } catch {
            // Suppress native cancellation error
          }
        }
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

  clear(): void {
    this.scheduled.clear();
  }
}

export const notificationScheduler = new NotificationScheduler();
