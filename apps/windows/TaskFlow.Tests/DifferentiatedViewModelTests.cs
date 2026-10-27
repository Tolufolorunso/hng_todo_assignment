using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;
using TaskFlow.ViewModels;
using Xunit;

namespace TaskFlow.Tests;

public class DifferentiatedViewModelTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;

    private readonly TaskRepository _taskRepo;
    private readonly NoteRepository _noteRepo;
    private readonly FollowUpRepository _followUpRepo;
    private readonly DailyPlanRepository _planRepo;
    private readonly InboxRepository _inboxRepo;
    private readonly LauncherService _launcherService;
    private readonly List<string> _launchedUris = new();

    public DifferentiatedViewModelTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _taskRepo = new TaskRepository(_factory);
        _noteRepo = new NoteRepository(_factory);
        _followUpRepo = new FollowUpRepository(_factory);
        _planRepo = new DailyPlanRepository(_factory);
        _inboxRepo = new InboxRepository(_factory);
        _launcherService = new LauncherService(uri => _launchedUris.Add(uri));
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task FollowUpsViewModel_CreateAndFilter_WorksAsExpected()
    {
        var vm = new FollowUpsViewModel(_followUpRepo, _launcherService);
        await vm.LoadAsync();

        vm.PersonName = "Bruce Wayne";
        vm.Commitment = "Review security patrol logs";
        vm.PreferredAction = "email";
        vm.EmailAddress = "bruce@wayne.corp";
        await vm.CreateAsync();

        Assert.Single(vm.FollowUps);
        Assert.Single(vm.FilteredFollowUps);
        Assert.Equal(1, vm.OpenCount);

        // Test filter by search
        vm.SearchText = "patrol";
        Assert.Single(vm.FilteredFollowUps);
        vm.SearchText = "nonexistent";
        Assert.Empty(vm.FilteredFollowUps);
        vm.SearchText = string.Empty;

        // Test launcher
        vm.SelectedFollowUp = vm.FollowUps[0];
        vm.ExecutePreferredAction();
        Assert.Single(_launchedUris);
        Assert.StartsWith("mailto:bruce@wayne.corp", _launchedUris[0]);

        // Complete occurrence
        await vm.CompleteOccurrenceAsync();
        Assert.Equal("completed", vm.SelectedFollowUp.Status);
        Assert.Equal(0, vm.OpenCount);
    }

    [Fact]
    public async Task PlanMyDayViewModel_GeneratesAndAcceptsPlan()
    {
        await _taskRepo.CreateAsync(new TaskItem
        {
            Title = "Task A",
            EstimatedMinutes = 60,
            Priority = "high"
        });
        await _taskRepo.CreateAsync(new TaskItem
        {
            Title = "Task B",
            EstimatedMinutes = 120,
            Priority = "medium"
        });

        var vm = new PlanMyDayViewModel(_planRepo, _taskRepo, _followUpRepo);
        vm.AvailableMinutes = 120;
        await vm.GeneratePlanAsync();

        Assert.Single(vm.RecommendedItems);
        Assert.Equal("Task A", vm.RecommendedItems[0].Title);
        Assert.Single(vm.OverflowItems);
        Assert.Equal("Task B", vm.OverflowItems[0].Title);

        // Move item to recommended
        vm.MoveToRecommended(vm.OverflowItems[0]);
        Assert.Equal(2, vm.RecommendedItems.Count);
        Assert.Empty(vm.OverflowItems);
        Assert.Equal(180, vm.TotalEstimatedMinutes);

        // Accept plan
        await vm.AcceptPlanAsync();
        Assert.True(vm.IsPlanAccepted);
        Assert.NotNull(vm.AcceptedAt);
    }

    [Fact]
    public async Task InboxViewModel_CapturesAndTriages()
    {
        var triageService = new InboxTriageService(_inboxRepo, _taskRepo, _noteRepo, _followUpRepo);
        var vm = new InboxViewModel(_inboxRepo, triageService);
        await vm.LoadAsync();

        vm.FastCaptureText = "Need to test https://github.com/microsoft/winui-gallery on Windows 11";
        await vm.CaptureAsync();

        Assert.Single(vm.Captures);
        Assert.Equal(1, vm.PendingCount);
        Assert.Equal("https://github.com/microsoft/winui-gallery", vm.Captures[0].SharedUrl);

        // Triage to task
        await vm.TriageToTaskAsync(vm.Captures[0]);
        Assert.Equal("processed", vm.Captures[0].State);
        Assert.Equal(0, vm.PendingCount);

        var tasks = await _taskRepo.ListAsync();
        Assert.Single(tasks);
        Assert.Contains("winui-gallery", tasks[0].Description);
    }

    [Fact]
    public async Task CalendarViewModel_BuildsMonthlyGrid()
    {
        var targetDay = DateTime.UtcNow.ToString("yyyy-MM-dd");
        await _taskRepo.CreateAsync(new TaskItem
        {
            Title = "Calendar task",
            DueDate = $"{targetDay}T10:00:00Z"
        });

        var vm = new CalendarViewModel(_taskRepo, _followUpRepo);
        await vm.RefreshCalendarAsync();

        Assert.Equal(42, vm.Days.Count);
        var todayCell = vm.Days[0];
        foreach (var d in vm.Days)
        {
            if (d.IsToday)
            {
                todayCell = d;
                break;
            }
        }

        Assert.True(todayCell.IsToday);
        Assert.Single(todayCell.Items);
        Assert.Equal("Calendar task", todayCell.Items[0].Title);
    }

    [Fact]
    public async Task AnalyticsViewModel_ComputesAccurateMetrics()
    {
        await _taskRepo.CreateAsync(new TaskItem { Title = "Task 1", Priority = "high", Category = "work", Completed = true });
        await _taskRepo.CreateAsync(new TaskItem { Title = "Task 2", Priority = "medium", Category = "personal", Completed = false });
        await _noteRepo.CreateAsync(new NoteItem { Title = "Note 1", Body = "Body 1" });
        await _followUpRepo.CreateAsync(new FollowUpItem { PersonName = "Person 1", Commitment = "Commitment 1", DueAt = "2026-11-01T10:00:00Z" });
        await _inboxRepo.CreateAsync("Quick capture 1");

        var vm = new AnalyticsViewModel(_taskRepo, _noteRepo, _followUpRepo, _inboxRepo);
        await vm.RefreshMetricsAsync();

        Assert.Equal(2, vm.TotalTasks);
        Assert.Equal(1, vm.CompletedTasks);
        Assert.Equal(1, vm.OpenTasks);
        Assert.Equal("50%", vm.CompletionRate);
        Assert.Equal(1, vm.HighPriorityTasks);
        Assert.Equal(1, vm.MediumPriorityTasks);
        Assert.Equal(1, vm.WorkCategoryTasks);
        Assert.Equal(1, vm.PersonalCategoryTasks);
        Assert.Equal(1, vm.TotalNotes);
        Assert.Equal(1, vm.TotalFollowUps);
        Assert.Equal(1, vm.TotalCaptures);
        Assert.Equal(1, vm.PendingCaptures);
    }

    [Fact]
    public void ThemeViewModel_SwitchesThemes()
    {
        var vm = new ThemeViewModel();
        Assert.Equal("Dark", vm.CurrentTheme);
        Assert.True(vm.IsDark);

        string? notifiedTheme = null;
        vm.ThemeChanged += t => notifiedTheme = t;

        vm.SetThemeCommand.Execute("Light");
        Assert.Equal("Light", vm.CurrentTheme);
        Assert.True(vm.IsLight);
        Assert.Equal("Light", notifiedTheme);

        vm.ToggleThemeCommand.Execute(null);
        Assert.Equal("HighContrast", vm.CurrentTheme);
        Assert.True(vm.IsHighContrast);
    }

    [Fact]
    public void MainViewModel_NavigatesAll8Destinations()
    {
        var backupService = new BackupService(_factory, _taskRepo, _noteRepo);
        var tasksVm = new TasksViewModel(_taskRepo);
        var notesVm = new NotesViewModel(_noteRepo);
        var backupVm = new BackupViewModel(backupService);
        var followUpsVm = new FollowUpsViewModel(_followUpRepo, _launcherService);
        var planMyDayVm = new PlanMyDayViewModel(_planRepo, _taskRepo, _followUpRepo);
        var triageService = new InboxTriageService(_inboxRepo, _taskRepo, _noteRepo, _followUpRepo);
        var inboxVm = new InboxViewModel(_inboxRepo, triageService);
        var calendarVm = new CalendarViewModel(_taskRepo, _followUpRepo);
        var analyticsVm = new AnalyticsViewModel(_taskRepo, _noteRepo, _followUpRepo, _inboxRepo);
        var themeVm = new ThemeViewModel();

        var mainVm = new MainViewModel(
            tasksVm, notesVm, backupVm,
            followUpsVm, planMyDayVm, inboxVm, calendarVm, analyticsVm, themeVm);

        Assert.True(mainVm.IsTasksTabActive);

        mainVm.NavigateToFollowUpsCommand.Execute(null);
        Assert.True(mainVm.IsFollowUpsTabActive);

        mainVm.NavigateToPlanMyDayCommand.Execute(null);
        Assert.True(mainVm.IsPlanMyDayTabActive);

        mainVm.NavigateToNotesCommand.Execute(null);
        Assert.True(mainVm.IsNotesTabActive);

        mainVm.NavigateToInboxCommand.Execute(null);
        Assert.True(mainVm.IsInboxTabActive);

        mainVm.NavigateToCalendarCommand.Execute(null);
        Assert.True(mainVm.IsCalendarTabActive);

        mainVm.NavigateToAnalyticsCommand.Execute(null);
        Assert.True(mainVm.IsAnalyticsTabActive);

        mainVm.NavigateToBackupCommand.Execute(null);
        Assert.True(mainVm.IsBackupTabActive);
    }
}
