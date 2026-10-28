using System;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.ViewModels;
using Xunit;

namespace TaskFlow.Tests;

public class CalendarViewModelTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly TaskRepository _taskRepo;
    private readonly FollowUpRepository _followUpRepo;

    public CalendarViewModelTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _taskRepo = new TaskRepository(_factory);
        _followUpRepo = new FollowUpRepository(_factory);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public void CalendarDayItem_ComputesDualBadgesCorrectly()
    {
        var item = new CalendarDayItem
        {
            Date = DateTime.UtcNow.Date,
            IsToday = true,
            IsCurrentMonth = true
        };

        Assert.Equal(0, item.ItemCount);
        Assert.Equal(0, item.TaskCount);
        Assert.Equal(0, item.FollowUpCount);
        Assert.False(item.HasTasks);
        Assert.False(item.HasFollowUps);

        // Add task item
        item.Items.Add(new PlanItemReference
        {
            Type = "task",
            Id = "task-1",
            Title = "Implement unit tests"
        });

        Assert.Equal(1, item.ItemCount);
        Assert.Equal(1, item.TaskCount);
        Assert.Equal(0, item.FollowUpCount);
        Assert.True(item.HasTasks);
        Assert.False(item.HasFollowUps);

        // Add follow-up item
        item.Items.Add(new PlanItemReference
        {
            Type = "followup",
            Id = "fu-1",
            Title = "Call client"
        });

        Assert.Equal(2, item.ItemCount);
        Assert.Equal(1, item.TaskCount);
        Assert.Equal(1, item.FollowUpCount);
        Assert.True(item.HasTasks);
        Assert.True(item.HasFollowUps);
    }

    [Fact]
    public async Task CalendarViewModel_PopulatesTodayAndSeparatesTaskAndFollowUpCounts()
    {
        var todayKey = DateTime.UtcNow.ToString("yyyy-MM-dd");

        await _taskRepo.CreateAsync(new TaskItem
        {
            Title = "Task A",
            DueDate = $"{todayKey}T09:00:00Z"
        });
        await _taskRepo.CreateAsync(new TaskItem
        {
            Title = "Task B",
            DueDate = $"{todayKey}T14:00:00Z"
        });
        await _followUpRepo.CreateAsync(new FollowUpItem
        {
            PersonName = "Sarah Connor",
            Commitment = "Send safety briefing",
            DueAt = $"{todayKey}T11:00:00Z"
        });

        var vm = new CalendarViewModel(_taskRepo, _followUpRepo);
        await vm.RefreshCalendarAsync();

        Assert.Equal(42, vm.Days.Count);

        CalendarDayItem? todayCell = null;
        foreach (var day in vm.Days)
        {
            if (day.IsToday)
            {
                todayCell = day;
                break;
            }
        }

        Assert.NotNull(todayCell);
        Assert.True(todayCell.IsToday);
        Assert.Equal(3, todayCell.ItemCount);
        Assert.Equal(2, todayCell.TaskCount);
        Assert.Equal(1, todayCell.FollowUpCount);
        Assert.True(todayCell.HasTasks);
        Assert.True(todayCell.HasFollowUps);
    }

    [Fact]
    public async Task CalendarViewModel_MondayFirstOffset_StartsOnMonday()
    {
        var vm = new CalendarViewModel(_taskRepo, _followUpRepo);

        // October 2026: Oct 1 is Thursday, so Monday-first offset starts on Monday Sep 28
        vm.CurrentMonth = new DateTime(2026, 10, 1);
        await vm.RefreshCalendarAsync();

        Assert.Equal(42, vm.Days.Count);
        Assert.Equal(DayOfWeek.Monday, vm.Days[0].Date.DayOfWeek);
        Assert.Equal(new DateTime(2026, 9, 28), vm.Days[0].Date);

        // Days[3] should be Thursday Oct 1
        Assert.Equal(DayOfWeek.Thursday, vm.Days[3].Date.DayOfWeek);
        Assert.Equal(new DateTime(2026, 10, 1), vm.Days[3].Date);

        // Days[6] should be Sunday Oct 4
        Assert.Equal(DayOfWeek.Sunday, vm.Days[6].Date.DayOfWeek);
        Assert.Equal(new DateTime(2026, 10, 4), vm.Days[6].Date);

        // Inline task addition for selected date
        vm.SelectedDate = new DateTime(2026, 10, 28);
        vm.NewTaskTitle = "Review Parity Screen";
        await vm.AddTaskForSelectedDateAsync();

        Assert.Empty(vm.NewTaskTitle);
        var oct28 = vm.Days.FirstOrDefault(d => d.Date == new DateTime(2026, 10, 28));
        Assert.NotNull(oct28);
        Assert.True(oct28.TaskCount >= 1);
        Assert.Equal("Review Parity Screen", oct28.FirstItem?.Title);

        // Unscheduled tasks
        await _taskRepo.CreateAsync(new TaskItem { Title = "Backlog idea", DueDate = null });
        await vm.RefreshCalendarAsync();
        Assert.True(vm.UnscheduledCount >= 1);

        // Toggle unscheduled
        Assert.False(vm.IsUnscheduledOpen);
        vm.ToggleUnscheduledCommand.Execute(null);
        Assert.True(vm.IsUnscheduledOpen);
    }
}
