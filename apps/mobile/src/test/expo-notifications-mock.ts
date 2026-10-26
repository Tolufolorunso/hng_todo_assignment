export enum SchedulableTriggerInputTypes {
  CALENDAR = "calendar",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  DATE = "date",
  TIME_INTERVAL = "timeInterval",
}

export interface NotificationRequestInput {
  content: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: boolean | string;
  };
  trigger: {
    type?: SchedulableTriggerInputTypes;
    date?: Date | number;
    seconds?: number;
    repeats?: boolean;
  } | null;
}

const scheduledNotifications = new Map<string, NotificationRequestInput>();
let idCounter = 1;

export async function scheduleNotificationAsync(
  request: NotificationRequestInput
): Promise<string> {
  const id = `expo_notif_${idCounter++}`;
  scheduledNotifications.set(id, request);
  return id;
}

export async function cancelScheduledNotificationAsync(
  identifier: string
): Promise<void> {
  scheduledNotifications.delete(identifier);
}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  scheduledNotifications.clear();
}

export async function getAllScheduledNotificationsAsync(): Promise<
  Array<{ identifier: string; content: NotificationRequestInput["content"] }>
> {
  return Array.from(scheduledNotifications.entries()).map(([id, req]) => ({
    identifier: id,
    content: req.content,
  }));
}

export function setNotificationHandler(_handler: unknown): void {
  // no-op in headless test environment
}

export async function requestPermissionsAsync(): Promise<{ status: string }> {
  return { status: "granted" };
}

export function __resetMockNotifications(): void {
  scheduledNotifications.clear();
  idCounter = 1;
}

export default {
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getAllScheduledNotificationsAsync,
  setNotificationHandler,
  requestPermissionsAsync,
  __resetMockNotifications,
};
