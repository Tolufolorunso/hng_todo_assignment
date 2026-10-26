export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory = "work" | "personal" | "urgent" | "study" | "ideas";

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  category: TaskCategory | null;
  estimatedMinutes?: number | null;
  sourceNoteId?: string | null;
  sourceExcerpt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  category?: TaskCategory | null;
  estimatedMinutes?: number | null;
  sourceNoteId?: string | null;
  sourceExcerpt?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  dueDate?: string | null;
  category?: TaskCategory | null;
  estimatedMinutes?: number | null;
  sourceNoteId?: string | null;
  sourceExcerpt?: string | null;
}

export interface TaskFilter {
  category?: TaskCategory | null;
  priority?: TaskPriority;
  completed?: boolean;
  search?: string;
}
