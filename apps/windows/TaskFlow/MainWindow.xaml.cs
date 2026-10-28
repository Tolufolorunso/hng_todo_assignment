using System;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using TaskFlow.ViewModels;

namespace TaskFlow;

public partial class MainWindow : Window
{
    private MainViewModel? _viewModel;
    private Services.INetworkRecoveryService? _networkRecoveryService;

    public MainWindow()
    {
        InitializeComponent();
    }

    public MainWindow(MainViewModel viewModel, Services.INetworkRecoveryService? networkRecoveryService = null) : this()
    {
        _viewModel = viewModel;
        _networkRecoveryService = networkRecoveryService;
        DataContext = viewModel;

        viewModel.ThemeVM.ThemeChanged += ApplyTheme;

        Loaded += async (_, _) =>
        {
            ApplyTheme(viewModel.ThemeVM.CurrentTheme);
            await viewModel.InitializeAsync();
        };

        Activated += (_, _) =>
        {
            _ = _networkRecoveryService?.HandleWindowActivatedAsync();
        };
    }

    protected override void OnPreviewKeyDown(KeyEventArgs e)
    {
        base.OnPreviewKeyDown(e);

        if (_viewModel == null) return;

        bool isCtrl = (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control;

        if (isCtrl)
        {
            switch (e.Key)
            {
                case Key.F:
                    SearchInput.Focus();
                    SearchInput.SelectAll();
                    e.Handled = true;
                    break;
                case Key.D1:
                case Key.NumPad1:
                    _viewModel.NavigateToTasksCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.D2:
                case Key.NumPad2:
                    _viewModel.NavigateToFollowUpsCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.D3:
                case Key.NumPad3:
                    _viewModel.NavigateToPlanMyDayCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.D4:
                case Key.NumPad4:
                    _viewModel.NavigateToNotesCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.D5:
                case Key.NumPad5:
                    _viewModel.NavigateToInboxCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.D6:
                case Key.NumPad6:
                    _viewModel.NavigateToCalendarCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.D7:
                case Key.NumPad7:
                    _viewModel.NavigateToAnalyticsCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.D8:
                case Key.NumPad8:
                    _viewModel.NavigateToBackupCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.D9:
                case Key.NumPad9:
                    _viewModel.NavigateToAccountCommand.Execute(null);
                    e.Handled = true;
                    break;
                case Key.N:
                    _viewModel.QuickCreateCommand.Execute(null);
                    e.Handled = true;
                    break;
            }
        }
    }

    private void ApplyTheme(string theme)
    {
        ResourceDictionary target = Application.Current?.Resources ?? Resources;

        if (string.Equals(theme, "Light", StringComparison.OrdinalIgnoreCase))
        {
            SetThemeBrushes(target,
                bgPrimary: Color.FromRgb(0xF8, 0xFA, 0xFC),
                bgSurface: Color.FromRgb(0xFF, 0xFF, 0xFF),
                bgSurfaceElevated: Color.FromRgb(0xF1, 0xF5, 0xF9),
                borderSubtle: Color.FromRgb(0xE2, 0xE8, 0xF0),
                textPrimary: Color.FromRgb(0x0F, 0x17, 0x2A),
                textSecondary: Color.FromRgb(0x47, 0x55, 0x69),
                textMuted: Color.FromRgb(0x94, 0xA3, 0xB8),
                accentBlue: Color.FromRgb(0x25, 0x63, 0xEB),
                accentBlueHover: Color.FromRgb(0x1D, 0x4E, 0xD8),
                accentGreen: Color.FromRgb(0x05, 0x96, 0x69),
                accentAmber: Color.FromRgb(0xD9, 0x77, 0x06),
                accentRose: Color.FromRgb(0xDC, 0x26, 0x26),
                catWork: Color.FromRgb(0x02, 0x84, 0xC7),
                catPersonal: Color.FromRgb(0x93, 0x33, 0xEA),
                catUrgent: Color.FromRgb(0xE1, 0x1D, 0x48),
                catStudy: Color.FromRgb(0x05, 0x96, 0x69),
                catIdeas: Color.FromRgb(0xD9, 0x77, 0x06),
                prioHigh: Color.FromRgb(0xDC, 0x26, 0x26),
                prioMed: Color.FromRgb(0xD9, 0x77, 0x06),
                prioLow: Color.FromRgb(0x64, 0x74, 0x8B));
        }
        else if (string.Equals(theme, "HighContrast", StringComparison.OrdinalIgnoreCase))
        {
            SetThemeBrushes(target,
                bgPrimary: Color.FromRgb(0x00, 0x00, 0x00),
                bgSurface: Color.FromRgb(0x00, 0x00, 0x00),
                bgSurfaceElevated: Color.FromRgb(0x1A, 0x1A, 0x1A),
                borderSubtle: Color.FromRgb(0xFF, 0xFF, 0xFF),
                textPrimary: Color.FromRgb(0xFF, 0xFF, 0xFF),
                textSecondary: Color.FromRgb(0xFF, 0xFF, 0x00),
                textMuted: Color.FromRgb(0x00, 0xFF, 0xFF),
                accentBlue: Color.FromRgb(0x00, 0xFF, 0xFF),
                accentBlueHover: Color.FromRgb(0xFF, 0xFF, 0xFF),
                accentGreen: Color.FromRgb(0x00, 0xFF, 0x00),
                accentAmber: Color.FromRgb(0xFF, 0xFF, 0x00),
                accentRose: Color.FromRgb(0xFF, 0x00, 0x00),
                catWork: Color.FromRgb(0x00, 0xFF, 0xFF),
                catPersonal: Color.FromRgb(0xFF, 0x00, 0xFF),
                catUrgent: Color.FromRgb(0xFF, 0x00, 0x00),
                catStudy: Color.FromRgb(0x00, 0xFF, 0x00),
                catIdeas: Color.FromRgb(0xFF, 0xFF, 0x00),
                prioHigh: Color.FromRgb(0xFF, 0x00, 0x00),
                prioMed: Color.FromRgb(0xFF, 0xFF, 0x00),
                prioLow: Color.FromRgb(0x00, 0xFF, 0xFF));
        }
        else // Dark
        {
            SetThemeBrushes(target,
                bgPrimary: Color.FromRgb(0x0B, 0x0F, 0x19),
                bgSurface: Color.FromRgb(0x15, 0x1C, 0x2C),
                bgSurfaceElevated: Color.FromRgb(0x1E, 0x27, 0x3A),
                borderSubtle: Color.FromRgb(0x23, 0x2E, 0x42),
                textPrimary: Color.FromRgb(0xF8, 0xFA, 0xFC),
                textSecondary: Color.FromRgb(0x94, 0xA3, 0xB8),
                textMuted: Color.FromRgb(0x64, 0x74, 0x8B),
                accentBlue: Color.FromRgb(0x3B, 0x82, 0xF6),
                accentBlueHover: Color.FromRgb(0x25, 0x63, 0xEB),
                accentGreen: Color.FromRgb(0x10, 0xB9, 0x81),
                accentAmber: Color.FromRgb(0xF5, 0x9E, 0x0B),
                accentRose: Color.FromRgb(0xEF, 0x44, 0x44),
                catWork: Color.FromRgb(0x38, 0xBD, 0xF8),
                catPersonal: Color.FromRgb(0xC0, 0x84, 0xFC),
                catUrgent: Color.FromRgb(0xFB, 0x71, 0x85),
                catStudy: Color.FromRgb(0x34, 0xD3, 0x99),
                catIdeas: Color.FromRgb(0xFB, 0xBF, 0x24),
                prioHigh: Color.FromRgb(0xEF, 0x44, 0x44),
                prioMed: Color.FromRgb(0xF5, 0x9E, 0x0B),
                prioLow: Color.FromRgb(0x94, 0xA3, 0xB8));
        }

        Background = (Brush)Resources["BgPrimary"];
        Foreground = (Brush)Resources["TextPrimary"];
    }

    private void SetThemeBrushes(ResourceDictionary dict,
        Color bgPrimary, Color bgSurface, Color bgSurfaceElevated, Color borderSubtle,
        Color textPrimary, Color textSecondary, Color textMuted,
        Color accentBlue, Color accentBlueHover, Color accentGreen, Color accentAmber, Color accentRose,
        Color catWork, Color catPersonal, Color catUrgent, Color catStudy, Color catIdeas,
        Color prioHigh, Color prioMed, Color prioLow)
    {
        SetBrush(dict, "BgPrimary", bgPrimary);
        SetBrush(dict, "BgSurface", bgSurface);
        SetBrush(dict, "BgSurfaceElevated", bgSurfaceElevated);
        SetBrush(dict, "BorderSubtle", borderSubtle);
        SetBrush(dict, "TextPrimary", textPrimary);
        SetBrush(dict, "TextSecondary", textSecondary);
        SetBrush(dict, "TextMuted", textMuted);
        SetBrush(dict, "AccentBlue", accentBlue);
        SetBrush(dict, "AccentBlueHover", accentBlueHover);
        SetBrush(dict, "AccentGreen", accentGreen);
        SetBrush(dict, "AccentAmber", accentAmber);
        SetBrush(dict, "AccentRose", accentRose);

        SetBrush(dict, "CategoryWorkBrush", catWork);
        SetBrush(dict, "CategoryPersonalBrush", catPersonal);
        SetBrush(dict, "CategoryUrgentBrush", catUrgent);
        SetBrush(dict, "CategoryStudyBrush", catStudy);
        SetBrush(dict, "CategoryIdeasBrush", catIdeas);

        SetBrush(dict, "PriorityHighBrush", prioHigh);
        SetBrush(dict, "PriorityMediumBrush", prioMed);
        SetBrush(dict, "PriorityLowBrush", prioLow);
    }

    private void SetBrush(ResourceDictionary dict, string key, Color color)
    {
        var brush = new SolidColorBrush(color);
        brush.Freeze();
        dict[key] = brush;
        Resources[key] = brush;
    }

    private void OnFormatTextClick(object sender, RoutedEventArgs e)
    {
        if (sender is not FrameworkElement element) return;
        string action = element.Tag?.ToString() ?? string.Empty;
        string targetName = (element as System.Windows.Controls.Button)?.CommandParameter?.ToString()
            ?? element.Tag?.ToString()
            ?? string.Empty;

        // Try getting target name from button CommandParameter
        if (sender is System.Windows.Controls.Button btn && btn.CommandParameter is string param)
        {
            targetName = param;
        }

        if (string.IsNullOrEmpty(action) || string.IsNullOrEmpty(targetName)) return;

        if (FindName(targetName) is System.Windows.Controls.TextBox targetTextBox)
        {
            var (newText, newStart, newLength) = Common.TextFormattingHelper.ApplyFormat(
                targetTextBox.Text,
                targetTextBox.SelectionStart,
                targetTextBox.SelectionLength,
                action);

            targetTextBox.Text = newText;
            targetTextBox.Focus();
            targetTextBox.Select(newStart, newLength);
        }
    }
}
