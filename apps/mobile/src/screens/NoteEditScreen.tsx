import React, { useState, useEffect } from "react";
import type { NoteRepository } from "../storage/noteRepository.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import type { NoteBacklinks } from "../services/actionableNotes.js";
import {
  createTaskFromNoteExcerpt,
  createFollowUpFromNoteExcerpt,
  getNoteBacklinks,
} from "../services/actionableNotes.js";
import { TouchButton, Badge } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface NoteEditScreenProps {
  noteRepo: NoteRepository;
  taskRepo?: TaskRepository;
  followUpRepo?: FollowUpRepository;
  noteId?: string;
  onDone: () => void;
  onCancel: () => void;
}

export function NoteEditScreen({
  noteRepo,
  taskRepo,
  followUpRepo,
  noteId,
  onDone,
  onCancel,
}: NoteEditScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [backlinks, setBacklinks] = useState<NoteBacklinks | null>(null);
  const [excerptText, setExcerptText] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadBacklinks = async () => {
    if (noteId && taskRepo && followUpRepo) {
      const links = await getNoteBacklinks(taskRepo, followUpRepo, noteId);
      setBacklinks(links);
    }
  };

  useEffect(() => {
    if (noteId) {
      noteRepo.getById(noteId).then((note) => {
        if (note) {
          setTitle(note.title);
          setBody(note.body);
        }
      });
      loadBacklinks();
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

  const handleSpawnTask = async () => {
    if (!excerptText.trim() || !noteId || !taskRepo) return;
    try {
      const note = await noteRepo.getById(noteId);
      if (!note) return;
      await createTaskFromNoteExcerpt(taskRepo, note, excerptText.trim());
      setExcerptText("");
      setActionSuccess("Linked task created successfully");
      await loadBacklinks();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  const handleSpawnFollowUp = async () => {
    if (!excerptText.trim() || !noteId || !followUpRepo) return;
    try {
      const note = await noteRepo.getById(noteId);
      if (!note) return;
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await createFollowUpFromNoteExcerpt(followUpRepo, note, excerptText.trim(), {
        personName: "Note Contact",
        dueAt: tomorrow,
      });
      setExcerptText("");
      setActionSuccess("Linked follow up created successfully");
      await loadBacklinks();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create follow up");
    }
  };

  const handleDelete = async () => {
    if (!noteId) return;
    await noteRepo.delete(noteId);
    onDone();
  };

  return (
    <div
      role="region"
      aria-label={noteId ? "Edit note screen" : "New note screen"}
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
        <TouchButton label="← Back" onPress={onCancel} variant="ghost" accessibilityLabel="Cancel note editing" />
        <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
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
            padding: "10px",
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
            borderRadius: "8px",
            marginBottom: "12px",
            fontSize: "13px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          style={{
            padding: "10px",
            backgroundColor: "#064e3b",
            color: "#a7f3d0",
            borderRadius: "8px",
            marginBottom: "12px",
            fontSize: "13px",
          }}
        >
          {actionSuccess}
        </div>
      )}

      {/* Note Title Input */}
      <div style={{ marginBottom: "12px" }}>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title *"
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "10px 12px",
            borderRadius: "8px",
            border: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Note Body Textarea */}
      <div style={{ marginBottom: "16px" }}>
        <textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your note content here..."
          rows={8}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: "14px",
            boxSizing: "border-box",
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Actionable Notes: Convert text to Task or FollowUp */}
      {noteId && taskRepo && followUpRepo && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.surfaceBorder}`,
            borderRadius: "10px",
            padding: "14px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Create Action from Note</div>
          <input
            type="text"
            placeholder="Type or paste excerpt from note..."
            value={excerptText}
            onChange={(e) => setExcerptText(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: "6px",
              border: `1px solid ${colors.surfaceBorder}`,
              backgroundColor: colors.background,
              color: colors.textPrimary,
              fontSize: "13px",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <TouchButton
              label="+ Spawn Task"
              onPress={handleSpawnTask}
              disabled={!excerptText.trim()}
              variant="secondary"
            />
            <TouchButton
              label="+ Spawn Follow Up"
              onPress={handleSpawnFollowUp}
              disabled={!excerptText.trim()}
              variant="secondary"
            />
          </div>
        </div>
      )}

      {/* Backlinks Display */}
      {noteId && backlinks && (backlinks.tasks.length > 0 || backlinks.followups.length > 0) && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.surfaceBorder}`,
            borderRadius: "10px",
            padding: "14px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600 }}>Linked Actions (Backlinks)</div>
          {backlinks.tasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 8px",
                backgroundColor: colors.background,
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "13px" }}>Task: {t.title}</span>
              <Badge label={t.completed ? "Done" : "Open"} variant={t.completed ? "low" : "high"} />
            </div>
          ))}
          {backlinks.followups.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 8px",
                backgroundColor: colors.background,
                borderRadius: "6px",
              }}
            >
              <span style={{ fontSize: "13px" }}>
                Follow Up: {f.personName} ({f.commitment})
              </span>
              <Badge label={f.status} variant={f.status === "completed" ? "low" : "high"} />
            </div>
          ))}
        </div>
      )}

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
