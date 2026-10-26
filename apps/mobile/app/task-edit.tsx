import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppServices, useAppServicesState } from "../src/context/AppContext.js";
import { TaskEditScreen } from "../src/screens/TaskEditScreen.js";

export default function TaskEditRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId?: string }>();
  const taskId = typeof params.taskId === "string" ? params.taskId : undefined;
  const { taskRepo } = useAppServices();
  const { notifyDataChanged } = useAppServicesState();

  return (
    <TaskEditScreen
      taskRepo={taskRepo}
      taskId={taskId}
      onDone={() => {
        notifyDataChanged();
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
