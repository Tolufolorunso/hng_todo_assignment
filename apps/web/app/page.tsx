import type { Metadata } from "next";
import AppHeader from "@/components/app/AppHeader";
import TasksScreen from "@/components/tasks/TasksScreen";

export const metadata: Metadata = {
  title: "Tasks & Productivity Workspace",
  description:
    "Organize, prioritize, and reorder your daily tasks with rich formatting, drag-and-drop sequencing, and smart categories.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <>
      <AppHeader active="tasks" />
      <TasksScreen />
    </>
  );
}

