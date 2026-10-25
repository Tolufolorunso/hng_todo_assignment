import React, { useState, useEffect } from "react";
import type { NoteRepository } from "../storage/noteRepository.js";
import { TouchButton } from "../components/primitives.js";

export interface NoteEditScreenProps {
  noteRepo: NoteRepository;
  noteId?: string;
  onDone: () => void;
  onCancel: () => void;
}

export function NoteEditScreen({
  noteRepo,
  noteId,
  onDone,
  onCancel,
}: NoteEditScreenProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (noteId) {
      noteRepo.getById(noteId).then((note) => {
        if (note) {
          setTitle(note.title);
          setBody(note.body);
        }
      });
    }
  }, [noteId, noteRepo]);

  const handleSave = async () => {
    setErrorMessage(null);
    setSaving(true);
    try {
      if (noteId) {
        await noteRepo.update(noteId, { title, body });
      } else {
        await noteRepo.create({ title, body });
      }
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!noteId) return;
    if (confirm("Are you sure you want to delete this note?")) {
      await noteRepo.delete(noteId);
      onDone();
    }
  };

  return (
    <div
      role="region"
      aria-label={noteId ? "Edit note screen" : "New note screen"}
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <TouchButton label="← Back" onPress={onCancel} variant="ghost" accessibilityLabel="Cancel note editing" />
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
          {noteId ? "Edit Note" : "New Note"}
        </h1>
        <TouchButton
          label={saving ? "Saving..." : "Save"}
          onPress={handleSave}
          disabled={saving}
          variant="primary"
          accessibilityLabel="Save note"
        />
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: "12px",
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Note Title Input */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="note-title"
          style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}
        >
          Title *
        </label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #3f3f46",
            backgroundColor: "#18181b",
            color: "#ffffff",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Note Body Textarea */}
      <div style={{ marginBottom: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
        <label
          htmlFor="note-body"
          style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}
        >
          Content
        </label>
        <textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your note content here..."
          rows={10}
          style={{
            width: "100%",
            flex: 1,
            minHeight: "180px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #3f3f46",
            backgroundColor: "#18181b",
            color: "#ffffff",
            fontSize: "14px",
            boxSizing: "border-box",
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Delete Action if editing */}
      {noteId && (
        <div style={{ marginTop: "auto", paddingTop: "16px" }}>
          <TouchButton
            label="Delete Note"
            onPress={handleDelete}
            variant="danger"
            accessibilityLabel="Delete this note permanently"
          />
        </div>
      )}
    </div>
  );
}
