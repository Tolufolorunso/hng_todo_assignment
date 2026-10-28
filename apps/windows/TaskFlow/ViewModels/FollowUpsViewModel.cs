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
using TaskFlow.Services;

namespace TaskFlow.ViewModels;

public class FollowUpsViewModel : ObservableObject
{
    private readonly IFollowUpRepository _repository;
    private readonly ILauncherService _launcher;

    private FollowUpItemViewModel? _selectedFollowUp;
    private string _statusFilter = "all";
    private string _searchText = string.Empty;
    private bool _isCreatePanelVisible;
    private bool _isEditPanelVisible;
    private bool _isHistoryModalOpen;
    private bool _isRescheduleModalOpen;

    // Form fields
    private string _personName = string.Empty;
    private string _commitment = string.Empty;
    private string _details = string.Empty;
    private string _dueAt = string.Empty;
    private string _emailAddress = string.Empty;
    private string _phoneNumber = string.Empty;
    private string _whatsAppNumber = string.Empty;
    private string _preferredAction = "email";
    private string _recurrenceFrequency = "none";
    private string _recurrenceMode = "calendarAnchored";
    private int _recurrenceInterval = 1;
    private string _recurrenceLocalTime = "09:00";
    private int _snoozeHours = 24;
    private string _rescheduleDueAt = string.Empty;

    public ObservableCollection<FollowUpItemViewModel> FollowUps { get; } = new();
    public ObservableCollection<FollowUpItemViewModel> FilteredFollowUps { get; } = new();
    public ObservableCollection<FollowUpOccurrenceItem> OccurrenceHistory { get; } = new();

    public FollowUpItemViewModel? SelectedFollowUp
    {
        get => _selectedFollowUp;
        set
        {
            if (SetProperty(ref _selectedFollowUp, value))
            {
                OnPropertyChanged(nameof(HasSelectedFollowUp));
                if (value != null)
                {
                    PopulateEditForm(value.Model);
                }
            }
        }
    }

    public bool HasSelectedFollowUp => SelectedFollowUp != null;

    public string StatusFilter
    {
        get => _statusFilter;
        set
        {
            if (SetProperty(ref _statusFilter, value))
            {
                ApplyFilter();
            }
        }
    }

    public string SearchText
    {
        get => _searchText;
        set
        {
            if (SetProperty(ref _searchText, value))
            {
                ApplyFilter();
            }
        }
    }

    public bool IsCreatePanelVisible
    {
        get => _isCreatePanelVisible;
        set
        {
            if (SetProperty(ref _isCreatePanelVisible, value) && value)
            {
                IsEditPanelVisible = false;
                IsHistoryModalOpen = false;
                IsRescheduleModalOpen = false;
                ResetForm();
            }
        }
    }

    public bool IsEditPanelVisible
    {
        get => _isEditPanelVisible;
        set
        {
            if (SetProperty(ref _isEditPanelVisible, value) && value)
            {
                IsCreatePanelVisible = false;
                IsHistoryModalOpen = false;
                IsRescheduleModalOpen = false;
            }
        }
    }

    public bool IsHistoryModalOpen
    {
        get => _isHistoryModalOpen;
        set => SetProperty(ref _isHistoryModalOpen, value);
    }

    public bool IsRescheduleModalOpen
    {
        get => _isRescheduleModalOpen;
        set => SetProperty(ref _isRescheduleModalOpen, value);
    }

    public string PersonName { get => _personName; set => SetProperty(ref _personName, value); }
    public string Commitment { get => _commitment; set => SetProperty(ref _commitment, value); }
    public string Details { get => _details; set => SetProperty(ref _details, value); }
    public string DueAt { get => _dueAt; set => SetProperty(ref _dueAt, value); }
    public string EmailAddress { get => _emailAddress; set => SetProperty(ref _emailAddress, value); }
    public string PhoneNumber { get => _phoneNumber; set => SetProperty(ref _phoneNumber, value); }
    public string WhatsAppNumber { get => _whatsAppNumber; set => SetProperty(ref _whatsAppNumber, value); }
    public string PreferredAction { get => _preferredAction; set => SetProperty(ref _preferredAction, value); }
    public string RecurrenceFrequency { get => _recurrenceFrequency; set => SetProperty(ref _recurrenceFrequency, value); }
    public string RecurrenceMode { get => _recurrenceMode; set => SetProperty(ref _recurrenceMode, value); }
    public int RecurrenceInterval { get => _recurrenceInterval; set => SetProperty(ref _recurrenceInterval, value); }
    public string RecurrenceLocalTime { get => _recurrenceLocalTime; set => SetProperty(ref _recurrenceLocalTime, value); }
    public int SnoozeHours { get => _snoozeHours; set => SetProperty(ref _snoozeHours, value); }
    public string RescheduleDueAt { get => _rescheduleDueAt; set => SetProperty(ref _rescheduleDueAt, value); }

    public bool IsRecurring
    {
        get => !string.Equals(RecurrenceFrequency, "none", StringComparison.OrdinalIgnoreCase);
        set
        {
            if (value)
            {
                if (string.Equals(RecurrenceFrequency, "none", StringComparison.OrdinalIgnoreCase))
                {
                    RecurrenceFrequency = "weekly";
                }
            }
            else
            {
                RecurrenceFrequency = "none";
            }
            OnPropertyChanged(nameof(IsRecurring));
        }
    }

    public int OpenCount => FollowUps.Count(f => !f.IsCompleted);
    public int OverdueCount => FollowUps.Count(f => f.IsOverdue);
    public int CompletedCount => FollowUps.Count(f => f.IsCompleted);
    public int UpcomingCount => FollowUps.Count(f => !f.IsCompleted && !f.IsOverdue);

    public string AllCountText => $"All ({FollowUps.Count})";
    public string DueOverdueCountText => "Due & Overdue";
    public string UpcomingCountText => $"Upcoming ({UpcomingCount})";
    public string CompletedCountText => $"Completed ({CompletedCount})";

    public IReadOnlyList<string> PreferredActionOptions { get; } = new[] { "none", "email", "phone", "whatsapp" };

    public ICommand LoadCommand { get; }
    public ICommand SetStatusFilterCommand { get; }
    public ICommand CreateCommand { get; }
    public ICommand SaveEditCommand { get; }
    public ICommand CompleteOccurrenceCommand { get; }
    public ICommand SnoozeCommand { get; }
    public ICommand RescheduleCommand { get; }
    public ICommand DeleteCommand { get; }
    public ICommand ClosePanelsCommand { get; }
    public ICommand OpenCreatePanelCommand { get; }
    public ICommand OpenEditPanelCommand { get; }
    public ICommand OpenHistoryCommand { get; }
    public ICommand CloseHistoryModalCommand { get; }
    public ICommand OpenRescheduleModalCommand { get; }
    public ICommand CloseRescheduleModalCommand { get; }
    public ICommand LaunchPreferredActionCommand { get; }
    public ICommand LaunchEmailCommand { get; }
    public ICommand LaunchPhoneCommand { get; }
    public ICommand LaunchWhatsAppCommand { get; }

    public FollowUpsViewModel(IFollowUpRepository repository, ILauncherService launcher)
    {
        _repository = repository;
        _launcher = launcher;

        LoadCommand = new RelayCommand(async () => await LoadAsync());
        SetStatusFilterCommand = new RelayCommand<string>(filter => StatusFilter = filter ?? "open");
        CreateCommand = new RelayCommand(async () => await CreateAsync());
        SaveEditCommand = new RelayCommand(async () => await SaveEditAsync());
        CompleteOccurrenceCommand = new RelayCommand<object>(async param => await CompleteOccurrenceAsync(ResolveTarget(param)));
        SnoozeCommand = new RelayCommand<object>(async param => await SnoozeAsync(ResolveTarget(param)));
        RescheduleCommand = new RelayCommand<object>(async param => await RescheduleAsync(ResolveTarget(param)));
        DeleteCommand = new RelayCommand<object>(async param => await DeleteAsync(ResolveTarget(param)));
        ClosePanelsCommand = new RelayCommand(() =>
        {
            IsCreatePanelVisible = false;
            IsEditPanelVisible = false;
            IsHistoryModalOpen = false;
            IsRescheduleModalOpen = false;
        });
        OpenCreatePanelCommand = new RelayCommand(() => IsCreatePanelVisible = true);
        OpenEditPanelCommand = new RelayCommand<object>(param =>
        {
            var target = ResolveTarget(param);
            if (target != null)
            {
                SelectedFollowUp = target;
                IsEditPanelVisible = true;
            }
        });
        OpenHistoryCommand = new RelayCommand<object>(async param =>
        {
            var target = ResolveTarget(param);
            if (target != null)
            {
                SelectedFollowUp = target;
                await LoadOccurrencesAsync(target.Id);
                IsHistoryModalOpen = true;
            }
        });
        CloseHistoryModalCommand = new RelayCommand(() => IsHistoryModalOpen = false);
        OpenRescheduleModalCommand = new RelayCommand<object>(param =>
        {
            var target = ResolveTarget(param);
            if (target != null)
            {
                SelectedFollowUp = target;
                RescheduleDueAt = target.DueAt;
                IsRescheduleModalOpen = true;
            }
        });
        CloseRescheduleModalCommand = new RelayCommand(() => IsRescheduleModalOpen = false);

        LaunchPreferredActionCommand = new RelayCommand<object>(param => ExecutePreferredAction(ResolveTarget(param)));
        LaunchEmailCommand = new RelayCommand<object>(param => ExecuteEmail(ResolveTarget(param)));
        LaunchPhoneCommand = new RelayCommand<object>(param => ExecutePhone(ResolveTarget(param)));
        LaunchWhatsAppCommand = new RelayCommand<object>(param => ExecuteWhatsApp(ResolveTarget(param)));

        ResetForm();
    }

    private FollowUpItemViewModel? ResolveTarget(object? param)
    {
        if (param is FollowUpItemViewModel vm) return vm;
        if (param is FollowUpItem model) return FollowUps.FirstOrDefault(f => f.Id == model.Id);
        return SelectedFollowUp;
    }

    public async Task LoadAsync()
    {
        var items = await _repository.ListAsync();
        FollowUps.Clear();
        foreach (var item in items)
        {
            FollowUps.Add(new FollowUpItemViewModel(item));
        }
        ApplyFilter();
        NotifyCounts();
    }

    public void ApplyFilter()
    {
        var query = FollowUps.AsEnumerable();

        if (string.Equals(StatusFilter, "completed", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(f => f.IsCompleted);
        }
        else if (string.Equals(StatusFilter, "due_overdue", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(StatusFilter, "overdue", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(f => !f.IsCompleted && f.IsOverdue);
        }
        else if (string.Equals(StatusFilter, "upcoming", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(f => !f.IsCompleted && !f.IsOverdue);
        }
        else if (string.Equals(StatusFilter, "open", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(f => !f.IsCompleted);
        }
        // "all" shows all follow ups without filtering out status

        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var term = SearchText.Trim();
            query = query.Where(f =>
                (f.PersonName != null && f.PersonName.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                (f.Commitment != null && f.Commitment.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                (f.Details != null && f.Details.Contains(term, StringComparison.OrdinalIgnoreCase)));
        }

        FilteredFollowUps.Clear();
        foreach (var item in query.OrderBy(f => f.DueAt))
        {
            FilteredFollowUps.Add(item);
        }
    }

    public async Task CreateAsync()
    {
        if (string.IsNullOrWhiteSpace(PersonName) || string.IsNullOrWhiteSpace(Commitment))
        {
            return;
        }

        string due = string.IsNullOrWhiteSpace(DueAt)
            ? DateTimeOffset.UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture)
            : DueAt;

        RecurrenceRule? rule = null;
        if (!string.Equals(RecurrenceFrequency, "none", StringComparison.OrdinalIgnoreCase))
        {
            rule = new RecurrenceRule
            {
                Frequency = RecurrenceFrequency,
                Mode = RecurrenceMode,
                Interval = RecurrenceInterval > 0 ? RecurrenceInterval : 1,
                LocalTime = RecurrenceLocalTime
            };
        }

        var item = new FollowUpItem
        {
            PersonName = PersonName.Trim(),
            Commitment = Commitment.Trim(),
            Details = string.IsNullOrWhiteSpace(Details) ? null : Details.Trim(),
            DueAt = due,
            EmailAddress = string.IsNullOrWhiteSpace(EmailAddress) ? null : EmailAddress.Trim(),
            PhoneNumber = string.IsNullOrWhiteSpace(PhoneNumber) ? null : PhoneNumber.Trim(),
            WhatsAppNumber = string.IsNullOrWhiteSpace(WhatsAppNumber) ? null : WhatsAppNumber.Trim(),
            PreferredAction = PreferredAction,
            Recurrence = rule
        };

        var created = await _repository.CreateAsync(item);
        var createdVm = new FollowUpItemViewModel(created);
        FollowUps.Add(createdVm);
        ApplyFilter();
        IsCreatePanelVisible = false;
        ResetForm();
        SelectedFollowUp = createdVm;
        NotifyCounts();
    }

    public async Task SaveEditAsync()
    {
        if (SelectedFollowUp == null || string.IsNullOrWhiteSpace(PersonName) || string.IsNullOrWhiteSpace(Commitment))
        {
            return;
        }

        var model = SelectedFollowUp.Model;
        model.PersonName = PersonName.Trim();
        model.Commitment = Commitment.Trim();
        model.Details = string.IsNullOrWhiteSpace(Details) ? null : Details.Trim();
        if (!string.IsNullOrWhiteSpace(DueAt))
        {
            model.DueAt = DueAt;
        }
        model.EmailAddress = string.IsNullOrWhiteSpace(EmailAddress) ? null : EmailAddress.Trim();
        model.PhoneNumber = string.IsNullOrWhiteSpace(PhoneNumber) ? null : PhoneNumber.Trim();
        model.WhatsAppNumber = string.IsNullOrWhiteSpace(WhatsAppNumber) ? null : WhatsAppNumber.Trim();
        model.PreferredAction = PreferredAction;

        if (!string.Equals(RecurrenceFrequency, "none", StringComparison.OrdinalIgnoreCase))
        {
            model.Recurrence = new RecurrenceRule
            {
                Frequency = RecurrenceFrequency,
                Mode = RecurrenceMode,
                Interval = RecurrenceInterval > 0 ? RecurrenceInterval : 1,
                LocalTime = RecurrenceLocalTime
            };
        }
        else
        {
            model.Recurrence = null;
        }

        var updated = await _repository.UpdateAsync(model);
        var updatedVm = new FollowUpItemViewModel(updated);
        int index = FollowUps.IndexOf(SelectedFollowUp);
        if (index >= 0)
        {
            FollowUps[index] = updatedVm;
        }
        SelectedFollowUp = updatedVm;
        ApplyFilter();
        IsEditPanelVisible = false;
        NotifyCounts();
    }

    public async Task CompleteOccurrenceAsync(FollowUpItemViewModel? target = null)
    {
        target ??= SelectedFollowUp;
        if (target == null) return;

        var updated = await _repository.CompleteOccurrenceAsync(target.Id);
        var updatedVm = new FollowUpItemViewModel(updated);
        int index = FollowUps.IndexOf(target);
        if (index >= 0)
        {
            FollowUps[index] = updatedVm;
        }
        if (SelectedFollowUp?.Id == target.Id)
        {
            SelectedFollowUp = updatedVm;
        }
        ApplyFilter();
        NotifyCounts();
    }

    public async Task SnoozeAsync(FollowUpItemViewModel? target = null)
    {
        target ??= SelectedFollowUp;
        if (target == null) return;

        var updated = await _repository.SnoozeAsync(target.Id, SnoozeHours);
        var updatedVm = new FollowUpItemViewModel(updated);
        int index = FollowUps.IndexOf(target);
        if (index >= 0)
        {
            FollowUps[index] = updatedVm;
        }
        if (SelectedFollowUp?.Id == target.Id)
        {
            SelectedFollowUp = updatedVm;
        }
        ApplyFilter();
        NotifyCounts();
    }

    public async Task RescheduleAsync(FollowUpItemViewModel? target = null)
    {
        target ??= SelectedFollowUp;
        if (target == null || string.IsNullOrWhiteSpace(RescheduleDueAt)) return;

        var updated = await _repository.RescheduleAsync(target.Id, RescheduleDueAt);
        var updatedVm = new FollowUpItemViewModel(updated);
        int index = FollowUps.IndexOf(target);
        if (index >= 0)
        {
            FollowUps[index] = updatedVm;
        }
        if (SelectedFollowUp?.Id == target.Id)
        {
            SelectedFollowUp = updatedVm;
        }
        IsRescheduleModalOpen = false;
        ApplyFilter();
        NotifyCounts();
    }

    public async Task DeleteAsync(FollowUpItemViewModel? target = null)
    {
        target ??= SelectedFollowUp;
        if (target == null) return;

        await _repository.DeleteAsync(target.Id);
        FollowUps.Remove(target);
        if (SelectedFollowUp?.Id == target.Id)
        {
            SelectedFollowUp = null;
        }
        ApplyFilter();
        NotifyCounts();
    }

    public async Task LoadOccurrencesAsync(string followUpId)
    {
        OccurrenceHistory.Clear();
        var list = await _repository.ListOccurrencesAsync(followUpId);
        foreach (var item in list.OrderByDescending(o => o.CreatedAt))
        {
            OccurrenceHistory.Add(item);
        }
    }

    public void ExecutePreferredAction(FollowUpItemViewModel? target = null)
    {
        target ??= SelectedFollowUp;
        if (target == null) return;

        var action = target.PreferredAction?.ToLowerInvariant() ?? "email";
        if (action == "whatsapp" && !string.IsNullOrWhiteSpace(target.WhatsAppNumber))
        {
            ExecuteWhatsApp(target);
        }
        else if (action == "phone" && !string.IsNullOrWhiteSpace(target.PhoneNumber))
        {
            ExecutePhone(target);
        }
        else if (!string.IsNullOrWhiteSpace(target.EmailAddress))
        {
            ExecuteEmail(target);
        }
    }

    public void ExecuteEmail(FollowUpItemViewModel? target = null)
    {
        target ??= SelectedFollowUp;
        if (target != null && !string.IsNullOrWhiteSpace(target.EmailAddress))
        {
            _launcher.LaunchEmail(target.EmailAddress, $"Follow up: {target.Commitment}", target.Details);
        }
    }

    public void ExecutePhone(FollowUpItemViewModel? target = null)
    {
        target ??= SelectedFollowUp;
        if (target != null && !string.IsNullOrWhiteSpace(target.PhoneNumber))
        {
            _launcher.LaunchPhone(target.PhoneNumber);
        }
    }

    public void ExecuteWhatsApp(FollowUpItemViewModel? target = null)
    {
        target ??= SelectedFollowUp;
        if (target != null && !string.IsNullOrWhiteSpace(target.WhatsAppNumber))
        {
            _launcher.LaunchWhatsApp(target.WhatsAppNumber, $"Hi {target.PersonName}, following up on: {target.Commitment}");
        }
    }

    private void NotifyCounts()
    {
        OnPropertyChanged(nameof(OpenCount));
        OnPropertyChanged(nameof(OverdueCount));
        OnPropertyChanged(nameof(CompletedCount));
        OnPropertyChanged(nameof(UpcomingCount));
        OnPropertyChanged(nameof(AllCountText));
        OnPropertyChanged(nameof(DueOverdueCountText));
        OnPropertyChanged(nameof(UpcomingCountText));
        OnPropertyChanged(nameof(CompletedCountText));
    }

    private void PopulateEditForm(FollowUpItem item)
    {
        PersonName = item.PersonName;
        Commitment = item.Commitment;
        Details = item.Details ?? string.Empty;
        DueAt = item.DueAt;
        EmailAddress = item.EmailAddress ?? string.Empty;
        PhoneNumber = item.PhoneNumber ?? string.Empty;
        WhatsAppNumber = item.WhatsAppNumber ?? string.Empty;
        PreferredAction = item.PreferredAction ?? "email";

        if (item.Recurrence != null)
        {
            RecurrenceFrequency = item.Recurrence.Frequency;
            RecurrenceMode = item.Recurrence.Mode;
            RecurrenceInterval = item.Recurrence.Interval;
            RecurrenceLocalTime = item.Recurrence.LocalTime ?? "09:00";
        }
        else
        {
            RecurrenceFrequency = "none";
            RecurrenceMode = "calendarAnchored";
            RecurrenceInterval = 1;
            RecurrenceLocalTime = "09:00";
        }

        RescheduleDueAt = item.DueAt;
    }

    private void ResetForm()
    {
        PersonName = string.Empty;
        Commitment = string.Empty;
        Details = string.Empty;
        DueAt = DateTimeOffset.UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        EmailAddress = string.Empty;
        PhoneNumber = string.Empty;
        WhatsAppNumber = string.Empty;
        PreferredAction = "email";
        RecurrenceFrequency = "none";
        RecurrenceMode = "calendarAnchored";
        RecurrenceInterval = 1;
        RecurrenceLocalTime = "09:00";
        SnoozeHours = 24;
        RescheduleDueAt = string.Empty;
    }
}
