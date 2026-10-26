import React from "react";
import { useRouter } from "expo-router";
import { useAppServices, useAppServicesState } from "../../src/context/AppContext.js";
import { TasksScreen } from "../../src/screens/TasksScreen.js";

export default function TasksTabScreen(): React.JSX.Element {
  const router = useRouter();
  const { taskRepo } = useAppServices();
  const { refreshKey } = useAppServicesState();

  return (
    <TasksScreen
      key={`tasks_${refreshKey}`}
      taskRepo={taskRepo}
      onNavigateToEdit={(taskId) => {
        router.push({
          pathname: "/task-edit",
          params: taskId ? { taskId } : undefined,
        });
      }}
      onNavigateToPlan={() => {
        router.push("/plan");
      }}
    />
  );
}
