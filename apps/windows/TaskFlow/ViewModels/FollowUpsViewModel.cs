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

    private FollowUpItem? _selectedFollowUp;
    private string _statusFilter = "open";
    private string _searchText = string.Empty;
    private bool _isCreatePanelVisible;
    private bool _isEditPanelVisible;

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

    public ObservableCollection<FollowUpItem> FollowUps { get; } = new();
    public ObservableCollection<FollowUpItem> FilteredFollowUps { get; } = new();

    public FollowUpItem? SelectedFollowUp
    {
        get => _selectedFollowUp;
        set
        {
            if (SetProperty(ref _selectedFollowUp, value))
            {
                OnPropertyChanged(nameof(HasSelectedFollowUp));
                if (value != null)
                {
                    PopulateEditForm(value);
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
            }
        }
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

    public int OpenCount => FollowUps.Count(f => string.Equals(f.Status, "open", StringComparison.OrdinalIgnoreCase));
    public int OverdueCount
    {
        get
        {
            var now = DateTimeOffset.UtcNow;
            return FollowUps.Count(f =>
                string.Equals(f.Status, "open", StringComparison.OrdinalIgnoreCase) &&
                DateTimeOffset.TryParse(f.DueAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt) &&
                dt < now);
        }
    }

    public ICommand LoadCommand { get; }
    public ICommand CreateCommand { get; }
    public ICommand SaveEditCommand { get; }
    public ICommand CompleteOccurrenceCommand { get; }
    public ICommand SnoozeCommand { get; }
    public ICommand RescheduleCommand { get; }
    public ICommand DeleteCommand { get; }
    public ICommand ClosePanelsCommand { get; }
    public ICommand OpenCreatePanelCommand { get; }
    public ICommand LaunchPreferredActionCommand { get; }
    public ICommand LaunchEmailCommand { get; }
    public ICommand LaunchPhoneCommand { get; }
    public ICommand LaunchWhatsAppCommand { get; }

    public FollowUpsViewModel(IFollowUpRepository repository, ILauncherService launcher)
    {
        _repository = repository;
        _launcher = launcher;

        LoadCommand = new RelayCommand(async () => await LoadAsync());
        CreateCommand = new RelayCommand(async () => await CreateAsync());
        SaveEditCommand = new RelayCommand(async () => await SaveEditAsync());
        CompleteOccurrenceCommand = new RelayCommand(async () => await CompleteOccurrenceAsync());
        SnoozeCommand = new RelayCommand(async () => await SnoozeAsync());
        RescheduleCommand = new RelayCommand(async () => await RescheduleAsync());
        DeleteCommand = new RelayCommand(async () => await DeleteAsync());
        ClosePanelsCommand = new RelayCommand(() =>
        {
            IsCreatePanelVisible = false;
            IsEditPanelVisible = false;
        });
        OpenCreatePanelCommand = new RelayCommand(() => IsCreatePanelVisible = true);
        LaunchPreferredActionCommand = new RelayCommand(ExecutePreferredAction);
        LaunchEmailCommand = new RelayCommand(ExecuteEmail);
        LaunchPhoneCommand = new RelayCommand(ExecutePhone);
        LaunchWhatsAppCommand = new RelayCommand(ExecuteWhatsApp);

        ResetForm();
    }

    public async Task LoadAsync()
    {
        var items = await _repository.ListAsync();
        FollowUps.Clear();
        foreach (var item in items)
        {
            FollowUps.Add(item);
        }
        ApplyFilter();
        OnPropertyChanged(nameof(OpenCount));
        OnPropertyChanged(nameof(OverdueCount));
    }

    public void ApplyFilter()
    {
        var query = FollowUps.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(StatusFilter) && !string.Equals(StatusFilter, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(f => string.Equals(f.Status, StatusFilter, StringComparison.OrdinalIgnoreCase));
        }

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
        FollowUps.Add(created);
        ApplyFilter();
        IsCreatePanelVisible = false;
        ResetForm();
        SelectedFollowUp = created;
    }

    public async Task SaveEditAsync()
    {
        if (SelectedFollowUp == null || string.IsNullOrWhiteSpace(PersonName) || string.IsNullOrWhiteSpace(Commitment))
        {
            return;
        }

        SelectedFollowUp.PersonName = PersonName.Trim();
        SelectedFollowUp.Commitment = Commitment.Trim();
        SelectedFollowUp.Details = string.IsNullOrWhiteSpace(Details) ? null : Details.Trim();
        if (!string.IsNullOrWhiteSpace(DueAt))
        {
            SelectedFollowUp.DueAt = DueAt;
        }
        SelectedFollowUp.EmailAddress = string.IsNullOrWhiteSpace(EmailAddress) ? null : EmailAddress.Trim();
        SelectedFollowUp.PhoneNumber = string.IsNullOrWhiteSpace(PhoneNumber) ? null : PhoneNumber.Trim();
        SelectedFollowUp.WhatsAppNumber = string.IsNullOrWhiteSpace(WhatsAppNumber) ? null : WhatsAppNumber.Trim();
        SelectedFollowUp.PreferredAction = PreferredAction;

        if (!string.Equals(RecurrenceFrequency, "none", StringComparison.OrdinalIgnoreCase))
        {
            SelectedFollowUp.Recurrence = new RecurrenceRule
            {
                Frequency = RecurrenceFrequency,
                Mode = RecurrenceMode,
                Interval = RecurrenceInterval > 0 ? RecurrenceInterval : 1,
                LocalTime = RecurrenceLocalTime
            };
        }
        else
        {
            SelectedFollowUp.Recurrence = null;
        }

        var updated = await _repository.UpdateAsync(SelectedFollowUp);
        int index = FollowUps.IndexOf(SelectedFollowUp);
        if (index >= 0)
        {
            FollowUps[index] = updated;
        }
        ApplyFilter();
        IsEditPanelVisible = false;
    }

    public async Task CompleteOccurrenceAsync()
    {
        if (SelectedFollowUp == null)
        {
            return;
        }

        var updated = await _repository.CompleteOccurrenceAsync(SelectedFollowUp.Id);
        int index = FollowUps.IndexOf(SelectedFollowUp);
        if (index >= 0)
        {
            FollowUps[index] = updated;
        }
        SelectedFollowUp = updated;
        ApplyFilter();
        OnPropertyChanged(nameof(OpenCount));
        OnPropertyChanged(nameof(OverdueCount));
    }

    public async Task SnoozeAsync()
    {
        if (SelectedFollowUp == null)
        {
            return;
        }

        var updated = await _repository.SnoozeAsync(SelectedFollowUp.Id, SnoozeHours);
        int index = FollowUps.IndexOf(SelectedFollowUp);
        if (index >= 0)
        {
            FollowUps[index] = updated;
        }
        SelectedFollowUp = updated;
        ApplyFilter();
    }

    public async Task RescheduleAsync()
    {
        if (SelectedFollowUp == null || string.IsNullOrWhiteSpace(RescheduleDueAt))
        {
            return;
        }

        var updated = await _repository.RescheduleAsync(SelectedFollowUp.Id, RescheduleDueAt);
        int index = FollowUps.IndexOf(SelectedFollowUp);
        if (index >= 0)
        {
            FollowUps[index] = updated;
        }
        SelectedFollowUp = updated;
        ApplyFilter();
    }

    public async Task DeleteAsync()
    {
        if (SelectedFollowUp == null)
        {
            return;
        }

        var toDelete = SelectedFollowUp;
        await _repository.DeleteAsync(toDelete.Id);
        FollowUps.Remove(toDelete);
        SelectedFollowUp = null;
        ApplyFilter();
        OnPropertyChanged(nameof(OpenCount));
        OnPropertyChanged(nameof(OverdueCount));
    }

    public void ExecutePreferredAction()
    {
        if (SelectedFollowUp == null)
        {
            return;
        }

        var action = SelectedFollowUp.PreferredAction?.ToLowerInvariant() ?? "email";
        if (action == "whatsapp" && !string.IsNullOrWhiteSpace(SelectedFollowUp.WhatsAppNumber))
        {
            ExecuteWhatsApp();
        }
        else if (action == "phone" && !string.IsNullOrWhiteSpace(SelectedFollowUp.PhoneNumber))
        {
            ExecutePhone();
        }
        else if (!string.IsNullOrWhiteSpace(SelectedFollowUp.EmailAddress))
        {
            ExecuteEmail();
        }
    }

    public void ExecuteEmail()
    {
        if (SelectedFollowUp != null && !string.IsNullOrWhiteSpace(SelectedFollowUp.EmailAddress))
        {
            _launcher.LaunchEmail(SelectedFollowUp.EmailAddress, $"Follow up: {SelectedFollowUp.Commitment}", SelectedFollowUp.Details);
        }
    }

    public void ExecutePhone()
    {
        if (SelectedFollowUp != null && !string.IsNullOrWhiteSpace(SelectedFollowUp.PhoneNumber))
        {
            _launcher.LaunchPhone(SelectedFollowUp.PhoneNumber);
        }
    }

    public void ExecuteWhatsApp()
    {
        if (SelectedFollowUp != null && !string.IsNullOrWhiteSpace(SelectedFollowUp.WhatsAppNumber))
        {
            _launcher.LaunchWhatsApp(SelectedFollowUp.WhatsAppNumber, $"Hi {SelectedFollowUp.PersonName}, following up on: {SelectedFollowUp.Commitment}");
        }
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
