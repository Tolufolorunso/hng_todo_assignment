"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { stripHtmlToText } from "@/lib/html";

export interface WysiwygEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  maxLength?: number;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  superscript: boolean;
  subscript: boolean;
  justifyLeft: boolean;
  justifyCenter: boolean;
  justifyRight: boolean;
  justifyFull: boolean;
  insertUnorderedList: boolean;
  insertOrderedList: boolean;
  blockquote: boolean;
}

const INITIAL_FORMAT_STATE: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  superscript: false,
  subscript: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  justifyFull: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  blockquote: false,
};

const TEXT_COLORS = [
  { name: "Default", value: "inherit" },
  { name: "Slate", value: "#94a3b8" },
  { name: "Indigo", value: "#818cf8" },
  { name: "Blue", value: "#38bdf8" },
  { name: "Emerald", value: "#34d399" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "Red", value: "#f87171" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", value: "transparent" },
  { name: "Yellow", value: "rgba(250, 204, 21, 0.35)" },
  { name: "Green", value: "rgba(74, 222, 128, 0.35)" },
  { name: "Cyan", value: "rgba(56, 189, 248, 0.35)" },
  { name: "Purple", value: "rgba(168, 85, 247, 0.35)" },
  { name: "Pink", value: "rgba(244, 114, 182, 0.35)" },
  { name: "Orange", value: "rgba(251, 146, 60, 0.35)" },
];

const SYMBOLS = [
  { label: "Check", char: "✔" },
  { label: "Cross", char: "✕" },
  { label: "Warning", char: "⚠️" },
  { label: "Star", char: "★" },
  { label: "Lightning", char: "⚡" },
  { label: "Idea", char: "💡" },
  { label: "Pin", char: "📌" },
  { label: "Target", char: "🎯" },
  { label: "Fire", char: "🔥" },
  { label: "Rocket", char: "🚀" },
  { label: "Sparkles", char: "✨" },
  { label: "Calendar", char: "📅" },
  { label: "Timer", char: "⏱️" },
  { label: "Hourglass", char: "⏳" },
  { label: "Arrow right", char: "➔" },
  { label: "Chevron right", char: "➤" },
  { label: "Bullet", char: "•" },
  { label: "Diamond", char: "❖" },
  { label: "Equal", char: "≈" },
  { label: "Not equal", char: "≠" },
  { label: "Plus minus", char: "±" },
  { label: "Infinity", char: "∞" },
  { label: "Section", char: "§" },
  { label: "Copyright", char: "©" },
];

export default function WysiwygEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Write your note here...",
  ariaLabel = "Note body rich text editor",
  ariaDescribedBy,
  ariaInvalid = false,
  maxLength = 50000,
}: WysiwygEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formats, setFormats] = useState<FormatState>(INITIAL_FORMAT_STATE);
  const [currentBlock, setCurrentBlock] = useState<string>("p");
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [currentTextColor, setCurrentTextColor] = useState<string>("inherit");
  const [currentHighlight, setCurrentHighlight] = useState<string>("transparent");

  const isEmpty = stripHtmlToText(value).trim() === "";
  const charCount = value.length;

  // Initialize and synchronize content from external value
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Enable CSS styling instead of font tags in execCommand
  useEffect(() => {
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      // Ignore if unsupported in environment
    }
  }, []);

  const updateFormatState = useCallback(() => {
    if (!editorRef.current || typeof document === "undefined") return;

    try {
      const isBold = document.queryCommandState("bold");
      const isItalic = document.queryCommandState("italic");
      const isUnderline = document.queryCommandState("underline");
      const isStrike = document.queryCommandState("strikeThrough");
      const isSuper = document.queryCommandState("superscript");
      const isSub = document.queryCommandState("subscript");
      const isLeft = document.queryCommandState("justifyLeft");
      const isCenter = document.queryCommandState("justifyCenter");
      const isRight = document.queryCommandState("justifyRight");
      const isFull = document.queryCommandState("justifyFull");
      const isUl = document.queryCommandState("insertUnorderedList");
      const isOl = document.queryCommandState("insertOrderedList");

      // Check current block format (h1, h2, h3, blockquote, p)
      let block = "p";
      const blockValue = (document.queryCommandValue("formatBlock") || "").toLowerCase();
      if (blockValue.includes("h1")) block = "h1";
      else if (blockValue.includes("h2")) block = "h2";
      else if (blockValue.includes("h3")) block = "h3";
      else if (blockValue.includes("blockquote")) block = "blockquote";

      const selection = window.getSelection();
      let isBlockquote = false;
      if (selection && selection.anchorNode) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeName === "BLOCKQUOTE") {
            isBlockquote = true;
            block = "blockquote";
            break;
          }
          node = node.parentNode;
        }
      }

      setCurrentBlock(block);
      setFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strikeThrough: isStrike,
        superscript: isSuper,
        subscript: isSub,
        justifyLeft: isLeft,
        justifyCenter: isCenter,
        justifyRight: isRight,
        justifyFull: isFull,
        insertUnorderedList: isUl,
        insertOrderedList: isOl,
        blockquote: isBlockquote,
      });
    } catch {
      // Query command state may fail silently on some selections
    }
  }, []);

  // Update format states on selectionchange
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        updateFormatState();
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateFormatState]);

  // Execute standard formatting command
  function executeCommand(command: string, arg?: string) {
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();
    try {
      document.execCommand(command, false, arg);
    } catch {
      // Ignore
    }
    const html = editorRef.current.innerHTML;
    onChange(html);
    updateFormatState();
  }

  // Handle block style (heading, quote, paragraph)
  function handleBlockChange(tag: string) {
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();

    if (tag === "blockquote") {
      try {
        const success = document.execCommand("formatBlock", false, "<blockquote>");
        if (!success) document.execCommand("formatBlock", false, "blockquote");
      } catch {
        document.execCommand("formatBlock", false, "blockquote");
      }
    } else {
      try {
        const success = document.execCommand("formatBlock", false, `<${tag}>`);
        if (!success) document.execCommand("formatBlock", false, tag);
      } catch {
        document.execCommand("formatBlock", false, tag);
      }
    }
    const html = editorRef.current.innerHTML;
    onChange(html);
    setCurrentBlock(tag);
    updateFormatState();
  }

  // Handle font size change
  function handleFontSizeChange(size: string) {
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();
    executeCommand("fontSize", size);
  }

  // Handle text color
  function handleTextColor(color: string) {
    setCurrentTextColor(color);
    setShowTextColor(false);
    executeCommand("foreColor", color);
  }

  // Handle highlight color
  function handleHighlightColor(color: string) {
    setCurrentHighlight(color);
    setShowHighlight(false);
    // hiliteColor is standard, backColor fallback for older engines
    if (!document.execCommand("hiliteColor", false, color)) {
      document.execCommand("backColor", false, color);
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateFormatState();
  }

  // Insert symbol / icon
  function handleInsertSymbol(symbol: string) {
    setShowSymbols(false);
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();
    executeCommand("insertText", symbol);
  }

  // Synchronize on input
  function handleInput() {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onChange(html);
    updateFormatState();
  }

  // Close open popovers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-toolbar-popover]")) {
        setShowTextColor(false);
        setShowHighlight(false);
        setShowSymbols(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
      {/* Microsoft Word Style Formatting Ribbon */}
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-surface-muted/40 px-4 py-2"
        role="toolbar"
        aria-label="Rich text formatting ribbon"
      >
        {/* Style / Headings Dropdown */}
        <div className="flex items-center">
          <label htmlFor="wysiwyg-heading-select" className="sr-only">
            Text style
          </label>
          <select
            id="wysiwyg-heading-select"
            value={currentBlock}
            onChange={(e) => handleBlockChange(e.target.value)}
            disabled={disabled}
            className="h-7 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-text outline-none transition-all hover:border-border-strong focus:border-accent disabled:opacity-50"
            title="Heading style"
          >
            <option value="p">Normal Text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote Block</option>
          </select>
        </div>

        {/* Font Size Selector */}
        <div className="flex items-center">
          <label htmlFor="wysiwyg-fontsize-select" className="sr-only">
            Font size
          </label>
          <select
            id="wysiwyg-fontsize-select"
            onChange={(e) => handleFontSizeChange(e.target.value)}
            defaultValue="3"
            disabled={disabled}
            className="h-7 rounded-lg border border-border bg-surface px-2 text-xs font-medium text-text outline-none transition-all hover:border-border-strong focus:border-accent disabled:opacity-50"
            title="Font size"
          >
            <option value="1">Small (12px)</option>
            <option value="2">Normal (14px)</option>
            <option value="3">Medium (16px)</option>
            <option value="4">Large (18px)</option>
            <option value="5">Extra Large (24px)</option>
          </select>
        </div>

        <div className="h-4 w-[1px] bg-border/80 mx-1" aria-hidden="true" />

        {/* Character Formatting: Bold, Italic, Underline, Strikethrough */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("bold")}
            disabled={disabled}
            aria-pressed={formats.bold}
            title="Bold (Ctrl+B)"
            aria-label="Bold text"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
              formats.bold
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            B
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("italic")}
            disabled={disabled}
            aria-pressed={formats.italic}
            title="Italic (Ctrl+I)"
            aria-label="Italic text"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs italic font-serif transition-all disabled:opacity-50 ${
              formats.italic
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            I
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("underline")}
            disabled={disabled}
            aria-pressed={formats.underline}
            title="Underline (Ctrl+U)"
            aria-label="Underline text"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs underline underline-offset-2 transition-all disabled:opacity-50 ${
              formats.underline
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            U
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("strikeThrough")}
            disabled={disabled}
            aria-pressed={formats.strikeThrough}
            title="Strikethrough"
            aria-label="Strikethrough text"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs line-through transition-all disabled:opacity-50 ${
              formats.strikeThrough
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            S
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("superscript")}
            disabled={disabled}
            aria-pressed={formats.superscript}
            title="Superscript"
            aria-label="Superscript"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-mono transition-all disabled:opacity-50 ${
              formats.superscript
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            X²
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("subscript")}
            disabled={disabled}
            aria-pressed={formats.subscript}
            title="Subscript"
            aria-label="Subscript"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-mono transition-all disabled:opacity-50 ${
              formats.subscript
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            X₂
          </button>
        </div>

        <div className="h-4 w-[1px] bg-border/80 mx-1" aria-hidden="true" />

        {/* Color Controls: Text Color & Highlight */}
        <div className="flex items-center gap-1">
          {/* Text Color Popover */}
          <div className="relative" data-toolbar-popover>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowTextColor(!showTextColor);
                setShowHighlight(false);
                setShowSymbols(false);
              }}
              disabled={disabled}
              title="Text Color"
              aria-label="Text color palette"
              aria-expanded={showTextColor}
              className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs text-text transition-all hover:bg-surface-elevated disabled:opacity-50"
            >
              <span className="flex flex-col items-center">
                <span className="font-bold">A</span>
                <span
                  className="h-1 w-3.5 rounded-full"
                  style={{
                    backgroundColor:
                      currentTextColor === "inherit" ? "currentColor" : currentTextColor,
                  }}
                />
              </span>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </button>

            {showTextColor && (
              <div className="absolute left-0 top-full z-30 mt-1.5 flex flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-card-hover backdrop-blur-md">
                <span className="text-[10px] font-semibold text-muted">Font Color</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {TEXT_COLORS.map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleTextColor(col.value)}
                      title={col.name}
                      aria-label={`Color ${col.name}`}
                      className="h-6 w-6 rounded-md border border-border/80 transition-all hover:scale-110 active:scale-95"
                      style={{
                        backgroundColor: col.value === "inherit" ? "var(--text)" : col.value,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color Popover */}
          <div className="relative" data-toolbar-popover>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowHighlight(!showHighlight);
                setShowTextColor(false);
                setShowSymbols(false);
              }}
              disabled={disabled}
              title="Highlight Color"
              aria-label="Highlight text background"
              aria-expanded={showHighlight}
              className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs text-text transition-all hover:bg-surface-elevated disabled:opacity-50"
            >
              <span className="flex flex-col items-center">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 11-6 6v3h3l6-6" />
                  <path d="m22 2-4.5 4.5" />
                  <path d="M13.5 6.5 17.5 10.5" />
                </svg>
                <span
                  className="h-1 w-3.5 rounded-full"
                  style={{
                    backgroundColor:
                      currentHighlight === "transparent" ? "#fbbf24" : currentHighlight,
                  }}
                />
              </span>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </button>

            {showHighlight && (
              <div className="absolute left-0 top-full z-30 mt-1.5 flex flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-card-hover backdrop-blur-md">
                <span className="text-[10px] font-semibold text-muted">Highlight Color</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {HIGHLIGHT_COLORS.map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleHighlightColor(col.value)}
                      title={col.name}
                      aria-label={`Highlight ${col.name}`}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-border/80 transition-all hover:scale-110 active:scale-95"
                      style={{ backgroundColor: col.value }}
                    >
                      {col.value === "transparent" && (
                        <span className="text-[10px] text-danger font-bold">∅</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-4 w-[1px] bg-border/80 mx-1" aria-hidden="true" />

        {/* Alignment Controls */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("justifyLeft")}
            disabled={disabled}
            aria-pressed={formats.justifyLeft}
            title="Align Left"
            aria-label="Align text left"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-all disabled:opacity-50 ${
              formats.justifyLeft
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="18" y2="18" />
            </svg>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("justifyCenter")}
            disabled={disabled}
            aria-pressed={formats.justifyCenter}
            title="Align Center"
            aria-label="Align text center"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-all disabled:opacity-50 ${
              formats.justifyCenter
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("justifyRight")}
            disabled={disabled}
            aria-pressed={formats.justifyRight}
            title="Align Right"
            aria-label="Align text right"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-all disabled:opacity-50 ${
              formats.justifyRight
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="9" y1="12" x2="21" y2="12" />
              <line x1="6" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("justifyFull")}
            disabled={disabled}
            aria-pressed={formats.justifyFull}
            title="Justify"
            aria-label="Justify text"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-all disabled:opacity-50 ${
              formats.justifyFull
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <div className="h-4 w-[1px] bg-border/80 mx-1" aria-hidden="true" />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("insertUnorderedList")}
            disabled={disabled}
            aria-pressed={formats.insertUnorderedList}
            title="Bulleted List"
            aria-label="Insert bulleted list"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-all disabled:opacity-50 ${
              formats.insertUnorderedList
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="9" y1="6" x2="20" y2="6" />
              <line x1="9" y1="12" x2="20" y2="12" />
              <line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4" cy="6" r="1.5" fill="currentColor" />
              <circle cx="4" cy="12" r="1.5" fill="currentColor" />
              <circle cx="4" cy="18" r="1.5" fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("insertOrderedList")}
            disabled={disabled}
            aria-pressed={formats.insertOrderedList}
            title="Numbered List"
            aria-label="Insert numbered list"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-all disabled:opacity-50 ${
              formats.insertOrderedList
                ? "bg-accent/20 text-accent shadow-xs"
                : "text-text hover:bg-surface-elevated hover:text-text"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="10" y1="6" x2="20" y2="6" />
              <line x1="10" y1="12" x2="20" y2="12" />
              <line x1="10" y1="18" x2="20" y2="18" />
              <path d="M4 7V5h1" />
              <path d="M4 11h2v2H4v1h2" />
            </svg>
          </button>
        </div>

        <div className="h-4 w-[1px] bg-border/80 mx-1" aria-hidden="true" />

        {/* Symbol / Icon Inserter Popover */}
        <div className="relative" data-toolbar-popover>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowSymbols(!showSymbols);
              setShowTextColor(false);
              setShowHighlight(false);
            }}
            disabled={disabled}
            title="Insert Symbol or Icon"
            aria-label="Insert symbol or icon"
            aria-expanded={showSymbols}
            className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs text-text transition-all hover:bg-surface-elevated disabled:opacity-50"
          >
            <span className="text-sm">★</span>
            <span className="text-[11px] font-medium hidden sm:inline">Insert</span>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </button>

          {showSymbols && (
            <div className="absolute left-0 top-full z-30 mt-1.5 flex w-56 flex-col gap-1 rounded-xl border border-border bg-surface p-2.5 shadow-card-hover backdrop-blur-md">
              <span className="text-[10px] font-semibold text-muted">Insert Symbol / Icon</span>
              <div className="grid grid-cols-6 gap-1 pt-1">
                {SYMBOLS.map((item) => (
                  <button
                    key={item.char}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleInsertSymbol(item.char)}
                    title={item.label}
                    aria-label={item.label}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-xs transition-all hover:border-accent hover:bg-accent/20 hover:scale-110 active:scale-95"
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-border/80 mx-1" aria-hidden="true" />

        {/* Undo / Redo & Clear Formatting */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("undo")}
            disabled={disabled}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-text transition-all hover:bg-surface-elevated disabled:opacity-50"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("redo")}
            disabled={disabled}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-text transition-all hover:bg-surface-elevated disabled:opacity-50"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand("removeFormat")}
            disabled={disabled}
            title="Clear Formatting"
            aria-label="Clear formatting"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-text transition-all hover:bg-surface-elevated disabled:opacity-50"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m7 21 10-10" />
              <path d="M4 11l7-7 6 6-7 7H4v-6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ContentEditable Canvas */}
      <div className="relative flex flex-1 flex-col">
        {isEmpty && (
          <div
            className="pointer-events-none absolute left-6 top-5 select-none text-sm text-faint"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyUp={updateFormatState}
          onMouseUp={updateFormatState}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-text outline-none transition-all
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-text
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-2.5 [&_h2]:text-text
            [&_h3]:text-lg [&_h3]:font-medium [&_h3]:my-2 [&_h3]:text-text
            [&_blockquote]:border-l-4 [&_blockquote]:border-accent/60 [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:my-3 [&_blockquote]:text-muted
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
            [&_li]:my-1
            [&_p]:my-1.5"
          style={{ minHeight: "260px" }}
        />
      </div>

      {/* Bottom status / character count bar */}
      <div className="flex items-center justify-between border-t border-border/50 bg-surface-muted/20 px-6 py-1.5 text-[11px] text-faint">
        <span>Microsoft Word-style Rich Text</span>
        <span className={charCount > maxLength ? "font-semibold text-danger" : ""}>
          {charCount.toLocaleString()} / {maxLength.toLocaleString()} characters
        </span>
      </div>
    </div>
  );
}
