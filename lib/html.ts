/**
 * Strips HTML tags and decodes common HTML entities into clean plain text.
 */
export function stripHtmlToText(rawHtml: string): string {
  if (!rawHtml) {
    return "";
  }

  // Insert breaks where block elements or br tags occur
  let text = rawHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n")
    // Remove all other HTML tags
    .replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return "";
      }
    });

  // Normalize excessive whitespace while preserving single line breaks
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .trim();
}

/**
 * Creates a concise plain-text excerpt from formatted HTML for list previews.
 */
export function createExcerpt(rawHtml: string, maxLength = 120): string {
  const plain = stripHtmlToText(rawHtml);
  if (plain.length <= maxLength) {
    return plain;
  }
  return plain.slice(0, maxLength).trimEnd() + "...";
}

export interface ReadingStats {
  words: number;
  readingTimeMinutes: number;
}

/**
 * Calculates total words and estimated reading time in minutes (assuming 200 words per minute).
 */
export function calculateReadingStats(rawHtml: string): ReadingStats {
  const plainText = stripHtmlToText(rawHtml);
  if (!plainText) {
    return { words: 0, readingTimeMinutes: 0 };
  }

  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) {
    return { words: 0, readingTimeMinutes: 0 };
  }

  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
  return { words, readingTimeMinutes };
}
