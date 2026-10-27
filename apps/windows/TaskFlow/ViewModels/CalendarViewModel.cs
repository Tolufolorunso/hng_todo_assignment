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

    public ObservableCollection<CalendarDayItem> Days { get; } = new();
    public ObservableCollection<PlanItemReference> SelectedDayItems { get; } = new();

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

    public string SelectedDateDisplay => SelectedDate?.ToString("D", CultureInfo.InvariantCulture) ?? "Select a date";
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
        });

        LoadCommand = new RelayCommand(async () => await RefreshCalendarAsync());
    }

    public async Task RefreshCalendarAsync()
    {
        var tasks = await _taskRepo.ListAsync();
        var followUps = await _followUpRepo.ListAsync();

        var today = DateTime.UtcNow.Date;
        var firstDayOfMonth = new DateTime(CurrentMonth.Year, CurrentMonth.Month, 1);
        int daysInMonth = DateTime.DaysInMonth(CurrentMonth.Year, CurrentMonth.Month);

        // Day of week offset (Sunday = 0)
        int startOffset = (int)firstDayOfMonth.DayOfWeek;
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
