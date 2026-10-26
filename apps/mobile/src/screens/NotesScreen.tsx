import React, { useState, useEffect } from "react";
import type { Note } from "../types/note.js";
import type { NoteRepository } from "../storage/noteRepository.js";
import { NoteItemCard } from "../components/NoteItemCard.js";
import { TouchButton, EmptyState } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface NotesScreenProps {
  noteRepo: NoteRepository;
  onNavigateToEdit: (noteId?: string) => void;
}

export function NotesScreen({ noteRepo, onNavigateToEdit }: NotesScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const all = await noteRepo.list(searchQuery || undefined);
      setNotes(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [searchQuery]);

  return (
    <div
      role="region"
      aria-label="Notes screen"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: colors.background,
        color: colors.textPrimary,
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>Notes</h1>
        <TouchButton
          label="+ New Note"
          onPress={() => onNavigateToEdit()}
          variant="primary"
          accessibilityLabel="Create a new note"
        />
      </div>

      {/* Note Search Input */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter notes..."
          aria-label="Filter notes by title or body"
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "10px 12px",
            borderRadius: "8px",
            border: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Notes List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "32px", color: colors.textMuted }}>Loading notes...</div>
      ) : notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          description={
            searchQuery ? "No notes matched your search query." : "Capture thoughts and ideas in standalone notes."
          }
          actionLabel="+ Create Note"
          onAction={() => onNavigateToEdit()}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {notes.map((note) => (
            <NoteItemCard key={note.id} note={note} onPress={onNavigateToEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
