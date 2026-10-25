"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  listSessions,
  revokeAllOtherSessions,
  revokeSession,
} from "@/lib/auth";
import type { SessionInfo } from "@/types/auth";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
}

export default function AccountModal({ isOpen, onClose, onAuthenticated }: AccountModalProps) {
  const { user, isAuthenticated, requestOtp, verifyOtp, signOut, deleteAccount, token } = useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Authenticated state: session management
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen || !isAuthenticated || !token) return;

    let mounted = true;
    void listSessions(token).then((res) => {
      if (mounted) {
        setSessions(res.ok && res.sessions ? res.sessions : []);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen, isAuthenticated, token]);

  function handleClose() {
    setError(null);
    setMessage(null);
    setStep("email");
    setCode("");
    setConfirmDelete(false);
    setSessions(null);
    onClose();
  }

  if (!isOpen) return null;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    const res = await requestOtp(email);
    setLoading(false);

    if (res.ok) {
      setMessage(res.message || "Verification code sent to your email.");
      setStep("code");
    } else {
      setError(res.error || "Failed to send code");
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code || code.trim().length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    const res = await verifyOtp(email, code);
    setLoading(false);

    if (res.ok) {
      if (onAuthenticated) {
        onAuthenticated();
      }
    } else {
      setError(res.error || "Invalid code");
    }
  }

  async function handleRevokeSession(sessionId: string) {
    if (!token) return;
    const res = await revokeSession(sessionId, token);
    if (res.ok) {
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== sessionId) : []));
    }
  }

  async function handleRevokeAllOther() {
    if (!token) return;
    const res = await revokeAllOtherSessions(token);
    if (res.ok) {
      setSessions((prev) => (prev ? prev.filter((s) => s.isCurrent) : []));
    }
  }

  async function handleDeleteAccount() {
    setLoading(true);
    const res = await deleteAccount();
    setLoading(false);
    if (res.ok) {
      handleClose();
    } else {
      setError(res.error || "Failed to delete account");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-text transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {!isAuthenticated ? (
          <div>
            <h2 id="account-modal-title" className="text-xl font-bold tracking-tight text-text">
              {step === "email" ? "Sign In or Register" : "Enter Verification Code"}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {step === "email"
                ? "TaskFlow uses passwordless email verification. Enter your email to begin."
                : `Enter the 6-digit code sent to ${email}.`}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500"
              >
                {error}
              </div>
            )}

            {message && (
              <div
                role="status"
                className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-accent"
              >
                {message}
              </div>
            )}

            {step === "email" ? (
              <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="auth-email-input" className="block text-xs font-semibold text-text">
                    Email address
                  </label>
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-text placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast shadow transition-all hover:bg-accent-hover disabled:opacity-50"
                >
                  {loading ? "Sending code..." : "Continue with Email"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="auth-code-input" className="block text-xs font-semibold text-text">
                    One-time verification code
                  </label>
                  <input
                    id="auth-code-input"
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-center font-mono text-lg tracking-widest text-text placeholder:text-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast shadow transition-all hover:bg-accent-hover disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                  className="w-full text-center text-xs text-muted hover:text-text"
                >
                  Use a different email address
                </button>
              </form>
            )}
          </div>
        ) : (
          <div>
            <h2 id="account-modal-title" className="text-xl font-bold tracking-tight text-text">
              Account
            </h2>
            <p className="mt-1 text-xs text-muted">
              Signed in as <span className="font-semibold text-text">{user?.email}</span>
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500"
              >
                {error}
              </div>
            )}

            {/* Sessions section */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text">Active Devices & Sessions</span>
                {sessions && sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRevokeAllOther}
                    className="text-[11px] font-medium text-accent hover:underline"
                  >
                    Revoke Others
                  </button>
                )}
              </div>

              <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {sessions === null ? (
                  <div className="p-3 text-center text-xs text-muted">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted">Current session active</div>
                ) : (
                  sessions.map((sess) => (
                    <div key={sess.id} className="flex items-center justify-between p-2.5 text-xs">
                      <div>
                        <div className="font-medium text-text">
                          {sess.clientLabel || "Web Browser"}
                          {sess.isCurrent && (
                            <span className="ml-1.5 rounded bg-accent/20 px-1 py-0.2 text-[10px] font-bold text-accent">
                              This Device
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted">
                          Expires: {new Date(sess.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      {!sess.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(sess.id)}
                          className="text-[11px] text-rose-500 hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sign Out and Delete buttons */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={signOut}
                className="w-full rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-xs font-semibold text-text transition-all hover:bg-surface-muted/80"
              >
                Sign Out
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-center text-xs text-rose-500/80 hover:text-rose-500"
                >
                  Delete Account
                </button>
              ) : (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 space-y-2">
                  <p className="text-xs text-rose-500">
                    Are you sure? This will delete your account and all cloud sync records permanently.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleDeleteAccount}
                      className="flex-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {loading ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
