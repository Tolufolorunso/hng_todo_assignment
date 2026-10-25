import React from "react";
import type { Note } from "../types/note.js";

export interface NoteItemCardProps {
  note: Note;
  onPress: (id: string) => void;
}

export function NoteItemCard({ note, onPress }: NoteItemCardProps): React.JSX.Element {
  return (
    <div
      role="article"
      aria-label={`Note: ${note.title}`}
      onClick={() => onPress(note.id)}
      style={{
        padding: "16px",
        marginBottom: "8px",
        backgroundColor: "#18181b",
        border: "1px solid #27272a",
        borderRadius: "12px",
        cursor: "pointer",
        minHeight: "44px",
      }}
    >
      <div
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "#f4f4f5",
          marginBottom: "4px",
        }}
      >
        {note.title}
      </div>

      {note.body ? (
        <div
          style={{
            fontSize: "13px",
            color: "#a1a1aa",
            marginBottom: "8px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.4,
          }}
        >
          {note.body}
        </div>
      ) : null}

      <div style={{ fontSize: "11px", color: "#71717a" }}>
        Updated {new Date(note.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
