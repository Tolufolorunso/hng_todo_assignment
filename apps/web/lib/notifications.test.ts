import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  urlBase64ToUint8Array,
  getStoredPreviewMode,
  setStoredPreviewMode,
  getStoredSubscriptionId,
  setStoredSubscriptionId,
  getOverdueFollowUps,
  getNotificationPermission,
} from "./notifications";
import type { FollowUp } from "@/types/followup";

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

describe("Client Notifications Module (lib/notifications.ts)", () => {
  let mockStorage: MockStorage;

  const sampleFollowUps: FollowUp[] = [
    {
      id: "fu_1",
      personName: "John Doe",
      commitment: "Send contract proposal",
      details: null,
      dueAt: "2026-10-25T08:00:00.000Z",
      timeZone: "UTC",
      emailAddress: "john@example.com",
      phoneNumber: "+1234567890",
      whatsAppNumber: "+1234567890",
      preferredAction: "email",
      recurrence: null,
      status: "open",
      sourceNoteId: null,
      sourceExcerpt: null,
      createdAt: "2026-10-25T07:00:00.000Z",
      updatedAt: "2026-10-25T07:00:00.000Z",
    },
    {
      id: "fu_2",
      personName: "Jane Smith",
      commitment: "Call regarding project kickoff",
      details: null,
      dueAt: "2026-10-25T09:30:00.000Z",
      timeZone: "UTC",
      emailAddress: null,
      phoneNumber: "+1987654321",
      whatsAppNumber: null,
      preferredAction: "phone",
      recurrence: null,
      status: "open",
      sourceNoteId: null,
      sourceExcerpt: null,
      createdAt: "2026-10-25T07:00:00.000Z",
      updatedAt: "2026-10-25T07:00:00.000Z",
    },
    {
      id: "fu_future",
      personName: "Future Contact",
      commitment: "Later sync",
      details: null,
      dueAt: "2026-10-25T14:00:00.000Z",
      timeZone: "UTC",
      emailAddress: null,
      phoneNumber: null,
      whatsAppNumber: null,
      preferredAction: null,
      recurrence: null,
      status: "open",
      sourceNoteId: null,
      sourceExcerpt: null,
      createdAt: "2026-10-25T07:00:00.000Z",
      updatedAt: "2026-10-25T07:00:00.000Z",
    },
    {
      id: "fu_completed",
      personName: "Completed Contact",
      commitment: "Already resolved",
      details: null,
      dueAt: "2026-10-25T06:00:00.000Z",
      timeZone: "UTC",
      emailAddress: null,
      phoneNumber: null,
      whatsAppNumber: null,
      preferredAction: null,
      recurrence: null,
      status: "completed",
      sourceNoteId: null,
      sourceExcerpt: null,
      createdAt: "2026-10-25T05:00:00.000Z",
      updatedAt: "2026-10-25T07:00:00.000Z",
    },
  ];

  beforeEach(() => {
    mockStorage = new MockStorage();
    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", {});
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("Base64 URL to Uint8Array Conversion", () => {
    it("converts standard base64 string to Uint8Array", () => {
      const base64 = "AQIDBA==";
      const array = urlBase64ToUint8Array(base64);
      expect(array).toBeInstanceOf(Uint8Array);
      expect(array.length).toBe(4);
      expect(Array.from(array)).toEqual([1, 2, 3, 4]);
    });

    it("handles URL-safe base64 string with hyphens and underscores", () => {
      const base64Url = "AQIDBA";
      const array = urlBase64ToUint8Array(base64Url);
      expect(array.length).toBe(4);
      expect(Array.from(array)).toEqual([1, 2, 3, 4]);
    });
  });

  describe("Local Storage Preference Helpers", () => {
    it("defaults preview mode to generic when unset", () => {
      expect(getStoredPreviewMode()).toBe("generic");
    });

    it("persists and retrieves detailed preview mode", () => {
      setStoredPreviewMode("detailed");
      expect(getStoredPreviewMode()).toBe("detailed");

      setStoredPreviewMode("generic");
      expect(getStoredPreviewMode()).toBe("generic");
    });

    it("stores and clears subscription ID", () => {
      expect(getStoredSubscriptionId()).toBeNull();

      setStoredSubscriptionId("push_sub_test_123");
      expect(getStoredSubscriptionId()).toBe("push_sub_test_123");

      setStoredSubscriptionId(null);
      expect(getStoredSubscriptionId()).toBeNull();
    });
  });

  describe("Overdue Catch-up Logic", () => {
    it("identifies overdue follow-ups, filters completed, and orders by oldest due first", () => {
      const referenceNow = new Date("2026-10-25T10:00:00.000Z");
      const overdue = getOverdueFollowUps(sampleFollowUps, referenceNow);

      expect(overdue).toHaveLength(2);
      expect(overdue[0].id).toBe("fu_1");
      expect(overdue[0].personName).toBe("John Doe");
      expect(overdue[0].preferredAction).toBe("email");
      expect(overdue[0].launcherUri).toContain("mailto:john");

      expect(overdue[1].id).toBe("fu_2");
      expect(overdue[1].personName).toBe("Jane Smith");
      expect(overdue[1].preferredAction).toBe("phone");
      expect(overdue[1].launcherUri).toBe("tel:+1987654321");
    });

    it("returns empty array when no open follow-ups are overdue", () => {
      const pastNow = new Date("2026-10-25T05:00:00.000Z");
      const overdue = getOverdueFollowUps(sampleFollowUps, pastNow);
      expect(overdue).toEqual([]);
    });
  });

  describe("Browser Permission Mapping", () => {
    it("returns unsupported when PushManager or Notification is missing", () => {
      expect(getNotificationPermission()).toBe("unsupported");
    });
  });
});
