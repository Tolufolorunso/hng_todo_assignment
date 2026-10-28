using System;
using System.IO;
using System.Threading;
using System.Windows;
using System.Windows.Markup;
using System.Windows.Media;
using TaskFlow.ViewModels;
using TaskFlow.Views;
using Xunit;

namespace TaskFlow.Tests;

public class ThemesAndViewsTests
{
    [Fact]
    public void ThemeViewModel_DefaultsAndCyclesCorrectly()
    {
        var vm = new ThemeViewModel();

        Assert.Equal("Dark", vm.CurrentTheme);
        Assert.True(vm.IsDark);
        Assert.False(vm.IsLight);
        Assert.False(vm.IsHighContrast);

        string? notifiedTheme = null;
        vm.ThemeChanged += t => notifiedTheme = t;

        // Dark -> Light
        vm.ToggleThemeCommand.Execute(null);
        Assert.Equal("Light", vm.CurrentTheme);
        Assert.True(vm.IsLight);
        Assert.Equal("Light", notifiedTheme);

        // Light -> HighContrast
        vm.ToggleThemeCommand.Execute(null);
        Assert.Equal("HighContrast", vm.CurrentTheme);
        Assert.True(vm.IsHighContrast);
        Assert.Equal("HighContrast", notifiedTheme);

        // HighContrast -> Dark
        vm.ToggleThemeCommand.Execute(null);
        Assert.Equal("Dark", vm.CurrentTheme);
        Assert.True(vm.IsDark);
        Assert.Equal("Dark", notifiedTheme);

        // Explicit set
        vm.SetThemeCommand.Execute("Light");
        Assert.Equal("Light", vm.CurrentTheme);
    }

    [Fact]
    public void ModernTheme_LoadsExpectedResourceKeys()
    {
        // Resolve path to ModernTheme.xaml
        string baseDir = AppContext.BaseDirectory;
        string projectDir = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "TaskFlow"));
        string xamlPath = Path.Combine(projectDir, "Themes", "ModernTheme.xaml");

        Assert.True(File.Exists(xamlPath), $"Expected ModernTheme.xaml at {xamlPath}");

        using var stream = File.OpenRead(xamlPath);
        var dict = (ResourceDictionary)XamlReader.Load(stream);

        Assert.NotNull(dict);
        Assert.True(dict.Contains("BgPrimary"));
        Assert.True(dict.Contains("BgSurface"));
        Assert.True(dict.Contains("BgSurfaceElevated"));
        Assert.True(dict.Contains("BorderSubtle"));
        Assert.True(dict.Contains("TextPrimary"));
        Assert.True(dict.Contains("TextSecondary"));
        Assert.True(dict.Contains("TextMuted"));
        Assert.True(dict.Contains("AccentBlue"));
        Assert.True(dict.Contains("AccentGreen"));
        Assert.True(dict.Contains("AccentAmber"));
        Assert.True(dict.Contains("AccentRose"));

        // Category brushes
        Assert.True(dict.Contains("CategoryWorkBrush"));
        Assert.True(dict.Contains("CategoryPersonalBrush"));
        Assert.True(dict.Contains("CategoryUrgentBrush"));
        Assert.True(dict.Contains("CategoryStudyBrush"));
        Assert.True(dict.Contains("CategoryIdeasBrush"));

        // Priority brushes
        Assert.True(dict.Contains("PriorityHighBrush"));
        Assert.True(dict.Contains("PriorityMediumBrush"));
        Assert.True(dict.Contains("PriorityLowBrush"));

        // Controls
        Assert.True(dict.Contains("ModernButton"));
        Assert.True(dict.Contains("ModernTextBox"));
        Assert.True(dict.Contains("ModernComboBox"));
    }

    [Fact]
    public void ModernCardsAndBadges_LoadExpectedResourceKeys()
    {
        string baseDir = AppContext.BaseDirectory;
        string projectDir = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "TaskFlow"));

        // Cards
        string cardsPath = Path.Combine(projectDir, "Themes", "ModernCards.xaml");
        Assert.True(File.Exists(cardsPath), $"Expected ModernCards.xaml at {cardsPath}");
        using (var stream = File.OpenRead(cardsPath))
        {
            var dict = (ResourceDictionary)XamlReader.Load(stream);
            Assert.NotNull(dict);
            Assert.True(dict.Contains("ModernCard"));
            Assert.True(dict.Contains("ElevatedCard"));
            Assert.True(dict.Contains("MetricCard"));
            Assert.True(dict.Contains("CardTitleText"));
        }

        // Badges
        string badgesPath = Path.Combine(projectDir, "Themes", "ModernBadges.xaml");
        Assert.True(File.Exists(badgesPath), $"Expected ModernBadges.xaml at {badgesPath}");
        using (var stream = File.OpenRead(badgesPath))
        {
            var dict = (ResourceDictionary)XamlReader.Load(stream);
            Assert.NotNull(dict);
            Assert.True(dict.Contains("PillBadge"));
            Assert.True(dict.Contains("CategoryWorkBadge"));
            Assert.True(dict.Contains("CategoryPersonalBadge"));
            Assert.True(dict.Contains("CategoryUrgentBadge"));
            Assert.True(dict.Contains("PriorityHighBadge"));
            Assert.True(dict.Contains("OverdueBadge"));
            Assert.True(dict.Contains("DueDateBadge"));
        }
    }

    private static void EnsureApplicationResources()
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

    [Fact]
    public void CoreProductivityViews_CanBeInstantiated()
    {
        Exception? threadEx = null;
        var thread = new Thread(() =>
        {
            try
            {
                EnsureApplicationResources();

                var tasksView = new TasksView();
                Assert.NotNull(tasksView);

                var followUpsView = new FollowUpsView();
                Assert.NotNull(followUpsView);

                var notesView = new NotesView();
                Assert.NotNull(notesView);
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
            throw new AggregateException("View instantiation failed", threadEx);
        }
    }

    [Fact]
    public void PlanningAndAnalyticsViews_CanBeInstantiated()
    {
        Exception? threadEx = null;
        var thread = new Thread(() =>
        {
            try
            {
                EnsureApplicationResources();

                var planView = new PlanMyDayView();
                Assert.NotNull(planView);

                var inboxView = new InboxView();
                Assert.NotNull(inboxView);

                var calendarView = new CalendarView();
                Assert.NotNull(calendarView);

                var analyticsView = new AnalyticsView();
                Assert.NotNull(analyticsView);
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
            throw new AggregateException("View instantiation failed", threadEx);
        }
    }

    [Fact]
    public void Views_AcceptDataContextAssignment()
    {
        Exception? threadEx = null;
        var thread = new Thread(() =>
        {
            try
            {
                EnsureApplicationResources();

                var tasksView = new TasksView { DataContext = "sample" };
                Assert.Equal("sample", tasksView.DataContext);

                var followUpsView = new FollowUpsView { DataContext = 123 };
                Assert.Equal(123, followUpsView.DataContext);

                var notesView = new NotesView { DataContext = true };
                Assert.Equal(true, notesView.DataContext);

                var planView = new PlanMyDayView { DataContext = "plan" };
                Assert.Equal("plan", planView.DataContext);

                var inboxView = new InboxView { DataContext = "inbox" };
                Assert.Equal("inbox", inboxView.DataContext);

                var calendarView = new CalendarView { DataContext = "calendar" };
                Assert.Equal("calendar", calendarView.DataContext);

                var analyticsView = new AnalyticsView { DataContext = "analytics" };
                Assert.Equal("analytics", analyticsView.DataContext);
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
            throw new AggregateException("View DataContext assignment failed", threadEx);
        }
    }
}

