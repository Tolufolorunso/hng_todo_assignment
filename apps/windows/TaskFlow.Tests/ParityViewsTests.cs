using System;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;
using TaskFlow.ViewModels;
using Xunit;

namespace TaskFlow.Tests;

[Collection("WpfTests")]
public class ParityViewsTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly TaskRepository _taskRepository;
    private readonly NoteRepository _noteRepository;
    private readonly FollowUpRepository _followUpRepository;
    private readonly DailyPlanRepository _dailyPlanRepository;
    private readonly InboxRepository _inboxRepository;
    private readonly LauncherService _launcherService;
    private readonly InboxTriageService _inboxTriageService;

    public ParityViewsTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _taskRepository = new TaskRepository(_factory);
        _noteRepository = new NoteRepository(_factory);
        _followUpRepository = new FollowUpRepository(_factory);
        _dailyPlanRepository = new DailyPlanRepository(_factory);
        _inboxRepository = new InboxRepository(_factory);
        _launcherService = new LauncherService();
        _inboxTriageService = new InboxTriageService(_inboxRepository, _taskRepository, _noteRepository, _followUpRepository);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public void FollowUpItemViewModel_CalculatesInitialsAndOverdueCorrectly()
    {
        var item1 = new FollowUpItem
        {
            PersonName = "Clark Kent",
            Commitment = "Daily Planet Interview",
            DueAt = DateTimeOffset.UtcNow.AddDays(-1).ToString("o", CultureInfo.InvariantCulture),
            Status = "open",
            EmailAddress = "clark@dailyplanet.com",
            PreferredAction = "email"
        };
        var vm1 = new FollowUpItemViewModel(item1);

        Assert.Equal("CK", vm1.Initials);
        Assert.True(vm1.IsOverdue);
        Assert.False(vm1.IsCompleted);
        Assert.True(vm1.HasEmail);
        Assert.True(vm1.IsPreferredEmail);
        Assert.False(vm1.HasPhone);

        var item2 = new FollowUpItem
        {
            PersonName = "Diana",
            Commitment = "Council meeting",
            DueAt = DateTimeOffset.UtcNow.AddDays(2).ToString("o", CultureInfo.InvariantCulture),
            Status = "completed"
        };
        var vm2 = new FollowUpItemViewModel(item2);

        Assert.Equal("DI", vm2.Initials);
        Assert.False(vm2.IsOverdue);
        Assert.True(vm2.IsCompleted);
    }

    [Fact]
    public void FollowUpItemViewModel_FormatsRecurrenceLabel()
    {
        var item = new FollowUpItem
        {
            PersonName = "Barry Allen",
            Commitment = "Lab check",
            Recurrence = new RecurrenceRule
            {
                Frequency = "weekly",
                Interval = 2,
                Mode = "calendarAnchored"
            }
        };
        var vm = new FollowUpItemViewModel(item);

        Assert.True(vm.HasRecurrence);
        Assert.NotNull(vm.RecurrenceLabel);
        Assert.Contains("Every 2 weeks", vm.RecurrenceLabel);
        Assert.Contains("Calendar-anchored", vm.RecurrenceLabel);
    }

    [Fact]
    public async Task FollowUpsViewModel_ManagesOccurrencesAndFiltering()
    {
        var vm = new FollowUpsViewModel(_followUpRepository, _launcherService);
        await vm.LoadAsync();

        vm.PersonName = "Bruce Wayne";
        vm.Commitment = "Security review";
        vm.DueAt = DateTimeOffset.UtcNow.AddDays(-2).ToString("o", CultureInfo.InvariantCulture);
        await vm.CreateAsync();

        Assert.Single(vm.FollowUps);
        Assert.Equal(1, vm.OpenCount);
        Assert.Equal(1, vm.OverdueCount);

        // Test Snooze
        await vm.SnoozeAsync(vm.FollowUps[0]);
        Assert.True(DateTimeOffset.Parse(vm.FollowUps[0].DueAt) > DateTimeOffset.UtcNow);

        // Test Reschedule
        vm.RescheduleDueAt = DateTimeOffset.UtcNow.AddDays(5).ToString("o", CultureInfo.InvariantCulture);
        await vm.RescheduleAsync(vm.FollowUps[0]);
        Assert.Contains(DateTimeOffset.UtcNow.AddDays(5).ToString("yyyy-MM"), vm.FollowUps[0].DueAt);

        // Test Complete Occurrence
        await vm.CompleteOccurrenceAsync(vm.FollowUps[0]);
        Assert.True(vm.FollowUps[0].IsCompleted);
        Assert.Equal(0, vm.OpenCount);

        // Verify Occurrence History
        await vm.LoadOccurrencesAsync(vm.FollowUps[0].Id);
        Assert.NotEmpty(vm.OccurrenceHistory);
        Assert.Equal("completed", vm.OccurrenceHistory[0].Outcome);
    }

    [Fact]
    public void PlanMyDayViewModel_CapacityBudgetingAndThresholds()
    {
        var vm = new PlanMyDayViewModel(_dailyPlanRepository, _taskRepository, _followUpRepository);
        vm.AvailableMinutes = 120;

        vm.RecommendedItems.Add(new PlanItemReference { Title = "Task 1", EstimatedMinutes = 60, Type = "task" });
        vm.RecommendedItems.Add(new PlanItemReference { Title = "Task 2", EstimatedMinutes = 30, Type = "task" });

        // Trigger recalculation
        vm.AvailableMinutes = 120;

        Assert.Equal(90, vm.TotalEstimatedMinutes);
        Assert.Equal(30, vm.RemainingMinutes);
        Assert.Equal(75, vm.CapacityPercent);
        Assert.False(vm.IsOverCapacity);
        Assert.False(vm.IsFullyPlanned);
        Assert.Equal("#10B981", vm.CapacityProgressColor);

        // Over capacity test
        vm.RecommendedItems.Add(new PlanItemReference { Title = "Task 3", EstimatedMinutes = 60, Type = "task" });
        vm.AvailableMinutes = 120;

        Assert.Equal(150, vm.TotalEstimatedMinutes);
        Assert.True(vm.IsOverCapacity);
        Assert.Equal("#EF4444", vm.CapacityProgressColor);
        Assert.Contains("over capacity", vm.CapacityStatusMessage);

        // Preset command test with string param
        vm.SetPresetCapacityCommand.Execute("240");
        Assert.Equal(240, vm.AvailableMinutes);
    }

    [Fact]
    public void PlanMyDayViewModel_MoveToAndFromOverflow()
    {
        var vm = new PlanMyDayViewModel(_dailyPlanRepository, _taskRepository, _followUpRepository);
        var item = new PlanItemReference { Title = "Task A", EstimatedMinutes = 45 };

        vm.RecommendedItems.Add(item);
        Assert.Single(vm.RecommendedItems);
        Assert.Empty(vm.OverflowItems);

        // Move to overflow
        vm.MoveToOverflowCommand.Execute(item);
        Assert.Empty(vm.RecommendedItems);
        Assert.Single(vm.OverflowItems);

        // Move back to recommended
        vm.MoveToRecommendedCommand.Execute(item);
        Assert.Single(vm.RecommendedItems);
        Assert.Empty(vm.OverflowItems);
    }

    [Fact]
    public async Task CalendarViewModel_GeneratesMonthAndAggregatesItems()
    {
        // Seed task due today
        var todayIso = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        await _taskRepository.CreateAsync(new TaskItem
        {
            Title = "Scheduled Calendar Task",
            DueDate = todayIso,
            Priority = "high"
        });

        var vm = new CalendarViewModel(_taskRepository, _followUpRepository);
        await vm.RefreshCalendarAsync();

        Assert.Equal(42, vm.Days.Count);
        Assert.NotNull(vm.SelectedDate);

        var todayCell = vm.Days.FirstOrDefault(d => d.IsToday);
        Assert.NotNull(todayCell);
        Assert.True(todayCell.HasTasks);
        Assert.True(todayCell.TaskCount >= 1);
        Assert.NotEmpty(vm.SelectedDayItems);

        // Test interactive completion toggle from calendar
        var taskItem = vm.SelectedDayItems.First(i => i.Type == "task");
        Assert.False(taskItem.IsCompleted);

        vm.ToggleItemCompletedCommand.Execute(taskItem);
        // Wait briefly for async repository toggle
        await Task.Delay(50);

        var updatedTask = await _taskRepository.GetByIdAsync(taskItem.Id);
        Assert.NotNull(updatedTask);
        Assert.True(updatedTask.Completed);
    }

    [Fact]
    public async Task AnalyticsViewModel_ComputesKPIsAndPercentages()
    {
        await _taskRepository.CreateAsync(new TaskItem { Title = "T1", Priority = "high", Category = "work", Completed = true });
        await _taskRepository.CreateAsync(new TaskItem { Title = "T2", Priority = "medium", Category = "work", Completed = false });
        await _taskRepository.CreateAsync(new TaskItem { Title = "T3", Priority = "low", Category = "personal", Completed = false });

        var vm = new AnalyticsViewModel(_taskRepository, _noteRepository, _followUpRepository, _inboxRepository);
        await vm.RefreshMetricsAsync();

        Assert.Equal(3, vm.TotalTasks);
        Assert.Equal(1, vm.CompletedTasks);
        Assert.Equal(2, vm.OpenTasks);
        Assert.Equal("33%", vm.CompletionRate);

        Assert.Equal(1, vm.HighPriorityTasks);
        Assert.Equal(1, vm.MediumPriorityTasks);
        Assert.Equal(1, vm.LowPriorityTasks);
        Assert.Equal(2, vm.WorkCategoryTasks);
        Assert.Equal(1, vm.PersonalCategoryTasks);

        Assert.True(vm.HighPriorityPercent > 30);
        Assert.True(vm.WorkCategoryPercent > 60);
        Assert.Equal("Steady", vm.ProductivityRating);
    }

    [Fact]
    public async Task InboxViewModel_AutoExtractsUrlAndTriages()
    {
        var vm = new InboxViewModel(_inboxRepository, _inboxTriageService, _launcherService);
        await vm.LoadAsync();

        // Capture with embedded URL
        vm.FastCaptureText = "Read this article: https://example.com/article about agentic workflows";
        await vm.CaptureAsync();

        Assert.Single(vm.Captures);
        Assert.Equal(1, vm.PendingCount);
        Assert.Equal("https://example.com/article", vm.Captures[0].SharedUrl);
        Assert.True(vm.Captures[0].HasUrl);

        // Triage to task
        await vm.TriageToTaskAsync(vm.Captures[0]);
        Assert.Equal("processed", vm.Captures[0].State);
        Assert.Equal("task", vm.Captures[0].ResultEntityType);
        Assert.Equal(0, vm.PendingCount);

        var tasks = await _taskRepository.ListAsync();
        Assert.Contains(tasks, t => t.Title.Contains("Read this article"));
    }

    [Fact]
    public void MainViewModel_TabNavigation_ActivatesAllTabsExclusively()
    {
        var tasksVm = new TasksViewModel(_taskRepository);
        var notesVm = new NotesViewModel(_noteRepository);
        var backupVm = new BackupViewModel(new BackupService(_factory, _taskRepository, _noteRepository));
        var followUpsVm = new FollowUpsViewModel(_followUpRepository, _launcherService);
        var planMyDayVm = new PlanMyDayViewModel(_dailyPlanRepository, _taskRepository, _followUpRepository);
        var inboxVm = new InboxViewModel(_inboxRepository, _inboxTriageService, _launcherService);
        var calendarVm = new CalendarViewModel(_taskRepository, _followUpRepository);
        var analyticsVm = new AnalyticsViewModel(_taskRepository, _noteRepository, _followUpRepository, _inboxRepository);

        var mainVm = new MainViewModel(
            tasksVm, notesVm, backupVm,
            followUpsVm, planMyDayVm, inboxVm, calendarVm, analyticsVm);

        // Default: Tasks is active
        Assert.True(mainVm.IsTasksTabActive);
        Assert.False(mainVm.IsFollowUpsTabActive);
        Assert.False(mainVm.IsPlanMyDayTabActive);
        Assert.False(mainVm.IsNotesTabActive);
        Assert.False(mainVm.IsInboxTabActive);
        Assert.False(mainVm.IsCalendarTabActive);
        Assert.False(mainVm.IsAnalyticsTabActive);

        // Follow Ups
        mainVm.NavigateToFollowUpsCommand.Execute(null);
        Assert.False(mainVm.IsTasksTabActive);
        Assert.True(mainVm.IsFollowUpsTabActive);
        Assert.False(mainVm.IsAnalyticsTabActive);

        // Plan My Day
        mainVm.NavigateToPlanMyDayCommand.Execute(null);
        Assert.False(mainVm.IsFollowUpsTabActive);
        Assert.True(mainVm.IsPlanMyDayTabActive);
        Assert.False(mainVm.IsAnalyticsTabActive);

        // Notes
        mainVm.NavigateToNotesCommand.Execute(null);
        Assert.False(mainVm.IsPlanMyDayTabActive);
        Assert.True(mainVm.IsNotesTabActive);
        Assert.False(mainVm.IsAnalyticsTabActive);

        // Inbox
        mainVm.NavigateToInboxCommand.Execute(null);
        Assert.False(mainVm.IsNotesTabActive);
        Assert.True(mainVm.IsInboxTabActive);
        Assert.False(mainVm.IsAnalyticsTabActive);

        // Calendar
        mainVm.NavigateToCalendarCommand.Execute(null);
        Assert.False(mainVm.IsInboxTabActive);
        Assert.True(mainVm.IsCalendarTabActive);
        Assert.False(mainVm.IsAnalyticsTabActive);

        // Analytics
        mainVm.NavigateToAnalyticsCommand.Execute(null);
        Assert.False(mainVm.IsCalendarTabActive);
        Assert.True(mainVm.IsAnalyticsTabActive);
        Assert.False(mainVm.IsTasksTabActive);

        // Back to Tasks
        mainVm.NavigateToTasksCommand.Execute(null);
        Assert.True(mainVm.IsTasksTabActive);
        Assert.False(mainVm.IsAnalyticsTabActive);
    }
}
