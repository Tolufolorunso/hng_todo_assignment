using System;
using System.IO;
using System.Windows;
using System.Windows.Markup;

namespace TaskFlow.Tests;

public static class WpfTestHelper
{
    private static readonly object _syncLock = new();

    public static void EnsureApplicationResources()
    {
        lock (_syncLock)
        {
            if (Application.Current == null)
            {
                _ = new Application();
            }

            if (Application.Current != null && !Application.Current.Resources.Contains("SecondaryButton"))
            {
                string baseDir = AppContext.BaseDirectory;
                string projectDir = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "TaskFlow"));
                using var themeStream = File.OpenRead(Path.Combine(projectDir, "Themes", "ModernTheme.xaml"));
                using var cardsStream = File.OpenRead(Path.Combine(projectDir, "Themes", "ModernCards.xaml"));
                using var badgesStream = File.OpenRead(Path.Combine(projectDir, "Themes", "ModernBadges.xaml"));

                var themeDict = (ResourceDictionary)XamlReader.Load(themeStream);
                var cardsDict = (ResourceDictionary)XamlReader.Load(cardsStream);
                var badgesDict = (ResourceDictionary)XamlReader.Load(badgesStream);

                Application.Current.Resources.MergedDictionaries.Add(themeDict);
                Application.Current.Resources.MergedDictionaries.Add(cardsDict);
                Application.Current.Resources.MergedDictionaries.Add(badgesDict);
            }
        }
    }
}

