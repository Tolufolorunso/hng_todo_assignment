using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using TaskFlow.Common;

namespace TaskFlow.Controls;

/// <summary>
/// A lightweight read-only presenter for rendering taskflow-html-v1 formatted text
/// without exposing editing controls or raw markup.
/// </summary>
public partial class FormattedTextRendererControl : UserControl
{
    public static readonly DependencyProperty HtmlTextProperty =
        DependencyProperty.Register(
            nameof(HtmlText),
            typeof(string),
            typeof(FormattedTextRendererControl),
            new PropertyMetadata(string.Empty, OnHtmlTextChangedCallback));

    public static readonly DependencyProperty EmptyPlaceholderProperty =
        DependencyProperty.Register(
            nameof(EmptyPlaceholder),
            typeof(string),
            typeof(FormattedTextRendererControl),
            new PropertyMetadata(string.Empty, OnHtmlTextChangedCallback));

    public string HtmlText
    {
        get => (string)GetValue(HtmlTextProperty);
        set => SetValue(HtmlTextProperty, value);
    }

    public string EmptyPlaceholder
    {
        get => (string)GetValue(EmptyPlaceholderProperty);
        set => SetValue(EmptyPlaceholderProperty, value);
    }

    public RichTextBox Renderer => RendererBox;
    public FlowDocument Document => RendererBox.Document;

    public FormattedTextRendererControl()
    {
        InitializeComponent();
        UpdateDocument();
    }

    private static void OnHtmlTextChangedCallback(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is FormattedTextRendererControl renderer)
        {
            renderer.UpdateDocument();
        }
    }

    private void UpdateDocument()
    {
        string html = HtmlText;
        if (string.IsNullOrWhiteSpace(HtmlMetricsHelper.StripHtmlToText(html)) && !string.IsNullOrWhiteSpace(EmptyPlaceholder))
        {
            var emptyDoc = new FlowDocument
            {
                PagePadding = new Thickness(0),
                Background = Brushes.Transparent
            };
            var p = new Paragraph(new Run(EmptyPlaceholder))
            {
                Foreground = (TryFindResource("TextMuted") as Brush) ?? Brushes.Gray,
                FontStyle = FontStyles.Italic,
                Margin = new Thickness(0)
            };
            emptyDoc.Blocks.Add(p);
            RendererBox.Document = emptyDoc;
        }
        else
        {
            RendererBox.Document = HtmlFlowDocumentEngine.HtmlToFlowDocument(html);
        }
    }
}
