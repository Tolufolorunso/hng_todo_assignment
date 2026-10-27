import React from "react";
import { useRouter } from "expo-router";
import { useAppServices } from "../src/context/AppContext";
import { SearchScreen } from "../src/screens/SearchScreen";

export default function SearchRoute(): React.JSX.Element {
  const router = useRouter();
  const { searchService, taskRepo } = useAppServices();

  return (
    <SearchScreen
      searchService={searchService}
      taskRepo={taskRepo}
      onNavigateToTask={(taskId: string) => {
        router.push({ pathname: "/task-edit", params: { taskId } });
      }}
      onNavigateToNote={(noteId: string) => {
        router.push({ pathname: "/note-edit", params: { noteId } });
      }}
    />
  );
}
