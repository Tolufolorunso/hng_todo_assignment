using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;

namespace TaskFlow.Common;

public static class HtmlFlowDocumentEngine
{
    private static readonly Regex ScriptStyleTagRegex = new(
        @"<(script|style|iframe|object|embed|applet|form|input|textarea|select|button|meta|link)[^>]*>.*?</\1\s*>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex SelfClosingDangerousRegex = new(
        @"<(script|style|iframe|object|embed|applet|form|input|textarea|select|button|meta|link)[^>]*/>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex OnEventAttrRegex = new(
        @"\son\w+\s*=\s*(?:""[^""]*""|'[^']*'|[^\s>]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex TagSplitter = new(
        @"(</?[a-zA-Z0-9]+(?:\s+[^>]*)?>)",
        RegexOptions.Compiled);

    private static readonly Regex StyleAttrRegex = new(
        @"style\s*=\s*[""']([^""']*)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ColorAttrRegex = new(
        @"color\s*=\s*[""']([^""']*)[""']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Color DefaultTextColor = Color.FromRgb(0xF8, 0xFA, 0xFC);

    private static SolidColorBrush CreateDefaultTextBrush()
    {
        var brush = new SolidColorBrush(DefaultTextColor);
        brush.Freeze();
        return brush;
    }

    /// <summary>
    /// Parses taskflow-html-v1 HTML string into a native WPF FlowDocument.
    /// </summary>
    public static FlowDocument HtmlToFlowDocument(string? html)
    {
        var doc = new FlowDocument
        {
            PagePadding = new Thickness(0),
            Background = Brushes.Transparent,
            Foreground = CreateDefaultTextBrush(),
            FontFamily = new FontFamily("Segoe UI"),
            TextAlignment = TextAlignment.Left
        };

        if (string.IsNullOrWhiteSpace(html))
        {
            var p = CreateDefaultParagraph();
            doc.Blocks.Add(p);
            return doc;
        }

        // 1. Sanitize unsafe elements
        string cleanHtml = ScriptStyleTagRegex.Replace(html, string.Empty);
        cleanHtml = SelfClosingDangerousRegex.Replace(cleanHtml, string.Empty);
        cleanHtml = OnEventAttrRegex.Replace(cleanHtml, string.Empty);

        // 2. Tokenize into blocks
        var blocks = ParseHtmlBlocks(cleanHtml);
        if (blocks.Count == 0)
        {
            var p = CreateDefaultParagraph();
            doc.Blocks.Add(p);
        }
        else
        {
            foreach (var b in blocks)
            {
                doc.Blocks.Add(b);
            }
        }

        return doc;
    }

    /// <summary>
    /// Serializes a WPF FlowDocument into clean taskflow-html-v1 HTML string.
    /// </summary>
    public static string FlowDocumentToHtml(FlowDocument? doc)
    {
        if (doc == null || doc.Blocks.Count == 0)
        {
            return "<p></p>";
        }

        var sb = new StringBuilder();

        foreach (var block in doc.Blocks)
        {
            if (block is Paragraph p)
            {
                SerializeParagraph(p, sb);
            }
            else if (block is List list)
            {
                SerializeList(list, sb);
            }
            else if (block is Section section)
            {
                SerializeSection(section, sb);
            }
        }

        string result = sb.ToString().Trim();
        return string.IsNullOrEmpty(result) ? "<p></p>" : result;
    }

    private static Paragraph CreateDefaultParagraph()
    {
        return new Paragraph
        {
            Margin = new Thickness(0, 0, 0, 8),
            FontSize = 13,
            LineHeight = 20,
            TextAlignment = TextAlignment.Left,
            Foreground = CreateDefaultTextBrush()
        };
    }

    private static List<Block> ParseHtmlBlocks(string html)
    {
        var result = new List<Block>();

        // Regex pattern to extract block-level chunks
        var blockRegex = new Regex(
            @"(<(h[1-3]|p|blockquote|ul|ol)(?:\s+[^>]*)?>.*?</\2\s*>)|(<hr\s*/?>)|([^<]+)",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);

        var matches = blockRegex.Matches(html);
        if (matches.Count == 0)
        {
            // Plain text or standalone inlines
            var p = CreateDefaultParagraph();
            ParseInlinesIntoParagraph(html, p);
            result.Add(p);
            return result;
        }

        bool hasBlockTag = false;

        foreach (Match match in matches)
        {
            string content = match.Value.Trim();
            if (string.IsNullOrEmpty(content)) continue;

            if (content.StartsWith("<h1", StringComparison.OrdinalIgnoreCase))
            {
                hasBlockTag = true;
                result.Add(CreateHeadingParagraph(content, "h1", 22, FontWeights.Bold));
            }
            else if (content.StartsWith("<h2", StringComparison.OrdinalIgnoreCase))
            {
                hasBlockTag = true;
                result.Add(CreateHeadingParagraph(content, "h2", 18, FontWeights.Bold));
            }
            else if (content.StartsWith("<h3", StringComparison.OrdinalIgnoreCase))
            {
                hasBlockTag = true;
                result.Add(CreateHeadingParagraph(content, "h3", 15, FontWeights.SemiBold));
            }
            else if (content.StartsWith("<blockquote", StringComparison.OrdinalIgnoreCase))
            {
                hasBlockTag = true;
                result.Add(CreateBlockquote(content));
            }
            else if (content.StartsWith("<ul", StringComparison.OrdinalIgnoreCase))
            {
                hasBlockTag = true;
                result.Add(CreateListBlock(content, TextMarkerStyle.Disc));
            }
            else if (content.StartsWith("<ol", StringComparison.OrdinalIgnoreCase))
            {
                hasBlockTag = true;
                result.Add(CreateListBlock(content, TextMarkerStyle.Decimal));
            }
            else if (content.StartsWith("<p", StringComparison.OrdinalIgnoreCase))
            {
                hasBlockTag = true;
                result.Add(CreateStandardParagraph(content));
            }
            else
            {
                // Loose text or unknown tag
                string stripped = content.Trim();
                if (!string.IsNullOrEmpty(stripped))
                {
                    var p = CreateDefaultParagraph();
                    ParseInlinesIntoParagraph(stripped, p);
                    result.Add(p);
                }
            }
        }

        // If content had no block tags at all but raw text or raw inlines
        if (!hasBlockTag && result.Count == 0)
        {
            var p = CreateDefaultParagraph();
            ParseInlinesIntoParagraph(html, p);
            result.Add(p);
        }

        return result;
    }

    private static Paragraph CreateHeadingParagraph(string blockHtml, string tag, double fontSize, FontWeight fontWeight)
    {
        var p = new Paragraph
        {
            Tag = tag,
            FontSize = fontSize,
            FontWeight = fontWeight,
            Margin = new Thickness(0, tag == "h1" ? 10 : 6, 0, 4),
            TextAlignment = TextAlignment.Left,
            Foreground = CreateDefaultTextBrush()
        };

        ApplyTextAlignment(blockHtml, p);

        string inner = ExtractInnerHtml(blockHtml);
        ParseInlinesIntoParagraph(inner, p);
        return p;
    }

    private static Paragraph CreateStandardParagraph(string blockHtml)
    {
        var p = CreateDefaultParagraph();
        ApplyTextAlignment(blockHtml, p);

        string inner = ExtractInnerHtml(blockHtml);
        ParseInlinesIntoParagraph(inner, p);
        return p;
    }

    private static Block CreateBlockquote(string blockHtml)
    {
        var p = new Paragraph
        {
            Tag = "blockquote",
            Margin = new Thickness(12, 4, 0, 8),
            Padding = new Thickness(10, 2, 0, 2),
            BorderThickness = new Thickness(3, 0, 0, 0),
            BorderBrush = new SolidColorBrush(Color.FromRgb(0x3B, 0x82, 0xF6)),
            FontStyle = FontStyles.Italic,
            Foreground = new SolidColorBrush(Color.FromRgb(0x94, 0xA3, 0xB8)),
            FontSize = 13,
            TextAlignment = TextAlignment.Left
        };

        ApplyTextAlignment(blockHtml, p);

        string inner = ExtractInnerHtml(blockHtml);
        ParseInlinesIntoParagraph(inner, p);
        return p;
    }

    private static List CreateListBlock(string listHtml, TextMarkerStyle markerStyle)
    {
        var list = new List
        {
            MarkerStyle = markerStyle,
            Margin = new Thickness(16, 2, 0, 8),
            Padding = new Thickness(0)
        };

        var liMatches = Regex.Matches(listHtml, @"<li(?:\s+[^>]*)?>(.*?)</li>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        foreach (Match liMatch in liMatches)
        {
            string liInner = liMatch.Groups[1].Value;
            var item = new ListItem();
            var p = CreateDefaultParagraph();
            p.Margin = new Thickness(0, 0, 0, 3);
            ParseInlinesIntoParagraph(liInner, p);
            item.Blocks.Add(p);
            list.ListItems.Add(item);
        }

        return list;
    }

    private static void ApplyTextAlignment(string tagHtml, Paragraph p)
    {
        var match = StyleAttrRegex.Match(tagHtml);
        if (match.Success)
        {
            string style = match.Groups[1].Value.ToLowerInvariant();
            if (style.Contains("text-align: center") || style.Contains("text-align:center"))
            {
                p.TextAlignment = TextAlignment.Center;
            }
            else if (style.Contains("text-align: right") || style.Contains("text-align:right"))
            {
                p.TextAlignment = TextAlignment.Right;
            }
            else if (style.Contains("text-align: justify") || style.Contains("text-align:justify"))
            {
                p.TextAlignment = TextAlignment.Justify;
            }
            else if (style.Contains("text-align: left") || style.Contains("text-align:left"))
            {
                p.TextAlignment = TextAlignment.Left;
            }
        }
    }

    private static string ExtractInnerHtml(string blockHtml)
    {
        int start = blockHtml.IndexOf('>');
        int end = blockHtml.LastIndexOf('<');
        if (start >= 0 && end > start)
        {
            return blockHtml.Substring(start + 1, end - start - 1);
        }
        return blockHtml;
    }

    private record FormattingState
    {
        public bool Bold { get; init; }
        public bool Italic { get; init; }
        public bool Underline { get; init; }
        public bool Strikethrough { get; init; }
        public bool Subscript { get; init; }
        public bool Superscript { get; init; }
        public Color? TextColor { get; init; }
        public Color? HighlightColor { get; init; }
    }

    private static void ParseInlinesIntoParagraph(string html, Paragraph paragraph)
    {
        if (string.IsNullOrEmpty(html)) return;

        var tokens = TagSplitter.Split(html);
        var stateStack = new Stack<FormattingState>();
        stateStack.Push(new FormattingState());

        foreach (var token in tokens)
        {
            if (string.IsNullOrEmpty(token)) continue;

            if (token.StartsWith("<") && token.EndsWith(">"))
            {
                // Tag
                HandleInlineTag(token, stateStack, paragraph);
            }
            else
            {
                // Text
                string decoded = HtmlMetricsHelper.DecodeHtmlEntities(token);
                if (!string.IsNullOrEmpty(decoded))
                {
                    var run = CreateRun(decoded, stateStack.Peek());
                    paragraph.Inlines.Add(run);
                }
            }
        }
    }

    private static void HandleInlineTag(string tag, Stack<FormattingState> stateStack, Paragraph paragraph)
    {
        string lower = tag.ToLowerInvariant();

        if (lower.StartsWith("<br") || lower == "<br/>" || lower == "<br>")
        {
            paragraph.Inlines.Add(new LineBreak());
            return;
        }

        var current = stateStack.Peek();

        if (lower == "<strong>" || lower == "<b>")
        {
            stateStack.Push(current with { Bold = true });
        }
        else if (lower == "</strong>" || lower == "</b>")
        {
            if (stateStack.Count > 1) stateStack.Pop();
        }
        else if (lower == "<em>" || lower == "<i>")
        {
            stateStack.Push(current with { Italic = true });
        }
        else if (lower == "</em>" || lower == "</i>")
        {
            if (stateStack.Count > 1) stateStack.Pop();
        }
        else if (lower == "<u>")
        {
            stateStack.Push(current with { Underline = true });
        }
        else if (lower == "</u>")
        {
            if (stateStack.Count > 1) stateStack.Pop();
        }
        else if (lower == "<s>" || lower == "<strike>" || lower == "<del>")
        {
            stateStack.Push(current with { Strikethrough = true });
        }
        else if (lower == "</s>" || lower == "</strike>" || lower == "</del>")
        {
            if (stateStack.Count > 1) stateStack.Pop();
        }
        else if (lower == "<sub>")
        {
            stateStack.Push(current with { Subscript = true });
        }
        else if (lower == "</sub>")
        {
            if (stateStack.Count > 1) stateStack.Pop();
        }
        else if (lower == "<sup>")
        {
            stateStack.Push(current with { Superscript = true });
        }
        else if (lower == "</sup>")
        {
            if (stateStack.Count > 1) stateStack.Pop();
        }
        else if (lower.StartsWith("<span") || lower.StartsWith("<font"))
        {
            Color? textColor = current.TextColor;
            Color? highlightColor = current.HighlightColor;

            // Check style attribute
            var styleMatch = StyleAttrRegex.Match(tag);
            if (styleMatch.Success)
            {
                string style = styleMatch.Groups[1].Value;
                textColor = ParseColorProperty(style, "color") ?? textColor;
                highlightColor = ParseColorProperty(style, "background-color") ?? highlightColor;
            }

            // Check font color
            var colorMatch = ColorAttrRegex.Match(tag);
            if (colorMatch.Success)
            {
                textColor = ParseHexOrNamedColor(colorMatch.Groups[1].Value) ?? textColor;
            }

            stateStack.Push(current with { TextColor = textColor, HighlightColor = highlightColor });
        }
        else if (lower == "</span>" || lower == "</font>")
        {
            if (stateStack.Count > 1) stateStack.Pop();
        }
    }

    private static Run CreateRun(string text, FormattingState state)
    {
        var run = new Run(text);

        if (state.Bold)
        {
            run.FontWeight = FontWeights.Bold;
        }

        if (state.Italic)
        {
            run.FontStyle = FontStyles.Italic;
        }

        if (state.Underline && state.Strikethrough)
        {
            var coll = new TextDecorationCollection();
            coll.Add(TextDecorations.Underline);
            coll.Add(TextDecorations.Strikethrough);
            run.TextDecorations = coll;
        }
        else if (state.Underline)
        {
            run.TextDecorations = TextDecorations.Underline;
        }
        else if (state.Strikethrough)
        {
            run.TextDecorations = TextDecorations.Strikethrough;
        }

        if (state.Subscript)
        {
            Typography.SetVariants(run, FontVariants.Subscript);
        }
        else if (state.Superscript)
        {
            Typography.SetVariants(run, FontVariants.Superscript);
        }

        if (state.TextColor.HasValue)
        {
            run.Foreground = new SolidColorBrush(state.TextColor.Value);
        }

        if (state.HighlightColor.HasValue)
        {
            run.Background = new SolidColorBrush(state.HighlightColor.Value);
        }

        return run;
    }

    private static Color? ParseColorProperty(string style, string propertyName)
    {
        var match = Regex.Match(style, $@"{propertyName}\s*:\s*([^;]+)", RegexOptions.IgnoreCase);
        if (match.Success)
        {
            return ParseHexOrNamedColor(match.Groups[1].Value.Trim());
        }
        return null;
    }

    public static Color? ParseHexOrNamedColor(string colorStr)
    {
        if (string.IsNullOrWhiteSpace(colorStr) || colorStr.Equals("inherit", StringComparison.OrdinalIgnoreCase) || colorStr.Equals("transparent", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // Handle rgba(r, g, b, a)
        var rgbaMatch = Regex.Match(colorStr, @"rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d\.]+))?\s*\)", RegexOptions.IgnoreCase);
        if (rgbaMatch.Success)
        {
            byte r = byte.Parse(rgbaMatch.Groups[1].Value);
            byte g = byte.Parse(rgbaMatch.Groups[2].Value);
            byte b = byte.Parse(rgbaMatch.Groups[3].Value);
            byte a = 255;
            if (rgbaMatch.Groups[4].Success && float.TryParse(rgbaMatch.Groups[4].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out float alpha))
            {
                a = (byte)Math.Clamp((int)(alpha * 255), 0, 255);
            }
            return Color.FromArgb(a, r, g, b);
        }

        // Handle hex #RGB, #RRGGBB, #AARRGGBB
        if (colorStr.StartsWith("#"))
        {
            try
            {
                var converted = (Color)ColorConverter.ConvertFromString(colorStr);
                return converted;
            }
            catch { }
        }

        return null;
    }

    private static void SerializeParagraph(Paragraph p, StringBuilder sb)
    {
        string tag = "p";
        if (p.Tag is string customTag)
        {
            tag = customTag.ToLowerInvariant();
        }
        else if (p.FontSize >= 21)
        {
            tag = "h1";
        }
        else if (p.FontSize >= 17)
        {
            tag = "h2";
        }
        else if (p.FontSize >= 14 && p.FontWeight == FontWeights.Bold)
        {
            tag = "h3";
        }

        string alignStyle = p.TextAlignment switch
        {
            TextAlignment.Center => " style=\"text-align: center\"",
            TextAlignment.Right => " style=\"text-align: right\"",
            TextAlignment.Justify => " style=\"text-align: justify\"",
            _ => string.Empty
        };

        sb.Append($"<{tag}{alignStyle}>");
        SerializeInlines(p.Inlines, sb);
        sb.Append($"</{tag}>\n");
    }

    private static void SerializeList(List list, StringBuilder sb)
    {
        string listTag = list.MarkerStyle == TextMarkerStyle.Decimal ? "ol" : "ul";
        sb.Append($"<{listTag}>\n");

        foreach (var item in list.ListItems)
        {
            sb.Append("  <li>");
            foreach (var b in item.Blocks)
            {
                if (b is Paragraph lp)
                {
                    SerializeInlines(lp.Inlines, sb);
                }
            }
            sb.Append("</li>\n");
        }

        sb.Append($"</{listTag}>\n");
    }

    private static void SerializeSection(Section section, StringBuilder sb)
    {
        sb.Append("<blockquote>\n");
        foreach (var b in section.Blocks)
        {
            if (b is Paragraph p)
            {
                SerializeParagraph(p, sb);
            }
        }
        sb.Append("</blockquote>\n");
    }

    private static void SerializeInlines(InlineCollection inlines, StringBuilder sb)
    {
        foreach (var inline in inlines)
        {
            SerializeInline(inline, sb);
        }
    }

    private static void SerializeInline(Inline inline, StringBuilder sb)
    {
        if (inline is LineBreak)
        {
            sb.Append("<br>");
            return;
        }

        if (inline is Run run)
        {
            string text = EscapeHtmlText(run.Text);
            if (string.IsNullOrEmpty(text)) return;

            var wrapped = new StringBuilder(text);

            if (run.ReadLocalValue(TextElement.FontWeightProperty) is FontWeight fw && (fw == FontWeights.Bold || fw == FontWeights.SemiBold || fw == FontWeights.ExtraBold))
            {
                wrapped.Insert(0, "<strong>").Append("</strong>");
            }

            if (run.ReadLocalValue(TextElement.FontStyleProperty) is FontStyle fs && fs == FontStyles.Italic)
            {
                wrapped.Insert(0, "<em>").Append("</em>");
            }

            if (run.TextDecorations != null)
            {
                if (run.TextDecorations.Contains(TextDecorations.Underline[0]))
                {
                    wrapped.Insert(0, "<u>").Append("</u>");
                }
                if (run.TextDecorations.Contains(TextDecorations.Strikethrough[0]))
                {
                    wrapped.Insert(0, "<s>").Append("</s>");
                }
            }

            var variant = Typography.GetVariants(run);
            if (variant == FontVariants.Subscript)
            {
                wrapped.Insert(0, "<sub>").Append("</sub>");
            }
            else if (variant == FontVariants.Superscript)
            {
                wrapped.Insert(0, "<sup>").Append("</sup>");
            }

            string? fgStyle = null;
            if (run.ReadLocalValue(TextElement.ForegroundProperty) is SolidColorBrush fgBrush && fgBrush.Color != DefaultTextColor)
            {
                fgStyle = $"color: {ColorToHex(fgBrush.Color)}";
            }

            string? bgStyle = null;
            if (run.ReadLocalValue(TextElement.BackgroundProperty) is SolidColorBrush bgBrush && bgBrush.Color != Colors.Transparent)
            {
                bgStyle = $"background-color: {ColorToHex(bgBrush.Color)}";
            }

            if (fgStyle != null || bgStyle != null)
            {
                string styleAttr = (fgStyle != null && bgStyle != null)
                    ? $"{fgStyle}; {bgStyle}"
                    : (fgStyle ?? bgStyle)!;
                wrapped.Insert(0, $"<span style=\"{styleAttr}\">").Append("</span>");
            }

            sb.Append(wrapped);
        }
        else if (inline is Bold bold)
        {
            sb.Append("<strong>");
            SerializeInlines(bold.Inlines, sb);
            sb.Append("</strong>");
        }
        else if (inline is Italic italic)
        {
            sb.Append("<em>");
            SerializeInlines(italic.Inlines, sb);
            sb.Append("</em>");
        }
        else if (inline is Underline underline)
        {
            sb.Append("<u>");
            SerializeInlines(underline.Inlines, sb);
            sb.Append("</u>");
        }
        else if (inline is Span span)
        {
            SerializeInlines(span.Inlines, sb);
        }
    }

    public static string ColorToHex(Color c)
    {
        return $"#{c.R:X2}{c.G:X2}{c.B:X2}".ToLowerInvariant();
    }

    private static string EscapeHtmlText(string? text)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;
        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;");
    }
}
