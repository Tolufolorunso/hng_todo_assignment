import type { AuthService } from "./auth";
import type { SyncEngine } from "./syncEngine";

export type AppLifecycleState = "active" | "background" | "inactive";

export class LifecycleService {
  private currentState: AppLifecycleState = "active";
  private isOnline = true;
  private cleanupHandlers: Array<() => void> = [];

  constructor(
    private authService: AuthService,
    private syncEngine: SyncEngine
  ) {}

  start(): void {
    if (typeof window !== "undefined") {
      const handleOnline = () => {
        this.handleNetworkChange(true);
      };
      const handleOffline = () => {
        this.handleNetworkChange(false);
      };
      const handleVisibilityChange = () => {
        if (typeof document !== "undefined") {
          const nextState: AppLifecycleState = document.visibilityState === "visible" ? "active" : "background";
          this.handleStateChange(nextState);
        }
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibilityChange);
      }

      this.cleanupHandlers.push(() => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        if (typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        }
      });
    }
  }

  stop(): void {
    for (const cleanup of this.cleanupHandlers) {
      cleanup();
    }
    this.cleanupHandlers = [];
  }

  getCurrentState(): AppLifecycleState {
    return this.currentState;
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  async handleStateChange(newState: AppLifecycleState): Promise<void> {
    const prevState = this.currentState;
    this.currentState = newState;

    if (prevState !== "active" && newState === "active") {
      // Foreground recovery: check auth & trigger catch-up sync
      const auth = this.authService.getAuthState();
      if (auth.status === "authenticated") {
        await this.syncEngine.syncOnce().catch(() => {});
      }
    }
  }

  async handleNetworkChange(online: boolean): Promise<void> {
    const prevOnline = this.isOnline;
    this.isOnline = online;

    if (!prevOnline && online) {
      // Reconnected recovery
      const auth = this.authService.getAuthState();
      if (auth.status === "authenticated") {
        await this.syncEngine.syncOnce().catch(() => {});
      }
    }
  }
}
