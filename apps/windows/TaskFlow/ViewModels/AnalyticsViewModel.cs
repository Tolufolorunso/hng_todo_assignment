using System;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Repositories;

namespace TaskFlow.ViewModels;

public class AnalyticsViewModel : ObservableObject
{
    private readonly ITaskRepository _taskRepo;
    private readonly INoteRepository _noteRepo;
    private readonly IFollowUpRepository _followUpRepo;
    private readonly IInboxRepository _inboxRepo;

    private int _totalTasks;
    private int _completedTasks;
    private int _openTasks;
    private string _completionRate = "0%";
    private int _overdueTasks;
    private int _highPriorityTasks;
    private int _mediumPriorityTasks;
    private int _lowPriorityTasks;
    private int _workCategoryTasks;
    private int _personalCategoryTasks;

    private int _totalNotes;

    private int _totalFollowUps;
    private int _openFollowUps;
    private int _completedFollowUps;
    private int _overdueFollowUps;

    private int _totalCaptures;
    private int _pendingCaptures;
    private int _processedCaptures;
    private int _discardedCaptures;

    public int TotalTasks { get => _totalTasks; private set => SetProperty(ref _totalTasks, value); }
    public int CompletedTasks { get => _completedTasks; private set => SetProperty(ref _completedTasks, value); }
    public int OpenTasks { get => _openTasks; private set => SetProperty(ref _openTasks, value); }
    public string CompletionRate { get => _completionRate; private set => SetProperty(ref _completionRate, value); }
    public int OverdueTasks { get => _overdueTasks; private set => SetProperty(ref _overdueTasks, value); }
    public int HighPriorityTasks { get => _highPriorityTasks; private set => SetProperty(ref _highPriorityTasks, value); }
    public int MediumPriorityTasks { get => _mediumPriorityTasks; private set => SetProperty(ref _mediumPriorityTasks, value); }
    public int LowPriorityTasks { get => _lowPriorityTasks; private set => SetProperty(ref _lowPriorityTasks, value); }
    public int WorkCategoryTasks { get => _workCategoryTasks; private set => SetProperty(ref _workCategoryTasks, value); }
    public int PersonalCategoryTasks { get => _personalCategoryTasks; private set => SetProperty(ref _personalCategoryTasks, value); }

    public int TotalNotes { get => _totalNotes; private set => SetProperty(ref _totalNotes, value); }

    public int TotalFollowUps { get => _totalFollowUps; private set => SetProperty(ref _totalFollowUps, value); }
    public int OpenFollowUps { get => _openFollowUps; private set => SetProperty(ref _openFollowUps, value); }
    public int CompletedFollowUps { get => _completedFollowUps; private set => SetProperty(ref _completedFollowUps, value); }
    public int OverdueFollowUps { get => _overdueFollowUps; private set => SetProperty(ref _overdueFollowUps, value); }

    public int TotalCaptures { get => _totalCaptures; private set => SetProperty(ref _totalCaptures, value); }
    public int PendingCaptures { get => _pendingCaptures; private set => SetProperty(ref _pendingCaptures, value); }
    public int ProcessedCaptures { get => _processedCaptures; private set => SetProperty(ref _processedCaptures, value); }
    public int DiscardedCaptures { get => _discardedCaptures; private set => SetProperty(ref _discardedCaptures, value); }

    public double HighPriorityPercent => TotalTasks > 0 ? (double)HighPriorityTasks / TotalTasks * 100 : 0;
    public double MediumPriorityPercent => TotalTasks > 0 ? (double)MediumPriorityTasks / TotalTasks * 100 : 0;
    public double LowPriorityPercent => TotalTasks > 0 ? (double)LowPriorityTasks / TotalTasks * 100 : 0;

    public ICommand RefreshCommand { get; }

    public AnalyticsViewModel(
        ITaskRepository taskRepo,
        INoteRepository noteRepo,
        IFollowUpRepository followUpRepo,
        IInboxRepository inboxRepo)
    {
        _taskRepo = taskRepo;
        _noteRepo = noteRepo;
        _followUpRepo = followUpRepo;
        _inboxRepo = inboxRepo;

        RefreshCommand = new RelayCommand(async () => await RefreshMetricsAsync());
    }

    public async Task RefreshMetricsAsync()
    {
        var tasks = await _taskRepo.ListAsync();
        var notes = await _noteRepo.ListAsync();
        var followUps = await _followUpRepo.ListAsync();
        var captures = await _inboxRepo.ListAsync();

        TotalTasks = tasks.Count;
        CompletedTasks = tasks.Count(t => t.Completed);
        OpenTasks = TotalTasks - CompletedTasks;
        CompletionRate = TotalTasks > 0 ? $"{Math.Round((double)CompletedTasks / TotalTasks * 100)}%" : "0%";

        var now = DateTimeOffset.UtcNow;
        OverdueTasks = tasks.Count(t =>
            !t.Completed &&
            !string.IsNullOrWhiteSpace(t.DueDate) &&
            DateTimeOffset.TryParse(t.DueDate, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt) &&
            dt < now);

        HighPriorityTasks = tasks.Count(t => string.Equals(t.Priority, "high", StringComparison.OrdinalIgnoreCase));
        MediumPriorityTasks = tasks.Count(t => string.Equals(t.Priority, "medium", StringComparison.OrdinalIgnoreCase));
        LowPriorityTasks = tasks.Count(t => string.Equals(t.Priority, "low", StringComparison.OrdinalIgnoreCase));

        WorkCategoryTasks = tasks.Count(t => string.Equals(t.Category, "work", StringComparison.OrdinalIgnoreCase));
        PersonalCategoryTasks = tasks.Count(t => string.Equals(t.Category, "personal", StringComparison.OrdinalIgnoreCase));

        TotalNotes = notes.Count;

        TotalFollowUps = followUps.Count;
        OpenFollowUps = followUps.Count(f => string.Equals(f.Status, "open", StringComparison.OrdinalIgnoreCase));
        CompletedFollowUps = followUps.Count(f => string.Equals(f.Status, "completed", StringComparison.OrdinalIgnoreCase));
        OverdueFollowUps = followUps.Count(f =>
            string.Equals(f.Status, "open", StringComparison.OrdinalIgnoreCase) &&
            DateTimeOffset.TryParse(f.DueAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var fdt) &&
            fdt < now);

        TotalCaptures = captures.Count;
        PendingCaptures = captures.Count(c => string.Equals(c.State, "pending", StringComparison.OrdinalIgnoreCase));
        ProcessedCaptures = captures.Count(c => string.Equals(c.State, "processed", StringComparison.OrdinalIgnoreCase));
        DiscardedCaptures = captures.Count(c => string.Equals(c.State, "discarded", StringComparison.OrdinalIgnoreCase));

        OnPropertyChanged(nameof(HighPriorityPercent));
        OnPropertyChanged(nameof(MediumPriorityPercent));
        OnPropertyChanged(nameof(LowPriorityPercent));
    }
}
