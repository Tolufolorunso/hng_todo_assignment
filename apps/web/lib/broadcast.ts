export type SyncBroadcastEvent =
  | { type: "DATA_MUTATED"; workspaceId: string }
  | { type: "SYNC_STARTED"; workspaceId: string }
  | { type: "SYNC_COMPLETED"; workspaceId: string }
  | { type: "WORKSPACE_CHANGED"; workspaceId: string }
  | { type: "AUTH_CHANGED"; accountId: string | null };

const CHANNEL_NAME = "taskflow_web_sync";

let broadcastChannel: BroadcastChannel | null = null;
const listeners = new Set<(event: SyncBroadcastEvent) => void>();

function getBroadcastChannel(): BroadcastChannel | null {
  if (broadcastChannel) return broadcastChannel;
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (messageEvent) => {
      const data = messageEvent.data as SyncBroadcastEvent;
      if (data && typeof data.type === "string") {
        for (const listener of listeners) {
          listener(data);
        }
      }
    };
    return broadcastChannel;
  } catch {
    return null;
  }
}

export function broadcastSyncEvent(event: SyncBroadcastEvent): void {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(event);
    } catch {
      // Ignore broadcast errors
    }
  }
  // Also notify listeners in the current tab
  for (const listener of listeners) {
    listener(event);
  }
}

export function onSyncEvent(
  handler: (event: SyncBroadcastEvent) => void
): () => void {
  listeners.add(handler);
  getBroadcastChannel(); // Ensure channel is listening
  return () => {
    listeners.delete(handler);
  };
}

export function closeBroadcastChannel(): void {
  if (broadcastChannel) {
    try {
      broadcastChannel.close();
    } catch {
      // Ignore close errors
    }
    broadcastChannel = null;
  }
  listeners.clear();
}
