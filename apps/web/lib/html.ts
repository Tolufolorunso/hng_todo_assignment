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

const DANGEROUS_TAGS_PATTERN =
  "script|style|iframe|object|embed|applet|form|input|textarea|select|button|base|meta|link|noscript|frame|frameset|svg|math";

const ALLOWED_TAGS = new Set([
  "p",
  "div",
  "span",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "del",
  "sub",
  "sup",
  "blockquote",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "font",
  "a",
]);

const ALLOWED_CSS_PROPS = new Set([
  "color",
  "background-color",
  "text-align",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "line-height",
]);

function decodeBasicEntities(str: string): string {
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);?/g, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => {
      try {
        return String.fromCharCode(parseInt(code, 16));
      } catch {
        return "";
      }
    });
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeHref(rawHref: string): string | null {
  const decoded = decodeBasicEntities(rawHref);
  const normalized = decoded.replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, "").toLowerCase();

  if (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("vbscript:")
  ) {
    return null;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("mailto:") ||
    /^[/#.]/.test(rawHref.trim())
  ) {
    return rawHref.trim();
  }

  return null;
}

function sanitizeStyle(styleStr: string): string {
  const declarations = styleStr.split(";");
  const cleanDecls: string[] = [];

  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim();

    if (!ALLOWED_CSS_PROPS.has(prop)) continue;

    const lowerVal = val.toLowerCase();
    if (
      lowerVal.includes("url(") ||
      lowerVal.includes("expression(") ||
      lowerVal.includes("javascript:") ||
      lowerVal.includes("@import") ||
      lowerVal.includes("behavior:") ||
      /[<>"'`\\]/.test(val)
    ) {
      continue;
    }

    cleanDecls.push(`${prop}: ${val}`);
  }

  return cleanDecls.join("; ");
}

/**
 * Sanitizes rich HTML for safe rendering via dangerouslySetInnerHTML.
 * Strips executable scripts, event handlers, unsafe tags, and protocol-based XSS vectors
 * while preserving valid WYSIWYG formatting (headings, lists, bold, colors, styles).
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") {
    return "";
  }

  let cleaned = rawHtml;

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // Strip dangerous elements and their enclosed content in repeated passes to defeat nested bypasses
  const pairedDangerousRegex = new RegExp(
    `<(${DANGEROUS_TAGS_PATTERN})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
    "gi",
  );
  const singleDangerousRegex = new RegExp(
    `<\\/?(${DANGEROUS_TAGS_PATTERN})\\b[^>]*>`,
    "gi",
  );

  let prev: string;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(pairedDangerousRegex, "").replace(singleDangerousRegex, "");
  } while (cleaned !== prev);

  // Match all remaining tags and sanitize their names and attributes
  const tagRegex = /<(\/)?([a-zA-Z0-9]+)([^>]*)>/g;
  cleaned = cleaned.replace(tagRegex, (_, isClosing, rawTagName, rawAttrs) => {
    const tagName = rawTagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      return "";
    }

    if (isClosing) {
      return `</${tagName}>`;
    }

    const safeAttrs: string[] = [];
    let hasTargetBlank = false;

    const attrRegex = /([a-zA-Z0-9_\-:]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

      // Disallow all event handler attributes
      if (attrName.startsWith("on")) {
        continue;
      }

      // Check protocol-based XSS in any attribute
      const decodedVal = decodeBasicEntities(attrValue);
      const normalizedVal = decodedVal.replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, "").toLowerCase();
      if (
        normalizedVal.startsWith("javascript:") ||
        normalizedVal.startsWith("data:") ||
        normalizedVal.startsWith("vbscript:")
      ) {
        continue;
      }

      // Validate allowed attributes by tag
      if (tagName === "a") {
        if (attrName === "href") {
          const safeHref = sanitizeHref(attrValue);
          if (safeHref) {
            safeAttrs.push(`href="${escapeHtmlAttr(safeHref)}"`);
          }
        } else if (attrName === "target") {
          if (attrValue === "_blank") {
            hasTargetBlank = true;
          }
        } else if (attrName === "title") {
          safeAttrs.push(`title="${escapeHtmlAttr(attrValue)}"`);
        }
      } else if (tagName === "span" || tagName === "div" || tagName === "p") {
        if (attrName === "style") {
          const safeStyle = sanitizeStyle(attrValue);
          if (safeStyle) {
            safeAttrs.push(`style="${escapeHtmlAttr(safeStyle)}"`);
          }
        } else if (attrName === "title") {
          safeAttrs.push(`title="${escapeHtmlAttr(attrValue)}"`);
        }
      } else if (tagName === "font") {
        if (attrName === "color") {
          if (/^#[0-9a-fA-F]{3,8}$/.test(attrValue) || /^[a-zA-Z]+$/.test(attrValue)) {
            safeAttrs.push(`color="${escapeHtmlAttr(attrValue)}"`);
          }
        } else if (attrName === "size" && /^[1-7]$/.test(attrValue)) {
          safeAttrs.push(`size="${attrValue}"`);
        } else if (attrName === "style") {
          const safeStyle = sanitizeStyle(attrValue);
          if (safeStyle) {
            safeAttrs.push(`style="${escapeHtmlAttr(safeStyle)}"`);
          }
        }
      } else if (tagName === "td" || tagName === "th") {
        if (attrName === "colspan" && /^\d+$/.test(attrValue)) {
          safeAttrs.push(`colspan="${attrValue}"`);
        } else if (attrName === "rowspan" && /^\d+$/.test(attrValue)) {
          safeAttrs.push(`rowspan="${attrValue}"`);
        } else if (attrName === "align" && /^(left|center|right|justify)$/i.test(attrValue)) {
          safeAttrs.push(`align="${attrValue.toLowerCase()}"`);
        } else if (attrName === "style") {
          const safeStyle = sanitizeStyle(attrValue);
          if (safeStyle) {
            safeAttrs.push(`style="${escapeHtmlAttr(safeStyle)}"`);
          }
        }
      } else if (tagName === "ol") {
        if (attrName === "start" && /^\d+$/.test(attrValue)) {
          safeAttrs.push(`start="${attrValue}"`);
        } else if (attrName === "type" && /^[1aAiI]$/.test(attrValue)) {
          safeAttrs.push(`type="${attrValue}"`);
        }
      }
    }

    if (tagName === "a" && hasTargetBlank) {
      safeAttrs.push('target="_blank" rel="noopener noreferrer"');
    }

    const attrsStr = safeAttrs.length > 0 ? " " + safeAttrs.join(" ") : "";
    if (tagName === "br" || tagName === "hr") {
      return `<${tagName}${attrsStr} />`;
    }
    return `<${tagName}${attrsStr}>`;
  });

  return cleaned;
}
