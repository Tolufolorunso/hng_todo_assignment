import { describe, it, expect, beforeEach } from "vitest";
import {
  InMemorySecureStorage,
  SecureStorage,
} from "./secureStore.js";
import { __resetMockSecureStore } from "../test/expo-secure-store-mock.js";

describe("SecureStorage", () => {
  beforeEach(() => {
    __resetMockSecureStore();
  });

  describe("InMemorySecureStorage", () => {
    it("stores, retrieves, and deletes values", async () => {
      const storage = new InMemorySecureStorage();
      expect(await storage.getItem("test_key")).toBeNull();

      await storage.setItem("test_key", "secret_value");
      expect(await storage.getItem("test_key")).toBe("secret_value");

      await storage.deleteItem("test_key");
      expect(await storage.getItem("test_key")).toBeNull();
    });

    it("clears all entries", async () => {
      const storage = new InMemorySecureStorage();
      await storage.setItem("k1", "v1");
      await storage.setItem("k2", "v2");
      storage.clear();

      expect(await storage.getItem("k1")).toBeNull();
      expect(await storage.getItem("k2")).toBeNull();
    });
  });

  describe("SecureStorage integration", () => {
    it("delegates to native store when available", async () => {
      const storage = new SecureStorage();
      expect(await storage.isAvailable()).toBe(true);

      await storage.setItem("auth_token", "jwt_token_abc");
      const readVal = await storage.getItem("auth_token");
      expect(readVal).toBe("jwt_token_abc");

      await storage.deleteItem("auth_token");
      expect(await storage.getItem("auth_token")).toBeNull();
    });

    it("uses fallback storage when native store is unavailable or misses", async () => {
      const fallback = new InMemorySecureStorage();
      await fallback.setItem("fallback_key", "fallback_val");

      const storage = new SecureStorage(fallback);
      expect(await storage.getItem("fallback_key")).toBe("fallback_val");
    });
  });
});
