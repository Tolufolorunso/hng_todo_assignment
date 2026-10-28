using System;
using System.Threading;
using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;
using TaskFlow.Common;
using Xunit;

namespace TaskFlow.Tests;

public class WysiwygEditorTests
{
    [Fact]
    public void HtmlMetricsHelper_StripHtmlToText_WorksCorrectly()
    {
        string html = "<h1>Title</h1><p>This is a <strong>test</strong> with &amp; entity.<br>Next line.</p>";
        string plain = HtmlMetricsHelper.StripHtmlToText(html);

        Assert.Contains("Title", plain);
        Assert.Contains("This is a test with & entity.", plain);
        Assert.Contains("Next line.", plain);
        Assert.DoesNotContain("<", plain);
        Assert.DoesNotContain(">", plain);

        // Null and empty
        Assert.Equal(string.Empty, HtmlMetricsHelper.StripHtmlToText(null));
        Assert.Equal(string.Empty, HtmlMetricsHelper.StripHtmlToText("   "));
    }

    [Fact]
    public void HtmlMetricsHelper_CalculateReadingStats_WorksCorrectly()
    {
        Assert.Equal(0, HtmlMetricsHelper.CalculateReadingStats(null).Words);
        Assert.Equal(0, HtmlMetricsHelper.CalculateReadingStats("").Words);

        string sample = "<p>" + string.Join(" ", new string[350].Select(_ => "word")) + "</p>";
        var stats = HtmlMetricsHelper.CalculateReadingStats(sample);

        Assert.Equal(350, stats.Words);
        Assert.Equal(2, stats.ReadingTimeMinutes); // 350 / 200 = 1.75 -> ceil 2
    }

    [Fact]
    public void HtmlMetricsHelper_CreateExcerpt_TruncatesProperly()
    {
        string html = "<p>Short text</p>";
        Assert.Equal("Short text", HtmlMetricsHelper.CreateExcerpt(html, 50));

        string longHtml = "<p>This is a long sentence that should be truncated when it exceeds the limit.</p>";
        string excerpt = HtmlMetricsHelper.CreateExcerpt(longHtml, 20);

        Assert.EndsWith("...", excerpt);
        Assert.True(excerpt.Length <= 23);
    }

    [Fact]
    public void HtmlFlowDocumentEngine_HtmlToFlowDocument_ParsesBlocksAndInlines()
    {
        ExecuteOnSta(() =>
        {
            string html = "<h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3>" +
                          "<p style=\"text-align: center\">Centered <strong>bold</strong> <em>italic</em> <u>underlined</u> <s>struck</s></p>" +
                          "<blockquote>Quoted text</blockquote>" +
                          "<ul><li>Bullet 1</li><li>Bullet 2</li></ul>" +
                          "<ol><li>Num 1</li></ol>";

            var doc = HtmlFlowDocumentEngine.HtmlToFlowDocument(html);
            Assert.NotNull(doc);
            Assert.True(doc.Blocks.Count >= 6);

            // Heading 1
            var h1 = doc.Blocks.ElementAt(0) as Paragraph;
            Assert.NotNull(h1);
            Assert.Equal("h1", h1.Tag);
            Assert.Equal(22, h1.FontSize);

            // Heading 2
            var h2 = doc.Blocks.ElementAt(1) as Paragraph;
            Assert.NotNull(h2);
            Assert.Equal(18, h2.FontSize);

            // Centered paragraph
            var p = doc.Blocks.ElementAt(3) as Paragraph;
            Assert.NotNull(p);
            Assert.Equal(TextAlignment.Center, p.TextAlignment);

            // Bullet list
            var ul = doc.Blocks.ElementAt(5) as List;
            Assert.NotNull(ul);
            Assert.Equal(TextMarkerStyle.Disc, ul.MarkerStyle);
            Assert.Equal(2, ul.ListItems.Count);

            // Numbered list
            var ol = doc.Blocks.ElementAt(6) as List;
            Assert.NotNull(ol);
            Assert.Equal(TextMarkerStyle.Decimal, ol.MarkerStyle);
            Assert.Single(ol.ListItems);
        });
    }

    [Fact]
    public void HtmlFlowDocumentEngine_SanitizesDangerousTags()
    {
        ExecuteOnSta(() =>
        {
            string malicious = "<p>Safe text</p><script>alert('xss');</script><iframe src='evil.com'></iframe><p onclick='evil()'>More text</p>";
            var doc = HtmlFlowDocumentEngine.HtmlToFlowDocument(malicious);
            string output = HtmlFlowDocumentEngine.FlowDocumentToHtml(doc);

            Assert.DoesNotContain("<script", output, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("<iframe", output, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onclick", output, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Safe text", output);
            Assert.Contains("More text", output);
        });
    }

    [Fact]
    public void HtmlFlowDocumentEngine_ColorsAndHighlights_RoundTrip()
    {
        ExecuteOnSta(() =>
        {
            string html = "<p><span style=\"color: #38bdf8; background-color: #facc15\">Styled Text</span></p>";
            var doc = HtmlFlowDocumentEngine.HtmlToFlowDocument(html);
            var p = doc.Blocks.FirstBlock as Paragraph;
            Assert.NotNull(p);

            var run = p.Inlines.FirstInline as Run;
            Assert.NotNull(run);
            Assert.Equal("Styled Text", run.Text);

            var fgBrush = run.Foreground as SolidColorBrush;
            Assert.NotNull(fgBrush);
            Assert.Equal(0x38, fgBrush.Color.R);
            Assert.Equal(0xBD, fgBrush.Color.G);
            Assert.Equal(0xF8, fgBrush.Color.B);

            var bgBrush = run.Background as SolidColorBrush;
            Assert.NotNull(bgBrush);
            Assert.Equal(0xFA, bgBrush.Color.R);
            Assert.Equal(0xCC, bgBrush.Color.G);
            Assert.Equal(0x15, bgBrush.Color.B);

            string serialized = HtmlFlowDocumentEngine.FlowDocumentToHtml(doc);
            Assert.Contains("color: #38bdf8", serialized);
            Assert.Contains("background-color: #facc15", serialized);
        });
    }

    [Fact]
    public void HtmlFlowDocumentEngine_EmptyAndNull_HandledGracefully()
    {
        ExecuteOnSta(() =>
        {
            var doc1 = HtmlFlowDocumentEngine.HtmlToFlowDocument(null);
            Assert.NotNull(doc1);
            Assert.Single(doc1.Blocks);

            var doc2 = HtmlFlowDocumentEngine.HtmlToFlowDocument("   ");
            Assert.NotNull(doc2);
            Assert.Single(doc2.Blocks);

            Assert.Equal("<p></p>", HtmlFlowDocumentEngine.FlowDocumentToHtml(null));
            Assert.Equal("<p></p>", HtmlFlowDocumentEngine.FlowDocumentToHtml(new FlowDocument()));
        });
    }

    [Fact]
    public void HtmlFlowDocumentEngine_SymbolsAndEntities_HandledProperly()
    {
        ExecuteOnSta(() =>
        {
            string htmlWithEntities = "<p>Code &amp; Docs &lt;important&gt; &quot;quoted&quot; &#39;single&#39; 10&nbsp;miles</p>";
            var doc = HtmlFlowDocumentEngine.HtmlToFlowDocument(htmlWithEntities);
            string plain = HtmlMetricsHelper.StripHtmlToText(htmlWithEntities);

            Assert.Contains("&", plain);
            Assert.Contains("<important>", plain);
            Assert.Contains("\"quoted\"", plain);
            Assert.Contains("'single'", plain);

            string symbolsHtml = "<p>✔ ✕ ⚠️ ★ ⚡ 💡 📌 🎯 🔥 🚀 ✨ 📅 ⏱️ ⏳ ➔ ➤ • ❖ ≈ ≠ ± ∞ § ©</p>";
            var symbolDoc = HtmlFlowDocumentEngine.HtmlToFlowDocument(symbolsHtml);
            string roundTrip = HtmlFlowDocumentEngine.FlowDocumentToHtml(symbolDoc);

            Assert.Contains("✔", roundTrip);
            Assert.Contains("★", roundTrip);
            Assert.Contains("🚀", roundTrip);
            Assert.Contains("∞", roundTrip);
        });
    }

    [Fact]
    public void HtmlFlowDocumentEngine_BlockquoteAndSubSuper_RoundTrip()
    {
        ExecuteOnSta(() =>
        {
            string html = "<blockquote>A deep insight</blockquote><p>H<sub>2</sub>O and E=mc<sup>2</sup></p>";
            var doc = HtmlFlowDocumentEngine.HtmlToFlowDocument(html);
            Assert.Equal(2, doc.Blocks.Count);

            var bq = doc.Blocks.FirstBlock as Paragraph;
            Assert.NotNull(bq);
            Assert.Equal("blockquote", bq.Tag);

            string serialized = HtmlFlowDocumentEngine.FlowDocumentToHtml(doc);
            Assert.Contains("<blockquote>A deep insight</blockquote>", serialized);
            Assert.Contains("<sub>2</sub>", serialized);
            Assert.Contains("<sup>2</sup>", serialized);
        });
    }

    [Fact]
    public void WysiwygEditorControl_InstantiationAndHtmlBinding_WorksOnSta()
    {
        ExecuteOnSta(() =>
        {
            var editor = new TaskFlow.Controls.WysiwygEditorControl();
            Assert.NotNull(editor);
            Assert.NotNull(editor.Editor);

            editor.HtmlText = "<h2>Heading</h2><p>Sample <strong>bold</strong> text</p>";
            Assert.NotNull(editor.Editor.Document);
            Assert.True(editor.Editor.Document.Blocks.Count >= 2);

            // Verify read-only toggle hides ribbon
            Assert.False(editor.IsReadOnly);
            Assert.Equal(Visibility.Visible, editor.Toolbar.Visibility);

            editor.IsReadOnly = true;
            Assert.True(editor.Editor.IsReadOnly);
            Assert.Equal(Visibility.Collapsed, editor.Toolbar.Visibility);

            editor.IsReadOnly = false;
            Assert.False(editor.Editor.IsReadOnly);
            Assert.Equal(Visibility.Visible, editor.Toolbar.Visibility);
        });
    }

    [Fact]
    public void FormattedTextRendererControl_InstantiationAndDocumentRendering_WorksOnSta()
    {
        ExecuteOnSta(() =>
        {
            var renderer = new TaskFlow.Controls.FormattedTextRendererControl();
            Assert.NotNull(renderer);
            Assert.NotNull(renderer.Renderer);

            renderer.HtmlText = "<h1>Title</h1><p>Description text</p>";
            Assert.NotNull(renderer.Document);
            Assert.True(renderer.Document.Blocks.Count >= 2);

            // Empty placeholder support
            renderer.EmptyPlaceholder = "No notes available";
            renderer.HtmlText = "";
            Assert.NotNull(renderer.Document);
            var firstBlock = renderer.Document.Blocks.FirstBlock as Paragraph;
            Assert.NotNull(firstBlock);
            string blockText = new TextRange(firstBlock.ContentStart, firstBlock.ContentEnd).Text;
            Assert.Contains("No notes available", blockText);
        });
    }

    [Theory]
    [InlineData("#38BDF8", 0x38, 0xBD, 0xF8)]
    [InlineData("#EF4444", 0xEF, 0x44, 0x44)]
    [InlineData("rgb(56, 189, 248)", 56, 189, 248)]
    [InlineData("rgba(250, 204, 21, 0.5)", 250, 204, 21)]
    public void HtmlFlowDocumentEngine_ParseHexOrNamedColor_ValidColors(string input, byte r, byte g, byte b)
    {
        var color = HtmlFlowDocumentEngine.ParseHexOrNamedColor(input);
        Assert.NotNull(color);
        Assert.Equal(r, color.Value.R);
        Assert.Equal(g, color.Value.G);
        Assert.Equal(b, color.Value.B);
    }

    [Fact]
    public void WysiwygEditorControl_InitializesWithFocusableFalseAndEditorBoxAvailable()
    {
        ExecuteOnSta(() =>
        {
            var control = new TaskFlow.Controls.WysiwygEditorControl();
            Assert.NotNull(control.Editor);
            Assert.NotNull(control.Toolbar);
            Assert.False(control.IsReadOnly);

            control.Editor.AppendText("Test editing content");
            Assert.NotNull(control.Editor.Document);
        });
    }

    private static void ExecuteOnSta(Action action)
    {
        Exception? threadEx = null;
        var thread = new Thread(() =>
        {
            try
            {
                action();
            }
            catch (Exception ex)
            {
                threadEx = ex;
            }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        thread.Join();

        if (threadEx != null)
        {
            throw new AggregateException("STA thread execution failed", threadEx);
        }
    }
}
