import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAppServices, useAppServicesState } from "../../src/context/AppContext.js";
import { MoreScreen } from "../../src/screens/MoreScreen.js";
import type { MobileScreen } from "../../src/types/navigation.js";

export default function MoreTabScreen(): React.JSX.Element {
  const router = useRouter();
  const { inboxRepo } = useAppServices();
  const { refreshKey } = useAppServicesState();
  const [inboxPendingCount, setInboxPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPendingCount() {
      try {
        const pending = await inboxRepo.list({ state: "pending" });
        if (!cancelled) {
          setInboxPendingCount(pending.length);
        }
      } catch {
        // Safe fallback
      }
    }

    loadPendingCount();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, inboxRepo]);

  const handleNavigate = (screen: MobileScreen) => {
    switch (screen.name) {
      case "plan":
        router.push("/plan");
        break;
      case "inbox":
        router.push("/inbox");
        break;
      case "calendar":
        router.push("/calendar");
        break;
      case "analytics":
        router.push("/analytics");
        break;
      case "search":
        router.push("/search");
        break;
      case "backup":
        router.push("/backup");
        break;
      case "account":
        router.push("/account");
        break;
      case "task-edit":
        router.push({
          pathname: "/task-edit",
          params: screen.taskId ? { taskId: screen.taskId } : undefined,
        });
        break;
      case "note-edit":
        router.push({
          pathname: "/note-edit",
          params: screen.noteId ? { noteId: screen.noteId } : undefined,
        });
        break;
      case "tasks":
        router.push("/tasks");
        break;
      case "followups":
        router.push("/followups");
        break;
      case "notes":
        router.push("/notes");
        break;
      default:
        break;
    }
  };

  return (
    <MoreScreen
      key={`more_${refreshKey}`}
      onNavigate={handleNavigate}
      inboxPendingCount={inboxPendingCount}
    />
  );
}
