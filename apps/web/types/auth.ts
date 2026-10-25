export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  id: string;
  expiresAt: string;
}

export interface SessionInfo {
  id: string;
  clientLabel: string | null;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface AccountInfo {
  id: string;
  email: string;
  createdAt: string;
  verifiedAt?: string | null;
}

export interface VerifyOtpResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  session: AuthSession;
  user: AuthUser;
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  session: AuthSession | null;
  token: string | null;
}
