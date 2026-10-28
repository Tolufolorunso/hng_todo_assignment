using System;
using System.Linq;
using System.Text.RegularExpressions;

namespace TaskFlow.Common;

public record ReadingStats(int Words, int ReadingTimeMinutes);

public static class HtmlMetricsHelper
{
    private static readonly Regex TagRegex = new(@"<[^>]+>", RegexOptions.Compiled);
    private static readonly Regex BlockBreakRegex = new(@"<\s*(br|/p|/div|/h[1-6]|/li|/blockquote|/tr)\s*/?>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex MultipleSpacesRegex = new(@"\s+", RegexOptions.Compiled);
    private static readonly Regex DecimalEntityRegex = new(@"&#(\d+);?", RegexOptions.Compiled);
    private static readonly Regex HexEntityRegex = new(@"&#x([0-9a-fA-F]+);?", RegexOptions.Compiled);

    /// <summary>
    /// Strips HTML tags and decodes common HTML entities into clean plain text.
    /// </summary>
    public static string StripHtmlToText(string? rawHtml)
    {
        if (string.IsNullOrWhiteSpace(rawHtml))
        {
            return string.Empty;
        }

        // Insert newlines where block breaks occur
        string text = BlockBreakRegex.Replace(rawHtml, "\n");

        // Remove all remaining tags
        text = TagRegex.Replace(text, string.Empty);

        // Decode standard HTML entities
        text = DecodeHtmlEntities(text);

        // Normalize excessive whitespace while keeping single spaces
        string[] lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        var cleanedLines = lines
            .Select(l => MultipleSpacesRegex.Replace(l.Trim(), " "))
            .Where(l => l.Length > 0);

        return string.Join(" ", cleanedLines).Trim();
    }

    /// <summary>
    /// Creates a concise plain-text excerpt from formatted HTML for list previews.
    /// </summary>
    public static string CreateExcerpt(string? rawHtml, int maxLength = 120)
    {
        string plain = StripHtmlToText(rawHtml);
        if (plain.Length <= maxLength)
        {
            return plain;
        }
        return plain.Substring(0, maxLength).TrimEnd() + "...";
    }

    /// <summary>
    /// Calculates total words and estimated reading time in minutes (assuming 200 words per minute).
    /// </summary>
    public static ReadingStats CalculateReadingStats(string? rawHtml)
    {
        string plainText = StripHtmlToText(rawHtml);
        if (string.IsNullOrWhiteSpace(plainText))
        {
            return new ReadingStats(0, 0);
        }

        string[] words = plainText.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        int wordCount = words.Length;
        if (wordCount == 0)
        {
            return new ReadingStats(0, 0);
        }

        int readingMinutes = Math.Max(1, (int)Math.Ceiling(wordCount / 200.0));
        return new ReadingStats(wordCount, readingMinutes);
    }

    /// <summary>
    /// Decodes common named, decimal, and hex HTML entities.
    /// </summary>
    public static string DecodeHtmlEntities(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;

        string decoded = input
            .Replace("&nbsp;", " ", StringComparison.OrdinalIgnoreCase)
            .Replace("&amp;", "&", StringComparison.OrdinalIgnoreCase)
            .Replace("&lt;", "<", StringComparison.OrdinalIgnoreCase)
            .Replace("&gt;", ">", StringComparison.OrdinalIgnoreCase)
            .Replace("&quot;", "\"", StringComparison.OrdinalIgnoreCase)
            .Replace("&#39;", "'", StringComparison.OrdinalIgnoreCase)
            .Replace("&apos;", "'", StringComparison.OrdinalIgnoreCase);

        decoded = DecimalEntityRegex.Replace(decoded, m =>
        {
            if (int.TryParse(m.Groups[1].Value, out int code))
            {
                try { return char.ConvertFromUtf32(code); } catch { }
            }
            return string.Empty;
        });

        decoded = HexEntityRegex.Replace(decoded, m =>
        {
            try
            {
                int code = Convert.ToInt32(m.Groups[1].Value, 16);
                return char.ConvertFromUtf32(code);
            }
            catch { }
            return string.Empty;
        });

        return decoded;
    }
}

