export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory = "work" | "personal" | "urgent" | "study" | "ideas";

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate: string | null;
  category: TaskCategory | null;
  order?: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
