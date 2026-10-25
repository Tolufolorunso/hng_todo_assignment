import type {
  AccountInfo,
  AuthUser,
  SessionInfo,
  VerifyOtpResponse,
} from "@/types/auth";

const STORAGE_KEY_TOKEN = "taskflow_access_token";
const STORAGE_KEY_USER = "taskflow_auth_user";

function getSessionStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
    if (typeof globalThis !== "undefined" && globalThis.sessionStorage) return globalThis.sessionStorage;
  } catch {
    return null;
  }
  return null;
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  } catch {
    return null;
  }
  return null;
}

export function getStoredAccessToken(): string | null {
  const session = getSessionStorage();
  const local = getLocalStorage();
  try {
    return (session?.getItem(STORAGE_KEY_TOKEN) || local?.getItem(STORAGE_KEY_TOKEN)) ?? null;
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string | null): void {
  const session = getSessionStorage();
  const local = getLocalStorage();
  try {
    if (token) {
      session?.setItem(STORAGE_KEY_TOKEN, token);
      local?.setItem(STORAGE_KEY_TOKEN, token);
    } else {
      session?.removeItem(STORAGE_KEY_TOKEN);
      local?.removeItem(STORAGE_KEY_TOKEN);
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

export function getStoredAuthUser(): AuthUser | null {
  const session = getSessionStorage();
  const local = getLocalStorage();
  try {
    const raw = session?.getItem(STORAGE_KEY_USER) || local?.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredAuthUser(user: AuthUser | null): void {
  const session = getSessionStorage();
  const local = getLocalStorage();
  try {
    if (user) {
      const raw = JSON.stringify(user);
      session?.setItem(STORAGE_KEY_USER, raw);
      local?.setItem(STORAGE_KEY_USER, raw);
    } else {
      session?.removeItem(STORAGE_KEY_USER);
      local?.removeItem(STORAGE_KEY_USER);
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredAuth(): void {
  setStoredAccessToken(null);
  setStoredAuthUser(null);
}

export async function requestOtp(
  email: string
): Promise<{ ok: boolean; message?: string; expiresAt?: string; error?: string }> {
  try {
    const res = await fetch("/api/v1/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errorMsg =
        (typeof body.detail === "string" && body.detail) ||
        (typeof body.message === "string" && body.message) ||
        (typeof body.error === "string" && body.error) ||
        "Failed to send verification code";
      return { ok: false, error: errorMsg };
    }

    return {
      ok: true,
      message: typeof body.message === "string" ? body.message : undefined,
      expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined,
    };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<{ ok: boolean; data?: VerifyOtpResponse; error?: string }> {
  try {
    const res = await fetch("/api/v1/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      }),
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errorMsg =
        (typeof body.detail === "string" && body.detail) ||
        (typeof body.message === "string" && body.message) ||
        (typeof body.error === "string" && body.error) ||
        "Invalid or expired verification code";
      return { ok: false, error: errorMsg };
    }

    const data = body as unknown as VerifyOtpResponse;
    setStoredAccessToken(data.accessToken);
    setStoredAuthUser(data.user);

    return { ok: true, data };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}

export async function refreshSession(
  refreshToken?: string
): Promise<{ ok: boolean; data?: VerifyOtpResponse; error?: string }> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      clearStoredAuth();
      const errorMsg =
        (typeof body.detail === "string" && body.detail) ||
        (typeof body.message === "string" && body.message) ||
        (typeof body.error === "string" && body.error) ||
        "Session expired";
      return { ok: false, error: errorMsg };
    }

    const data = body as unknown as VerifyOtpResponse;
    setStoredAccessToken(data.accessToken);
    setStoredAuthUser(data.user);

    return { ok: true, data };
  } catch {
    return { ok: false, error: "Network error while refreshing session" };
  }
}

export async function logout(token?: string | null): Promise<{ ok: boolean; error?: string }> {
  const activeToken = token ?? getStoredAccessToken();
  clearStoredAuth();

  if (!activeToken) {
    return { ok: true };
  }

  try {
    const res = await fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    });

    if (!res.ok) {
      return { ok: false, error: "Failed to logout on server" };
    }

    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export async function fetchAccount(
  token?: string | null
): Promise<{ ok: boolean; account?: AccountInfo; error?: string }> {
  const activeToken = token ?? getStoredAccessToken();
  if (!activeToken) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const res = await fetch("/api/v1/account", {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error:
          (typeof body.detail === "string" && body.detail) ||
          (typeof body.message === "string" && body.message) ||
          "Failed to fetch account info",
      };
    }

    const account = body.account as AccountInfo;
    return { ok: true, account };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}

export async function listSessions(
  token?: string | null
): Promise<{ ok: boolean; sessions?: SessionInfo[]; currentSessionId?: string; error?: string }> {
  const activeToken = token ?? getStoredAccessToken();
  if (!activeToken) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const res = await fetch("/api/v1/auth/sessions", {
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error:
          (typeof body.detail === "string" && body.detail) ||
          (typeof body.message === "string" && body.message) ||
          "Failed to fetch sessions",
      };
    }

    return {
      ok: true,
      sessions: (body.sessions as SessionInfo[]) || [],
      currentSessionId: typeof body.currentSessionId === "string" ? body.currentSessionId : undefined,
    };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}

export async function revokeSession(
  sessionId: string,
  token?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const activeToken = token ?? getStoredAccessToken();
  if (!activeToken) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const res = await fetch(`/api/v1/auth/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return {
        ok: false,
        error:
          (typeof body.detail === "string" && body.detail) ||
          (typeof body.message === "string" && body.message) ||
          "Failed to revoke session",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}

export async function revokeAllOtherSessions(
  token?: string | null
): Promise<{ ok: boolean; revokedCount?: number; error?: string }> {
  const activeToken = token ?? getStoredAccessToken();
  if (!activeToken) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const res = await fetch("/api/v1/auth/sessions/revoke-all", {
      method: "POST",
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error:
          (typeof body.detail === "string" && body.detail) ||
          (typeof body.message === "string" && body.message) ||
          "Failed to revoke sessions",
      };
    }

    return {
      ok: true,
      revokedCount: typeof body.revokedCount === "number" ? body.revokedCount : undefined,
    };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}

export async function deleteAccount(
  token?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const activeToken = token ?? getStoredAccessToken();
  if (!activeToken) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const res = await fetch("/api/v1/account", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${activeToken}` },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return {
        ok: false,
        error:
          (typeof body.detail === "string" && body.detail) ||
          (typeof body.message === "string" && body.message) ||
          "Failed to delete account",
      };
    }

    clearStoredAuth();
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}
