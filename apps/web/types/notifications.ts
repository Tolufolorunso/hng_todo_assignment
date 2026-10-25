export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export type NotificationPreviewMode = "generic" | "detailed";

export interface ClientPushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  subscriptionId: string | null;
  endpoint: string | null;
  previewMode: NotificationPreviewMode;
  isExpired?: boolean;
}

export interface OverdueFollowUpItem {
  id: string;
  personName: string;
  commitment: string;
  dueAt: string;
  preferredAction: string | null;
  launcherUri: string | null;
}
