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
