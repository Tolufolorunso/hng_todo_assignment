using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.ViewModels;

public class CalendarViewModel : ObservableObject
{
    private readonly ITaskRepository _taskRepo;
    private readonly IFollowUpRepository _followUpRepo;

    private DateTime _currentMonth = new(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
    private DateTime? _selectedDate;
    private CalendarDayItem? _selectedDay;
    private string _newTaskTitle = string.Empty;
    private int _unscheduledCount;
    private bool _isUnscheduledOpen;

    public ObservableCollection<CalendarDayItem> Days { get; } = new();
    public ObservableCollection<PlanItemReference> SelectedDayItems { get; } = new();
    public ObservableCollection<TaskItem> UnscheduledTasks { get; } = new();

    public string NewTaskTitle
    {
        get => _newTaskTitle;
        set => SetProperty(ref _newTaskTitle, value);
    }

    public int UnscheduledCount
    {
        get => _unscheduledCount;
        set => SetProperty(ref _unscheduledCount, value);
    }

    public bool IsUnscheduledOpen
    {
        get => _isUnscheduledOpen;
        set => SetProperty(ref _isUnscheduledOpen, value);
    }

    public string SelectedDaySummary => SelectedDayItems.Count == 0
        ? "No tasks scheduled for this day."
        : (SelectedDayItems.Count == 1 ? "1 task scheduled for this day." : $"{SelectedDayItems.Count} tasks scheduled for this day.");

    public DateTime CurrentMonth
    {
        get => _currentMonth;
        set
        {
            if (SetProperty(ref _currentMonth, value))
            {
                OnPropertyChanged(nameof(MonthDisplay));
            }
        }
    }

    public string MonthDisplay => CurrentMonth.ToString("MMMM yyyy", CultureInfo.InvariantCulture);

    public DateTime? SelectedDate
    {
        get => _selectedDate;
        set
        {
            if (SetProperty(ref _selectedDate, value))
            {
                OnPropertyChanged(nameof(SelectedDateDisplay));
                OnPropertyChanged(nameof(HasSelectedDayItems));
            }
        }
    }

    public string SelectedDateDisplay => SelectedDate?.ToString("dddd, MMMM d, yyyy", CultureInfo.InvariantCulture) ?? "Select a date";
    public bool HasSelectedDayItems => SelectedDayItems.Count > 0;

    public CalendarDayItem? SelectedDay
    {
        get => _selectedDay;
        set => SetProperty(ref _selectedDay, value);
    }

    public ICommand PreviousMonthCommand { get; }
    public ICommand NextMonthCommand { get; }
    public ICommand TodayCommand { get; }
    public ICommand SelectDateCommand { get; }
    public ICommand LoadCommand { get; }
    public ICommand ToggleItemCompletedCommand { get; }
    public ICommand AddTaskForSelectedDateCommand { get; }
    public ICommand ToggleUnscheduledCommand { get; }
    public ICommand? NavigateToTasksCommand { get; set; }
    public ICommand? NavigateToPlanMyDayCommand { get; set; }

    public CalendarViewModel(ITaskRepository taskRepo, IFollowUpRepository followUpRepo)
    {
        _taskRepo = taskRepo;
        _followUpRepo = followUpRepo;

        PreviousMonthCommand = new RelayCommand(async () =>
        {
            CurrentMonth = CurrentMonth.AddMonths(-1);
            await RefreshCalendarAsync();
        });

        NextMonthCommand = new RelayCommand(async () =>
        {
            CurrentMonth = CurrentMonth.AddMonths(1);
            await RefreshCalendarAsync();
        });

        TodayCommand = new RelayCommand(async () =>
        {
            CurrentMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            SelectedDate = DateTime.UtcNow.Date;
            await RefreshCalendarAsync();
        });

        SelectDateCommand = new RelayCommand<CalendarDayItem>(day =>
        {
            if (day == null) return;
            foreach (var d in Days)
            {
                d.IsSelected = d.Date.Date == day.Date.Date;
            }
            SelectedDay = day;
            SelectedDate = day.Date;

            SelectedDayItems.Clear();
            foreach (var item in day.Items)
            {
                SelectedDayItems.Add(item);
            }
            OnPropertyChanged(nameof(HasSelectedDayItems));
            OnPropertyChanged(nameof(SelectedDaySummary));
        });

        ToggleItemCompletedCommand = new RelayCommand<PlanItemReference>(async item =>
        {
            if (item == null) return;
            item.IsCompleted = !item.IsCompleted;
            if (string.Equals(item.Type, "task", StringComparison.OrdinalIgnoreCase))
            {
                await _taskRepo.ToggleCompleteAsync(item.Id);
            }
            else if (string.Equals(item.Type, "followup", StringComparison.OrdinalIgnoreCase))
            {
                if (item.IsCompleted)
                {
                    await _followUpRepo.CompleteOccurrenceAsync(item.Id);
                }
            }
            await RefreshCalendarAsync();
        });

        AddTaskForSelectedDateCommand = new RelayCommand(async () => await AddTaskForSelectedDateAsync());
        ToggleUnscheduledCommand = new RelayCommand(() => IsUnscheduledOpen = !IsUnscheduledOpen);
        LoadCommand = new RelayCommand(async () => await RefreshCalendarAsync());
    }

    public async Task AddTaskForSelectedDateAsync()
    {
        if (string.IsNullOrWhiteSpace(NewTaskTitle)) return;
        var targetDate = (SelectedDate ?? DateTime.UtcNow).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var task = new TaskItem
        {
            Title = NewTaskTitle.Trim(),
            DueDate = targetDate,
            Priority = "medium",
            Category = "work"
        };
        await _taskRepo.CreateAsync(task);
        NewTaskTitle = string.Empty;
        await RefreshCalendarAsync();
    }

    public async Task RefreshCalendarAsync()
    {
        var tasks = await _taskRepo.ListAsync();
        var followUps = await _followUpRepo.ListAsync();

        var today = DateTime.UtcNow.Date;
        var firstDayOfMonth = new DateTime(CurrentMonth.Year, CurrentMonth.Month, 1);

        // Monday-first weekday offset (0 = Monday, 6 = Sunday)
        int startOffset = ((int)firstDayOfMonth.DayOfWeek + 6) % 7;
        var startDate = firstDayOfMonth.AddDays(-startOffset);

        Days.Clear();
        int totalCells = 42; // 6 rows of 7 days

        for (int i = 0; i < totalCells; i++)
        {
            var date = startDate.AddDays(i);
            var dayItem = new CalendarDayItem
            {
                Date = date,
                IsCurrentMonth = date.Month == CurrentMonth.Month,
                IsToday = date.Date == today,
                IsSelected = SelectedDate.HasValue && date.Date == SelectedDate.Value.Date
            };

            string dateKey = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            // Add tasks due on this date
            foreach (var task in tasks.Where(t => !string.IsNullOrWhiteSpace(t.DueDate) && t.DueDate.StartsWith(dateKey, StringComparison.OrdinalIgnoreCase)))
            {
                dayItem.Items.Add(new PlanItemReference
                {
                    Type = "task",
                    Id = task.Id,
                    Title = task.Title,
                    IsCompleted = task.Completed,
                    Explanation = $"Task: {task.Priority} priority",
                    EstimatedMinutes = task.EstimatedMinutes ?? 30
                });
            }

            // Add follow-ups due on this date
            foreach (var fu in followUps.Where(f => !string.IsNullOrWhiteSpace(f.DueAt) && f.DueAt.StartsWith(dateKey, StringComparison.OrdinalIgnoreCase)))
            {
                dayItem.Items.Add(new PlanItemReference
                {
                    Type = "followup",
                    Id = fu.Id,
                    Title = $"{fu.PersonName}: {fu.Commitment}",
                    IsCompleted = string.Equals(fu.Status, "completed", StringComparison.OrdinalIgnoreCase),
                    Explanation = $"Follow-up via {fu.PreferredAction ?? "email"}",
                    EstimatedMinutes = 15
                });
            }

            Days.Add(dayItem);
        }

        var unscheduled = tasks.Where(t => !t.Completed && string.IsNullOrWhiteSpace(t.DueDate)).ToList();
        UnscheduledTasks.Clear();
        foreach (var u in unscheduled)
        {
            UnscheduledTasks.Add(u);
        }
        UnscheduledCount = unscheduled.Count;

        if (!SelectedDate.HasValue)
        {
            SelectedDate = today;
        }

        var match = Days.FirstOrDefault(d => d.Date.Date == SelectedDate.Value.Date);
        if (match != null)
        {
            SelectDateCommand.Execute(match);
        }
    }
}
