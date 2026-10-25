import React, { useState } from "react";
import type { BackupService } from "../services/backup.js";
import type { BackupImportMode, BackupImportResult } from "../types/backup.js";
import { TouchButton } from "../components/primitives.js";

export interface BackupScreenProps {
  backupService: BackupService;
  onDataChanged: () => void;
}

export function BackupScreen({ backupService, onDataChanged }: BackupScreenProps): React.JSX.Element {
  const [exportedJson, setExportedJson] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importMode, setImportMode] = useState<BackupImportMode>("merge");
  const [importResult, setImportResult] = useState<BackupImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleExport = async () => {
    setErrorMessage(null);
    try {
      const json = await backupService.exportJsonString();
      setExportedJson(json);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleCopyExport = async () => {
    if (!exportedJson) return;
    try {
      await navigator.clipboard.writeText(exportedJson);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleImport = async () => {
    setErrorMessage(null);
    setImportResult(null);
    if (!importJson.trim()) {
      setErrorMessage("Please paste JSON backup data to import");
      return;
    }

    try {
      const result = await backupService.importSnapshot(importJson, importMode);
      setImportResult(result);
      setImportJson("");
      onDataChanged();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Import failed");
    }
  };

  return (
    <div
      role="region"
      aria-label="Backup and restore screen"
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
      <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 20px 0" }}>Backup & Restore</h1>

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

      {importResult && (
        <div
          role="status"
          style={{
            padding: "12px",
            backgroundColor: "#064e3b",
            color: "#a7f3d0",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          Successfully imported {importResult.tasksImported} tasks and {importResult.notesImported} notes (mode: {importResult.mode}).
        </div>
      )}

      {/* Export Section */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "12px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 8px 0" }}>Export Local Backup</h2>
        <p style={{ fontSize: "13px", color: "#a1a1aa", margin: "0 0 12px 0" }}>
          Generate a portable JSON snapshot containing all local tasks and notes.
        </p>
        <TouchButton label="Generate Backup" onPress={handleExport} variant="primary" />

        {exportedJson ? (
          <div style={{ marginTop: "12px" }}>
            <textarea
              readOnly
              value={exportedJson}
              rows={6}
              aria-label="Exported backup JSON snapshot"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #3f3f46",
                backgroundColor: "#09090b",
                color: "#e4e4e7",
                fontSize: "12px",
                fontFamily: "monospace",
                boxSizing: "border-box",
                marginBottom: "8px",
              }}
            />
            <TouchButton
              label={copySuccess ? "Copied!" : "Copy to Clipboard"}
              onPress={handleCopyExport}
              variant="secondary"
            />
          </div>
        ) : null}
      </div>

      {/* Import Section */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "12px",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 8px 0" }}>Import Backup Snapshot</h2>
        <p style={{ fontSize: "13px", color: "#a1a1aa", margin: "0 0 12px 0" }}>
          Paste a JSON backup snapshot from TaskFlow Web or Mobile.
        </p>

        {/* Mode Selector */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {(["merge", "replace"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={importMode === mode}
              onClick={() => setImportMode(mode)}
              style={{
                flex: 1,
                minHeight: "44px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: importMode === mode ? "#3b82f6" : "#3f3f46",
                backgroundColor: importMode === mode ? "#1e3a8a" : "#18181b",
                color: importMode === mode ? "#93c5fd" : "#a1a1aa",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder="Paste JSON here..."
          rows={5}
          aria-label="Paste backup JSON data"
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #3f3f46",
            backgroundColor: "#09090b",
            color: "#e4e4e7",
            fontSize: "12px",
            fontFamily: "monospace",
            boxSizing: "border-box",
            marginBottom: "12px",
          }}
        />

        <TouchButton label="Import Backup" onPress={handleImport} variant="primary" />
      </div>
    </div>
  );
}
