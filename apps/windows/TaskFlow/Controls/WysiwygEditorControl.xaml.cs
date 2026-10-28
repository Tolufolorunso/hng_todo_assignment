using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using TaskFlow.Common;

namespace TaskFlow.Controls;

public partial class WysiwygEditorControl : UserControl
{
    public static readonly DependencyProperty HtmlTextProperty =
        DependencyProperty.Register(
            nameof(HtmlText),
            typeof(string),
            typeof(WysiwygEditorControl),
            new FrameworkPropertyMetadata(string.Empty, FrameworkPropertyMetadataOptions.BindsTwoWayByDefault, OnHtmlTextChangedCallback));

    public static readonly DependencyProperty PlaceholderProperty =
        DependencyProperty.Register(
            nameof(Placeholder),
            typeof(string),
            typeof(WysiwygEditorControl),
            new PropertyMetadata("Write your note here..."));

    public static readonly DependencyProperty IsReadOnlyProperty =
        DependencyProperty.Register(
            nameof(IsReadOnly),
            typeof(bool),
            typeof(WysiwygEditorControl),
            new PropertyMetadata(false, OnIsReadOnlyChangedCallback));

    public static readonly DependencyProperty MinEditorHeightProperty =
        DependencyProperty.Register(
            nameof(MinEditorHeight),
            typeof(double),
            typeof(WysiwygEditorControl),
            new PropertyMetadata(120.0));

    private bool _isUpdatingInternally;
    private bool _isUpdatingFromExternal;

    public string HtmlText
    {
        get => (string)GetValue(HtmlTextProperty);
        set => SetValue(HtmlTextProperty, value);
    }

    public string Placeholder
    {
        get => (string)GetValue(PlaceholderProperty);
        set => SetValue(PlaceholderProperty, value);
    }

    public bool IsReadOnly
    {
        get => (bool)GetValue(IsReadOnlyProperty);
        set => SetValue(IsReadOnlyProperty, value);
    }

    public double MinEditorHeight
    {
        get => (double)GetValue(MinEditorHeightProperty);
        set => SetValue(MinEditorHeightProperty, value);
    }

    public RichTextBox Editor => EditorBox;
    public Border Toolbar => ToolbarBorder;

    public WysiwygEditorControl()
    {
        InitializeComponent();
        EditorBox.Document = HtmlFlowDocumentEngine.HtmlToFlowDocument(string.Empty);
        UpdateMetricsAndPlaceholder();
    }

    private static void OnHtmlTextChangedCallback(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is WysiwygEditorControl control && !control._isUpdatingInternally)
        {
            control.LoadHtmlIntoEditor(e.NewValue as string);
        }
    }

    private static void OnIsReadOnlyChangedCallback(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is WysiwygEditorControl control)
        {
            bool isReadOnly = (bool)e.NewValue;
            control.EditorBox.IsReadOnly = isReadOnly;
            control.ToolbarBorder.Visibility = isReadOnly ? Visibility.Collapsed : Visibility.Visible;
        }
    }

    private void LoadHtmlIntoEditor(string? html)
    {
        _isUpdatingFromExternal = true;
        try
        {
            EditorBox.Document = HtmlFlowDocumentEngine.HtmlToFlowDocument(html);
            UpdateMetricsAndPlaceholder();
        }
        finally
        {
            _isUpdatingFromExternal = false;
        }
    }

    private void OnEditorTextChanged(object sender, TextChangedEventArgs e)
    {
        if (_isUpdatingFromExternal) return;

        _isUpdatingInternally = true;
        try
        {
            string html = HtmlFlowDocumentEngine.FlowDocumentToHtml(EditorBox.Document);
            HtmlText = html;
            UpdateMetricsAndPlaceholder();
        }
        finally
        {
            _isUpdatingInternally = false;
        }
    }

    private void UpdateMetricsAndPlaceholder()
    {
        string text = HtmlMetricsHelper.StripHtmlToText(HtmlText);
        bool isEmpty = string.IsNullOrWhiteSpace(text);

        if (PlaceholderBlock != null)
        {
            PlaceholderBlock.Visibility = isEmpty ? Visibility.Visible : Visibility.Collapsed;
        }

        var stats = HtmlMetricsHelper.CalculateReadingStats(HtmlText);
        if (WordCountBlock != null)
        {
            WordCountBlock.Text = $"{stats.Words} word{(stats.Words == 1 ? "" : "s")}";
        }
        if (CharCountBlock != null)
        {
            int chars = text.Length;
            CharCountBlock.Text = $"{chars} character{(chars == 1 ? "" : "s")}";
        }
    }

    private void OnBlockFormatChanged(object sender, SelectionChangedEventArgs e)
    {
        if (EditorBox == null || BlockFormatCombo.SelectedItem is not ComboBoxItem item) return;

        string tag = item.Tag?.ToString() ?? "p";
        var selection = EditorBox.Selection;
        if (selection == null) return;

        var startParagraph = selection.Start.Paragraph;
        if (startParagraph == null) return;

        switch (tag)
        {
            case "h1":
                startParagraph.Tag = "h1";
                startParagraph.FontSize = 22;
                startParagraph.FontWeight = FontWeights.Bold;
                startParagraph.Margin = new Thickness(0, 10, 0, 6);
                break;
            case "h2":
                startParagraph.Tag = "h2";
                startParagraph.FontSize = 18;
                startParagraph.FontWeight = FontWeights.Bold;
                startParagraph.Margin = new Thickness(0, 8, 0, 4);
                break;
            case "h3":
                startParagraph.Tag = "h3";
                startParagraph.FontSize = 15;
                startParagraph.FontWeight = FontWeights.SemiBold;
                startParagraph.Margin = new Thickness(0, 6, 0, 4);
                break;
            default:
                startParagraph.Tag = "p";
                startParagraph.FontSize = 13;
                startParagraph.FontWeight = FontWeights.Normal;
                startParagraph.Margin = new Thickness(0, 0, 0, 8);
                break;
        }

        EditorBox.Focus();
    }

    private void OnToggleStrikethroughClick(object sender, RoutedEventArgs e)
    {
        var selection = EditorBox.Selection;
        if (selection == null || selection.IsEmpty) return;

        object existing = selection.GetPropertyValue(Inline.TextDecorationsProperty);
        if (existing is TextDecorationCollection coll && coll.Contains(TextDecorations.Strikethrough[0]))
        {
            selection.ApplyPropertyValue(Inline.TextDecorationsProperty, null);
        }
        else
        {
            selection.ApplyPropertyValue(Inline.TextDecorationsProperty, TextDecorations.Strikethrough);
        }
        EditorBox.Focus();
    }

    private void OnToggleSubscriptClick(object sender, RoutedEventArgs e)
    {
        var selection = EditorBox.Selection;
        if (selection == null || selection.IsEmpty) return;

        object existing = selection.GetPropertyValue(Typography.VariantsProperty);
        if (existing is FontVariants variant && variant == FontVariants.Subscript)
        {
            selection.ApplyPropertyValue(Typography.VariantsProperty, FontVariants.Normal);
        }
        else
        {
            selection.ApplyPropertyValue(Typography.VariantsProperty, FontVariants.Subscript);
        }
        EditorBox.Focus();
    }

    private void OnToggleSuperscriptClick(object sender, RoutedEventArgs e)
    {
        var selection = EditorBox.Selection;
        if (selection == null || selection.IsEmpty) return;

        object existing = selection.GetPropertyValue(Typography.VariantsProperty);
        if (existing is FontVariants variant && variant == FontVariants.Superscript)
        {
            selection.ApplyPropertyValue(Typography.VariantsProperty, FontVariants.Normal);
        }
        else
        {
            selection.ApplyPropertyValue(Typography.VariantsProperty, FontVariants.Superscript);
        }
        EditorBox.Focus();
    }

    private void OnToggleBlockquoteClick(object sender, RoutedEventArgs e)
    {
        var selection = EditorBox.Selection;
        if (selection == null) return;

        var startParagraph = selection.Start.Paragraph;
        if (startParagraph == null) return;

        if (startParagraph.Tag as string == "blockquote")
        {
            startParagraph.Tag = "p";
            startParagraph.Padding = new Thickness(0);
            startParagraph.BorderThickness = new Thickness(0);
            startParagraph.FontStyle = FontStyles.Normal;
            startParagraph.Foreground = (TryFindResource("TextPrimary") as Brush) ?? Brushes.White;
        }
        else
        {
            startParagraph.Tag = "blockquote";
            startParagraph.Padding = new Thickness(10, 2, 0, 2);
            startParagraph.BorderThickness = new Thickness(3, 0, 0, 0);
            startParagraph.BorderBrush = (TryFindResource("AccentBlue") as Brush) ?? Brushes.DodgerBlue;
            startParagraph.FontStyle = FontStyles.Italic;
            startParagraph.Foreground = (TryFindResource("TextSecondary") as Brush) ?? Brushes.LightGray;
        }
        EditorBox.Focus();
    }

    private void OnTextColorButtonClick(object sender, RoutedEventArgs e)
    {
        TextColorPopup.IsOpen = !TextColorPopup.IsOpen;
    }

    private void OnColorSelected(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement el && el.Tag is string colorStr)
        {
            var selection = EditorBox.Selection;
            if (selection != null)
            {
                if (colorStr.Equals("inherit", StringComparison.OrdinalIgnoreCase))
                {
                    selection.ApplyPropertyValue(TextElement.ForegroundProperty, DependencyProperty.UnsetValue);
                    ColorBar.Background = (TryFindResource("AccentBlue") as Brush) ?? Brushes.DodgerBlue;
                }
                else
                {
                    var color = HtmlFlowDocumentEngine.ParseHexOrNamedColor(colorStr);
                    if (color.HasValue)
                    {
                        var brush = new SolidColorBrush(color.Value);
                        brush.Freeze();
                        selection.ApplyPropertyValue(TextElement.ForegroundProperty, brush);
                        ColorBar.Background = brush;
                    }
                }
            }
        }
        TextColorPopup.IsOpen = false;
        EditorBox.Focus();
    }

    private void OnHighlightColorButtonClick(object sender, RoutedEventArgs e)
    {
        HighlightColorPopup.IsOpen = !HighlightColorPopup.IsOpen;
    }

    private void OnHighlightSelected(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement el && el.Tag is string colorStr)
        {
            var selection = EditorBox.Selection;
            if (selection != null)
            {
                if (colorStr.Equals("transparent", StringComparison.OrdinalIgnoreCase))
                {
                    selection.ApplyPropertyValue(TextElement.BackgroundProperty, DependencyProperty.UnsetValue);
                }
                else
                {
                    var color = HtmlFlowDocumentEngine.ParseHexOrNamedColor(colorStr);
                    if (color.HasValue)
                    {
                        var brush = new SolidColorBrush(color.Value);
                        brush.Freeze();
                        selection.ApplyPropertyValue(TextElement.BackgroundProperty, brush);
                    }
                }
            }
        }
        HighlightColorPopup.IsOpen = false;
        EditorBox.Focus();
    }

    private void OnSymbolButtonClick(object sender, RoutedEventArgs e)
    {
        SymbolPopup.IsOpen = !SymbolPopup.IsOpen;
    }

    private void OnSymbolSelected(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement el && el.Tag is string symbol)
        {
            var selection = EditorBox.Selection;
            if (selection != null)
            {
                selection.Text = symbol;
                EditorBox.CaretPosition = selection.End;
            }
        }
        SymbolPopup.IsOpen = false;
        EditorBox.Focus();
    }
}
