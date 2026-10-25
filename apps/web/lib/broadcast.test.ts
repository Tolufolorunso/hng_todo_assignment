import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  broadcastSyncEvent,
  closeBroadcastChannel,
  onSyncEvent,
  type SyncBroadcastEvent,
} from "@/lib/broadcast";

class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  static instances: MockBroadcastChannel[] = [];

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    for (const inst of MockBroadcastChannel.instances) {
      if (inst !== this && inst.name === this.name && inst.onmessage) {
        inst.onmessage({ data } as MessageEvent);
      }
    }
  }

  close() {
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(
      (c) => c !== this
    );
  }
}

describe("multi-tab broadcast coordination", () => {
  beforeEach(() => {
    closeBroadcastChannel();
    MockBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    vi.stubGlobal("window", globalThis);
  });

  afterEach(() => {
    closeBroadcastChannel();
    vi.restoreAllMocks();
  });

  it("notifies local tab listeners and broadcasts events", () => {
    const received: SyncBroadcastEvent[] = [];
    const unsubscribe = onSyncEvent((event) => {
      received.push(event);
    });

    broadcastSyncEvent({ type: "DATA_MUTATED", workspaceId: "account_123" });
    broadcastSyncEvent({ type: "SYNC_COMPLETED", workspaceId: "account_123" });

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ type: "DATA_MUTATED", workspaceId: "account_123" });
    expect(received[1]).toEqual({ type: "SYNC_COMPLETED", workspaceId: "account_123" });

    unsubscribe();
    broadcastSyncEvent({ type: "AUTH_CHANGED", accountId: null });
    expect(received).toHaveLength(2);
  });

  it("handles incoming messages from other tabs via BroadcastChannel", () => {
    const received: SyncBroadcastEvent[] = [];
    onSyncEvent((event) => {
      received.push(event);
    });

    // Simulate another tab's channel posting a message
    const otherTabChannel = new MockBroadcastChannel("taskflow_web_sync");
    otherTabChannel.postMessage({
      type: "WORKSPACE_CHANGED",
      workspaceId: "account_456",
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      type: "WORKSPACE_CHANGED",
      workspaceId: "account_456",
    });
  });
});
