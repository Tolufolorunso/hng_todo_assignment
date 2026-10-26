import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.topBar}>
        <TouchButton
          label="← Back"
          onPress={onCancel}
          variant="ghost"
          accessibilityLabel="Cancel note editing"
        />
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          {noteId ? "Edit Note" : "New Note"}
        </Text>
        <TouchButton
          label={saving ? "Saving..." : "Save"}
          onPress={handleSave}
          disabled={saving}
          variant="primary"
          accessibilityLabel="Save note"
        />
      </View>

      {errorMessage && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {actionSuccess && (
        <View style={styles.successBanner} accessibilityRole="status">
          <Text style={styles.successText}>{actionSuccess}</Text>
        </View>
      )}

      {/* Note Title Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Title *
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Note title *"
          placeholderTextColor="#71717a"
          accessibilityLabel="Note title"
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      {/* Note Body Textarea */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Content
        </Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write your note content here..."
          placeholderTextColor="#71717a"
          accessibilityLabel="Note body"
          multiline
          numberOfLines={8}
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      {/* Actionable Notes: Convert text to Task or FollowUp */}
      {noteId && taskRepo && followUpRepo && (
        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
            Create Action from Note
          </Text>
          <TextInput
            placeholder="Type or paste excerpt from note..."
            placeholderTextColor="#71717a"
            value={excerptText}
            onChangeText={setExcerptText}
            accessibilityLabel="Actionable note excerpt"
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfaceBorder,
                color: colors.textPrimary,
                marginBottom: 8,
              },
            ]}
          />
          <View style={styles.buttonRow}>
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
          </View>
        </View>
      )}

      {/* Backlinks Display */}
      {noteId && backlinks && (backlinks.tasks.length > 0 || backlinks.followups.length > 0) && (
        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
            Linked Actions (Backlinks)
          </Text>
          {backlinks.tasks.map((t) => (
            <View
              key={t.id}
              style={[styles.backlinkRow, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.backlinkText, { color: colors.textPrimary }]}>
                Task: {t.title}
              </Text>
              <Badge
                label={t.completed ? "Done" : "Open"}
                variant={t.completed ? "low" : "high"}
              />
            </View>
          ))}
          {backlinks.followups.map((f) => (
            <View
              key={f.id}
              style={[styles.backlinkRow, { backgroundColor: colors.background }]}
            >
              <Text style={[styles.backlinkText, { color: colors.textPrimary }]}>
                Follow Up: {f.personName} ({f.commitment})
              </Text>
              <Badge
                label={f.status}
                variant={f.status === "completed" ? "low" : "high"}
              />
            </View>
          ))}
        </View>
      )}

      {noteId && (
        <View style={styles.deleteSection}>
          <TouchButton
            label="Delete Note"
            onPress={handleDelete}
            variant="danger"
            accessibilityLabel="Delete this note permanently"
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  errorBanner: {
    padding: 10,
    backgroundColor: "#7f1d1d",
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 13,
  },
  successBanner: {
    padding: 10,
    backgroundColor: "#064e3b",
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    color: "#a7f3d0",
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    minHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: "top",
  },
  actionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  backlinkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  backlinkText: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  deleteSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
  },
});
