using System;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;

namespace TaskFlow.ViewModels;

public class PlanMyDayViewModel : ObservableObject
{
    private readonly IDailyPlanRepository _planRepo;
    private readonly ITaskRepository _taskRepo;
    private readonly IFollowUpRepository _followUpRepo;

    private int _availableMinutes = 240;
    private string _localDate = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    private int _totalEstimatedMinutes;
    private int _remainingMinutes = 240;
    private bool _isPlanAccepted;
    private DailyPlanItem? _acceptedPlan;
    private string? _acceptedAt;
    private string _statusMessage = string.Empty;

    public ObservableCollection<PlanItemReference> RecommendedItems { get; } = new();
    public ObservableCollection<PlanItemReference> OverflowItems { get; } = new();

    public int AvailableMinutes
    {
        get => _availableMinutes;
        set
        {
            if (SetProperty(ref _availableMinutes, value))
            {
                RecalculateCapacity();
            }
        }
    }

    public string LocalDate
    {
        get => _localDate;
        set => SetProperty(ref _localDate, value);
    }

    public int TotalEstimatedMinutes
    {
        get => _totalEstimatedMinutes;
        set => SetProperty(ref _totalEstimatedMinutes, value);
    }

    public int RemainingMinutes
    {
        get => _remainingMinutes;
        set => SetProperty(ref _remainingMinutes, value);
    }

    public bool IsPlanAccepted
    {
        get => _isPlanAccepted;
        set => SetProperty(ref _isPlanAccepted, value);
    }

    public DailyPlanItem? AcceptedPlan
    {
        get => _acceptedPlan;
        set => SetProperty(ref _acceptedPlan, value);
    }

    public string? AcceptedAt
    {
        get => _acceptedAt;
        set => SetProperty(ref _acceptedAt, value);
    }

    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public ICommand GeneratePlanCommand { get; }
    public ICommand AcceptPlanCommand { get; }
    public ICommand MoveToOverflowCommand { get; }
    public ICommand MoveToRecommendedCommand { get; }
    public ICommand ToggleItemCompletedCommand { get; }
    public ICommand SetPresetCapacityCommand { get; }

    public PlanMyDayViewModel(
        IDailyPlanRepository planRepo,
        ITaskRepository taskRepo,
        IFollowUpRepository followUpRepo)
    {
        _planRepo = planRepo;
        _taskRepo = taskRepo;
        _followUpRepo = followUpRepo;

        GeneratePlanCommand = new RelayCommand(async () => await GeneratePlanAsync());
        AcceptPlanCommand = new RelayCommand(async () => await AcceptPlanAsync());
        MoveToOverflowCommand = new RelayCommand<PlanItemReference>(MoveToOverflow);
        MoveToRecommendedCommand = new RelayCommand<PlanItemReference>(MoveToRecommended);
        ToggleItemCompletedCommand = new RelayCommand<PlanItemReference>(async item => await ToggleItemCompletedAsync(item));
        SetPresetCapacityCommand = new RelayCommand<int>(mins =>
        {
            AvailableMinutes = mins;
        });
    }

    public async Task InitializeAsync()
    {
        var existing = await _planRepo.GetByDateAsync(LocalDate);
        if (existing != null)
        {
            AcceptedPlan = existing;
            AvailableMinutes = existing.AvailableMinutes;
            IsPlanAccepted = !string.IsNullOrWhiteSpace(existing.AcceptedAt);
            AcceptedAt = existing.AcceptedAt;

            RecommendedItems.Clear();
            foreach (var item in existing.Items)
            {
                RecommendedItems.Add(item);
            }
            OverflowItems.Clear();
            RecalculateCapacity();
        }
        else
        {
            await GeneratePlanAsync();
        }
    }

    public async Task GeneratePlanAsync()
    {
        var tasks = await _taskRepo.ListAsync();
        var followUps = await _followUpRepo.ListAsync("open");

        var result = PlanEngine.GenerateDailyPlan(tasks, followUps, AvailableMinutes, LocalDate);

        RecommendedItems.Clear();
        foreach (var item in result.RecommendedItems)
        {
            RecommendedItems.Add(item);
        }

        OverflowItems.Clear();
        foreach (var item in result.OverflowItems)
        {
            OverflowItems.Add(item);
        }

        TotalEstimatedMinutes = result.TotalEstimatedMinutes;
        RemainingMinutes = result.RemainingMinutes;
        StatusMessage = $"Generated plan: {RecommendedItems.Count} items ({TotalEstimatedMinutes}m / {AvailableMinutes}m)";
    }

    public async Task AcceptPlanAsync()
    {
        var plan = new DailyPlanItem
        {
            LocalDate = LocalDate,
            AvailableMinutes = AvailableMinutes,
            Items = RecommendedItems.ToList()
        };

        var saved = await _planRepo.SaveAsync(plan);
        var accepted = await _planRepo.AcceptAsync(saved.LocalDate);

        AcceptedPlan = accepted;
        IsPlanAccepted = true;
        AcceptedAt = accepted.AcceptedAt;
        StatusMessage = "Plan accepted for today!";
    }

    public void MoveToOverflow(PlanItemReference? item)
    {
        if (item == null) return;
        RecommendedItems.Remove(item);
        OverflowItems.Add(item);
        RecalculateCapacity();
    }

    public void MoveToRecommended(PlanItemReference? item)
    {
        if (item == null) return;
        OverflowItems.Remove(item);
        RecommendedItems.Add(item);
        RecalculateCapacity();
    }

    public async Task ToggleItemCompletedAsync(PlanItemReference? item)
    {
        if (item == null) return;
        item.IsCompleted = !item.IsCompleted;

        if (string.Equals(item.Type, "task", StringComparison.OrdinalIgnoreCase))
        {
            var task = await _taskRepo.GetByIdAsync(item.Id);
            if (task != null && task.Completed != item.IsCompleted)
            {
                await _taskRepo.ToggleCompleteAsync(task.Id);
            }
        }
        else if (string.Equals(item.Type, "followup", StringComparison.OrdinalIgnoreCase))
        {
            if (item.IsCompleted)
            {
                await _followUpRepo.CompleteOccurrenceAsync(item.Id);
            }
        }

        if (IsPlanAccepted)
        {
            var plan = new DailyPlanItem
            {
                LocalDate = LocalDate,
                AvailableMinutes = AvailableMinutes,
                Items = RecommendedItems.ToList(),
                AcceptedAt = AcceptedAt
            };
            await _planRepo.SaveAsync(plan);
        }
    }

    private void RecalculateCapacity()
    {
        TotalEstimatedMinutes = RecommendedItems.Sum(i => i.EstimatedMinutes);
        RemainingMinutes = Math.Max(0, AvailableMinutes - TotalEstimatedMinutes);
    }
}
