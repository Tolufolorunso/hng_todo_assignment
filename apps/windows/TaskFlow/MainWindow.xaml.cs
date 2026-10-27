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
        if (string.Equals(theme, "Light", StringComparison.OrdinalIgnoreCase))
        {
            Resources["BgPrimary"] = new SolidColorBrush(Color.FromRgb(0xF8, 0xFA, 0xFC));
            Resources["BgSurface"] = new SolidColorBrush(Color.FromRgb(0xFF, 0xFF, 0xFF));
            Resources["BgSurfaceElevated"] = new SolidColorBrush(Color.FromRgb(0xF1, 0xF5, 0xF9));
            Resources["BorderSubtle"] = new SolidColorBrush(Color.FromRgb(0xE2, 0xE8, 0xF0));
            Resources["TextPrimary"] = new SolidColorBrush(Color.FromRgb(0x0F, 0x17, 0x2A));
            Resources["TextSecondary"] = new SolidColorBrush(Color.FromRgb(0x47, 0x55, 0x69));
            Resources["TextMuted"] = new SolidColorBrush(Color.FromRgb(0x94, 0xA3, 0xB8));
            Resources["AccentBlue"] = new SolidColorBrush(Color.FromRgb(0x25, 0x63, 0xEB));
            Resources["AccentBlueHover"] = new SolidColorBrush(Color.FromRgb(0x1D, 0x4E, 0xD8));
            Resources["AccentGreen"] = new SolidColorBrush(Color.FromRgb(0x05, 0x96, 0x69));
            Resources["AccentAmber"] = new SolidColorBrush(Color.FromRgb(0xD9, 0x77, 0x06));
            Resources["AccentRose"] = new SolidColorBrush(Color.FromRgb(0xDC, 0x26, 0x26));
            Background = (Brush)Resources["BgPrimary"];
            Foreground = (Brush)Resources["TextPrimary"];
        }
        else if (string.Equals(theme, "HighContrast", StringComparison.OrdinalIgnoreCase))
        {
            Resources["BgPrimary"] = new SolidColorBrush(Color.FromRgb(0x00, 0x00, 0x00));
            Resources["BgSurface"] = new SolidColorBrush(Color.FromRgb(0x00, 0x00, 0x00));
            Resources["BgSurfaceElevated"] = new SolidColorBrush(Color.FromRgb(0x1A, 0x1A, 0x1A));
            Resources["BorderSubtle"] = new SolidColorBrush(Color.FromRgb(0xFF, 0xFF, 0xFF));
            Resources["TextPrimary"] = new SolidColorBrush(Color.FromRgb(0xFF, 0xFF, 0xFF));
            Resources["TextSecondary"] = new SolidColorBrush(Color.FromRgb(0xFF, 0xFF, 0x00));
            Resources["TextMuted"] = new SolidColorBrush(Color.FromRgb(0x00, 0xFF, 0xFF));
            Resources["AccentBlue"] = new SolidColorBrush(Color.FromRgb(0x00, 0xFF, 0xFF));
            Resources["AccentBlueHover"] = new SolidColorBrush(Color.FromRgb(0xFF, 0xFF, 0xFF));
            Resources["AccentGreen"] = new SolidColorBrush(Color.FromRgb(0x00, 0xFF, 0x00));
            Resources["AccentAmber"] = new SolidColorBrush(Color.FromRgb(0xFF, 0xFF, 0x00));
            Resources["AccentRose"] = new SolidColorBrush(Color.FromRgb(0xFF, 0x00, 0x00));
            Background = (Brush)Resources["BgPrimary"];
            Foreground = (Brush)Resources["TextPrimary"];
        }
        else // Dark
        {
            Resources["BgPrimary"] = new SolidColorBrush(Color.FromRgb(0x0B, 0x0F, 0x19));
            Resources["BgSurface"] = new SolidColorBrush(Color.FromRgb(0x15, 0x1C, 0x2C));
            Resources["BgSurfaceElevated"] = new SolidColorBrush(Color.FromRgb(0x1E, 0x27, 0x3A));
            Resources["BorderSubtle"] = new SolidColorBrush(Color.FromRgb(0x23, 0x2E, 0x42));
            Resources["TextPrimary"] = new SolidColorBrush(Color.FromRgb(0xF8, 0xFA, 0xFC));
            Resources["TextSecondary"] = new SolidColorBrush(Color.FromRgb(0x94, 0xA3, 0xB8));
            Resources["TextMuted"] = new SolidColorBrush(Color.FromRgb(0x64, 0x74, 0x8B));
            Resources["AccentBlue"] = new SolidColorBrush(Color.FromRgb(0x3B, 0x82, 0xF6));
            Resources["AccentBlueHover"] = new SolidColorBrush(Color.FromRgb(0x25, 0x63, 0xEB));
            Resources["AccentGreen"] = new SolidColorBrush(Color.FromRgb(0x10, 0xB9, 0x81));
            Resources["AccentAmber"] = new SolidColorBrush(Color.FromRgb(0xF5, 0x9E, 0x0B));
            Resources["AccentRose"] = new SolidColorBrush(Color.FromRgb(0xEF, 0x44, 0x44));
            Background = (Brush)Resources["BgPrimary"];
            Foreground = (Brush)Resources["TextPrimary"];
        }
    }
}