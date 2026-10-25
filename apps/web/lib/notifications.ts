import type {
  ClientPushSubscriptionState,
  NotificationPermissionState,
  NotificationPreviewMode,
  OverdueFollowUpItem,
} from "@/types/notifications";
import type { FollowUp } from "@/types/followup";
import {
  getEmailLauncherUri,
  getWhatsAppLauncherUri,
  getPhoneLauncherUri,
} from "@/lib/launchers";

const PRIVACY_STORAGE_KEY = "taskflow_notification_privacy";
const SUB_ID_STORAGE_KEY = "taskflow_push_sub_id";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isPushSupported()) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isPushSupported()) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch {
    return "denied";
  }
}

export function getStoredPreviewMode(): NotificationPreviewMode {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "generic";
  }
  const mode = localStorage.getItem(PRIVACY_STORAGE_KEY);
  if (mode === "detailed" || mode === "generic") {
    return mode;
  }
  return "generic";
}

export function setStoredPreviewMode(mode: NotificationPreviewMode): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(PRIVACY_STORAGE_KEY, mode);
}

export function getStoredSubscriptionId(): string | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }
  return localStorage.getItem(SUB_ID_STORAGE_KEY);
}

export function setStoredSubscriptionId(id: string | null): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  if (id) {
    localStorage.setItem(SUB_ID_STORAGE_KEY, id);
  } else {
    localStorage.removeItem(SUB_ID_STORAGE_KEY);
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getClientPushSubscriptionState(
  token?: string | null
): Promise<ClientPushSubscriptionState> {
  const supported = isPushSupported();
  const permission = getNotificationPermission();
  const previewMode = getStoredPreviewMode();
  let subscriptionId = getStoredSubscriptionId();

  if (!supported || permission !== "granted") {
    return {
      isSupported: supported,
      permission,
      isSubscribed: false,
      subscriptionId: null,
      endpoint: null,
      previewMode,
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      setStoredSubscriptionId(null);
      return {
        isSupported: true,
        permission: "granted",
        isSubscribed: false,
        subscriptionId: null,
        endpoint: null,
        previewMode,
      };
    }

    // Check with server if token is available
    let isExpired = false;
    if (token) {
      try {
        const res = await fetch("/api/v1/push/subscriptions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const serverSubs = (json.subscriptions || []) as Array<{
            id: string;
            endpoint: string;
            isActive: boolean;
            previewMode: NotificationPreviewMode;
          }>;
          const match = serverSubs.find((s) => s.endpoint === subscription.endpoint);
          if (match) {
            subscriptionId = match.id;
            setStoredSubscriptionId(match.id);
            if (!match.isActive) {
              isExpired = true;
            }
          } else {
            // Server has no record of this subscription (expired or deleted)
            isExpired = true;
          }
        }
      } catch {
        // Network error during server verification; preserve local state
      }
    }

    return {
      isSupported: true,
      permission: "granted",
      isSubscribed: !isExpired,
      subscriptionId,
      endpoint: subscription.endpoint,
      previewMode,
      isExpired,
    };
  } catch {
    return {
      isSupported: true,
      permission,
      isSubscribed: false,
      subscriptionId: null,
      endpoint: null,
      previewMode,
    };
  }
}

export async function subscribeToWebPush(
  token: string,
  options?: {
    previewMode?: NotificationPreviewMode;
    vapidPublicKey?: string;
  }
): Promise<ClientPushSubscriptionState> {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return {
      isSupported: isPushSupported(),
      permission,
      isSubscribed: false,
      subscriptionId: null,
      endpoint: null,
      previewMode: getStoredPreviewMode(),
    };
  }

  const previewMode = options?.previewMode || getStoredPreviewMode();
  setStoredPreviewMode(previewMode);

  const registration = await navigator.serviceWorker.ready;
  const vapidKey = options?.vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "taskflow_mock_public_vapid_key_for_testing_and_local_development";

  let applicationServerKey: BufferSource | undefined;
  try {
    applicationServerKey = urlBase64ToUint8Array(vapidKey);
  } catch {
    // If key conversion fails in test/mock, continue
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    ...(applicationServerKey ? { applicationServerKey } : {}),
  });

  const subJson = subscription.toJSON();
  const p256dh = subJson.keys?.p256dh || "";
  const auth = subJson.keys?.auth || "";

  const response = await fetch("/api/v1/push/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: { p256dh, auth },
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      previewMode,
    }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || "Failed to register push subscription on server");
  }

  const result = await response.json();
  const subRecord = result.subscription;
  setStoredSubscriptionId(subRecord.id);

  return {
    isSupported: true,
    permission: "granted",
    isSubscribed: true,
    subscriptionId: subRecord.id,
    endpoint: subRecord.endpoint,
    previewMode,
  };
}

export async function unsubscribeFromWebPush(
  token: string,
  subscriptionId?: string | null
): Promise<ClientPushSubscriptionState> {
  const idToDelete = subscriptionId || getStoredSubscriptionId();

  if (isPushSupported()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    } catch {
      // Ignore unsubscribe error from browser
    }
  }

  if (idToDelete && token) {
    try {
      await fetch(`/api/v1/push/subscriptions/${encodeURIComponent(idToDelete)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore network failure when revoking from server
    }
  }

  setStoredSubscriptionId(null);

  return {
    isSupported: isPushSupported(),
    permission: getNotificationPermission(),
    isSubscribed: false,
    subscriptionId: null,
    endpoint: null,
    previewMode: getStoredPreviewMode(),
  };
}

export async function updateNotificationPrivacy(
  token: string,
  mode: NotificationPreviewMode
): Promise<void> {
  setStoredPreviewMode(mode);
  const subId = getStoredSubscriptionId();
  if (subId && token) {
    try {
      await fetch(`/api/v1/push/subscriptions/${encodeURIComponent(subId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ previewMode: mode }),
      });
    } catch {
      // Offline or network error
    }
  }
}

export function getOverdueFollowUps(
  followUps: FollowUp[],
  now?: Date
): OverdueFollowUpItem[] {
  const cutoff = (now || new Date()).toISOString();

  return followUps
    .filter((f) => f.status === "open" && f.dueAt < cutoff)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map((f) => {
      let launcherUri: string | null = null;
      if (f.preferredAction === "email" && f.emailAddress) {
        launcherUri = getEmailLauncherUri(f.emailAddress, f.commitment, f.personName);
      } else if (f.preferredAction === "whatsapp" && f.whatsAppNumber) {
        launcherUri = getWhatsAppLauncherUri(f.whatsAppNumber, f.commitment, f.personName);
      } else if (f.preferredAction === "phone" && f.phoneNumber) {
        launcherUri = getPhoneLauncherUri(f.phoneNumber);
      }

      return {
        id: f.id,
        personName: f.personName,
        commitment: f.commitment,
        dueAt: f.dueAt,
        preferredAction: f.preferredAction,
        launcherUri,
      };
    });
}
