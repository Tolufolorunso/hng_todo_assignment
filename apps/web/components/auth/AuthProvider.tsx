"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { AuthState, AuthUser, AuthSession } from "@/types/auth";
import {
  clearStoredAuth,
  deleteAccount as apiDeleteAccount,
  getStoredAccessToken,
  getStoredAuthUser,
  logout as apiLogout,
  refreshSession as apiRefreshSession,
  requestOtp as apiRequestOtp,
  verifyOtp as apiVerifyOtp,
} from "@/lib/auth";

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  requestOtp: (email: string) => Promise<{ ok: boolean; message?: string; expiresAt?: string; error?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  // Initial restore from stored tokens or cookie
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const storedToken = getStoredAccessToken();
      const storedUser = getStoredAuthUser();

      if (storedToken && storedUser) {
        if (!mounted) return;
        setToken(storedToken);
        setUser(storedUser);
        setStatus("authenticated");
        return;
      }

      // Try cookie-based refresh
      const refreshRes = await apiRefreshSession();
      if (!mounted) return;

      if (refreshRes.ok && refreshRes.data) {
        setToken(refreshRes.data.accessToken);
        setUser(refreshRes.data.user);
        setSession(refreshRes.data.session);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    return await apiRequestOtp(email);
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const res = await apiVerifyOtp(email, code);
    if (res.ok && res.data) {
      setToken(res.data.accessToken);
      setUser(res.data.user);
      setSession(res.data.session);
      setStatus("authenticated");
      return { ok: true };
    }
    return { ok: false, error: res.error || "Failed to verify code" };
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout(token);
    clearStoredAuth();
    setToken(null);
    setUser(null);
    setSession(null);
    setStatus("unauthenticated");
  }, [token]);

  const refreshSession = useCallback(async () => {
    const res = await apiRefreshSession();
    if (res.ok && res.data) {
      setToken(res.data.accessToken);
      setUser(res.data.user);
      setSession(res.data.session);
      setStatus("authenticated");
      return true;
    } else {
      setToken(null);
      setUser(null);
      setSession(null);
      setStatus("unauthenticated");
      return false;
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    const res = await apiDeleteAccount(token);
    if (res.ok) {
      setToken(null);
      setUser(null);
      setSession(null);
      setStatus("unauthenticated");
      return { ok: true };
    }
    return { ok: false, error: res.error || "Failed to delete account" };
  }, [token]);

  const value: AuthContextValue = {
    status,
    user,
    session,
    token,
    isAuthenticated: status === "authenticated" && !!user,
    requestOtp,
    verifyOtp,
    signOut,
    refreshSession,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      status: "unauthenticated",
      user: null,
      session: null,
      token: null,
      isAuthenticated: false,
      requestOtp: async () => ({ ok: false, error: "Auth provider missing" }),
      verifyOtp: async () => ({ ok: false, error: "Auth provider missing" }),
      signOut: async () => {},
      refreshSession: async () => false,
      deleteAccount: async () => ({ ok: false, error: "Auth provider missing" }),
    };
  }
  return context;
}
