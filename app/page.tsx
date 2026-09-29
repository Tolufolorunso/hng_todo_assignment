import AppHeader from "@/components/app/AppHeader";
import TasksScreen from "@/components/tasks/TasksScreen";

export default function Home() {
  return (
    <>
      <AppHeader active="tasks" />
      <TasksScreen />
    </>
  );
}
