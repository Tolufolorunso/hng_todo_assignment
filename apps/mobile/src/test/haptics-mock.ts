export enum ImpactFeedbackStyle {
  Light = "light",
  Medium = "medium",
  Heavy = "heavy",
  Rigid = "rigid",
  Soft = "soft",
}

export enum NotificationFeedbackType {
  Success = "success",
  Warning = "warning",
  Error = "error",
}

export const hapticLog: string[] = [];

export function clearHapticLog(): void {
  hapticLog.length = 0;
}

export async function impactAsync(
  style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium
): Promise<void> {
  hapticLog.push(`impact:${style}`);
}

export async function notificationAsync(
  type: NotificationFeedbackType = NotificationFeedbackType.Success
): Promise<void> {
  hapticLog.push(`notification:${type}`);
}

export async function selectionAsync(): Promise<void> {
  hapticLog.push("selection");
}

export default {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
  hapticLog,
  clearHapticLog,
};
