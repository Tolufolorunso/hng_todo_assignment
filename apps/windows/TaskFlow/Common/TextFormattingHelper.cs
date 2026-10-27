using System;

namespace TaskFlow.Common;

public static class TextFormattingHelper
{
    public static (string newText, int newSelectionStart, int newSelectionLength) ApplyFormat(
        string? text,
        int selectionStart,
        int selectionLength,
        string action)
    {
        text ??= string.Empty;
        selectionStart = Math.Max(0, Math.Min(selectionStart, text.Length));
        selectionLength = Math.Max(0, Math.Min(selectionLength, text.Length - selectionStart));

        switch (action?.ToLowerInvariant())
        {
            case "bold":
                return WrapSelection(text, selectionStart, selectionLength, "**", "**", "bold text");
            case "italic":
                return WrapSelection(text, selectionStart, selectionLength, "*", "*", "italic text");
            case "strikethrough":
                return WrapSelection(text, selectionStart, selectionLength, "~~", "~~", "strikethrough text");
            case "code":
                return WrapSelection(text, selectionStart, selectionLength, "`", "`", "code text");
            case "h1":
                return PrefixLine(text, selectionStart, selectionLength, "# ", "Heading 1");
            case "h2":
                return PrefixLine(text, selectionStart, selectionLength, "## ", "Heading 2");
            case "bullet":
                return PrefixLine(text, selectionStart, selectionLength, "- ", "List item");
            case "numbered":
                return PrefixLine(text, selectionStart, selectionLength, "1. ", "List item");
            case "quote":
                return PrefixLine(text, selectionStart, selectionLength, "> ", "Quote text");
            default:
                return (text, selectionStart, selectionLength);
        }
    }

    private static (string, int, int) WrapSelection(
        string text,
        int start,
        int length,
        string prefix,
        string suffix,
        string defaultText)
    {
        string inner = length > 0 ? text.Substring(start, length) : defaultText;
        string replacement = prefix + inner + suffix;
        string newText = text.Substring(0, start) + replacement + text.Substring(start + length);
        int newStart = start + prefix.Length;
        int newLength = inner.Length;
        return (newText, newStart, newLength);
    }

    private static (string, int, int) PrefixLine(
        string text,
        int start,
        int length,
        string prefix,
        string defaultText)
    {
        string inner = length > 0 ? text.Substring(start, length) : defaultText;
        string replacement = prefix + inner;
        string newText = text.Substring(0, start) + replacement + text.Substring(start + length);
        int newStart = start + prefix.Length;
        int newLength = inner.Length;
        return (newText, newStart, newLength);
    }
}
