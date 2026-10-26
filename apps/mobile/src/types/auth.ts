export interface AuthUser {
  id: string;
  email: string;
  createdAt?: string;
}

export interface SessionInfo {
  id: string;
  createdAt?: string;
  expiresAt: string;
  lastActiveAt?: string;
  isCurrent?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: AuthUser;
  session: SessionInfo;
}

export interface AccountInfo {
  id: string;
  email: string;
  createdAt: string;
}

export interface MobileAuthState {
  user: AuthUser | null;
  session: SessionInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
}

export type LocalDataAdoptionChoice = "adopt" | "separate";

export interface AdoptionSummary {
  taskCount: number;
  noteCount: number;
  followUpCount: number;
  planCount: number;
  inboxCount: number;
}
