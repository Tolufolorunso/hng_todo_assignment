import React, { useState, useEffect } from "react";
import type { SearchService, SearchResults } from "../services/search.js";
import { TaskItemCard } from "../components/TaskItemCard.js";
import { NoteItemCard } from "../components/NoteItemCard.js";
import type { TaskRepository } from "../storage/taskRepository.js";

export interface SearchScreenProps {
  searchService: SearchService;
  taskRepo: TaskRepository;
  onNavigateToTask: (taskId: string) => void;
  onNavigateToNote: (noteId: string) => void;
}

export function SearchScreen({
  searchService,
  taskRepo,
  onNavigateToTask,
  onNavigateToNote,
}: SearchScreenProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    query: "",
    tasks: [],
    notes: [],
    totalCount: 0,
  });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ query: "", tasks: [], notes: [], totalCount: 0 });
      return;
    }

    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await searchService.search(query);
        setResults(res);
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [query, searchService]);

  const handleToggleTaskComplete = async (taskId: string) => {
    await taskRepo.toggleComplete(taskId);
    const res = await searchService.search(query);
    setResults(res);
  };

  return (
    <div
      role="region"
      aria-label="Search screen"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#09090b",
        color: "#f4f4f5",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 16px 0" }}>Search</h1>

      {/* Search Input */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks and notes..."
          aria-label="Search across tasks and notes"
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #3b82f6",
            backgroundColor: "#18181b",
            color: "#ffffff",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {searching && (
        <div style={{ textAlign: "center", padding: "16px", color: "#a1a1aa" }}>Searching...</div>
      )}

      {!searching && query.trim() && results.totalCount === 0 && (
        <div style={{ textAlign: "center", padding: "32px", color: "#a1a1aa" }}>
          No tasks or notes found matching &ldquo;{query}&rdquo;.
        </div>
      )}

      {/* Task Matches */}
      {results.tasks.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#a1a1aa",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Tasks ({results.tasks.length})
          </div>
          {results.tasks.map((task) => (
            <TaskItemCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleTaskComplete}
              onPress={onNavigateToTask}
            />
          ))}
        </div>
      )}

      {/* Note Matches */}
      {results.notes.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#a1a1aa",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Notes ({results.notes.length})
          </div>
          {results.notes.map((note) => (
            <NoteItemCard key={note.id} note={note} onPress={onNavigateToNote} />
          ))}
        </div>
      )}
    </div>
  );
}
