const mockStorage = new Map<string, string>();

export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export async function getItemAsync(key: string): Promise<string | null> {
  return mockStorage.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  mockStorage.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  mockStorage.delete(key);
}

export function __resetMockSecureStore(): void {
  mockStorage.clear();
}

export default {
  isAvailableAsync,
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  __resetMockSecureStore,
};
