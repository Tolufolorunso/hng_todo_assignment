using System;
using System.Windows.Input;
using TaskFlow.Common;

namespace TaskFlow.ViewModels;

public class ThemeViewModel : ObservableObject
{
    private string _currentTheme = "Dark";

    public event Action<string>? ThemeChanged;

    public string CurrentTheme
    {
        get => _currentTheme;
        set
        {
            if (SetProperty(ref _currentTheme, value))
            {
                OnPropertyChanged(nameof(IsDark));
                OnPropertyChanged(nameof(IsLight));
                OnPropertyChanged(nameof(IsHighContrast));
                ThemeChanged?.Invoke(value);
            }
        }
    }

    public bool IsDark => string.Equals(CurrentTheme, "Dark", StringComparison.OrdinalIgnoreCase);
    public bool IsLight => string.Equals(CurrentTheme, "Light", StringComparison.OrdinalIgnoreCase);
    public bool IsHighContrast => string.Equals(CurrentTheme, "HighContrast", StringComparison.OrdinalIgnoreCase);

    public ICommand SetThemeCommand { get; }
    public ICommand ToggleThemeCommand { get; }

    public ThemeViewModel()
    {
        SetThemeCommand = new RelayCommand<string>(theme =>
        {
            if (!string.IsNullOrWhiteSpace(theme))
            {
                CurrentTheme = theme;
            }
        });

        ToggleThemeCommand = new RelayCommand(() =>
        {
            if (IsDark)
            {
                CurrentTheme = "Light";
            }
            else if (IsLight)
            {
                CurrentTheme = "HighContrast";
            }
            else
            {
                CurrentTheme = "Dark";
            }
        });
    }
}
