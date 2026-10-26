import * as SecureStore from "expo-secure-store";

export interface SecureStorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

export class InMemorySecureStorage implements SecureStorageDriver {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async deleteItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export class SecureStorage implements SecureStorageDriver {
  private fallback: SecureStorageDriver;

  constructor(fallback?: SecureStorageDriver) {
    this.fallback = fallback || new InMemorySecureStorage();
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (typeof SecureStore.isAvailableAsync === "function") {
        return await SecureStore.isAvailableAsync();
      }
      return true;
    } catch {
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof SecureStore.getItemAsync === "function") {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;
      }
    } catch {
      // Fall through to fallback
    }
    return this.fallback.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    let nativeSuccess = false;
    try {
      if (typeof SecureStore.setItemAsync === "function") {
        await SecureStore.setItemAsync(key, value);
        nativeSuccess = true;
      }
    } catch {
      // Fall through to fallback
    }

    if (!nativeSuccess) {
      await this.fallback.setItem(key, value);
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      if (typeof SecureStore.deleteItemAsync === "function") {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // Fall through to fallback
    }
    await this.fallback.deleteItem(key);
  }
}

export const defaultSecureStorage = new SecureStorage();
