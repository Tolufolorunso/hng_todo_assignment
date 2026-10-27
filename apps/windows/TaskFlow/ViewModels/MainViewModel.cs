using System;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;

namespace TaskFlow.ViewModels;

public class MainViewModel : ObservableObject
{
    private string _activeTab = "Tasks";
    private string _globalSearch = string.Empty;
    private string _statusText = "Ready";

    public TasksViewModel TasksVM { get; }
    public NotesViewModel NotesVM { get; }
    public BackupViewModel BackupVM { get; }
    public FollowUpsViewModel FollowUpsVM { get; }
    public PlanMyDayViewModel PlanMyDayVM { get; }
    public InboxViewModel InboxVM { get; }
    public CalendarViewModel CalendarVM { get; }
    public AnalyticsViewModel AnalyticsVM { get; }
    public ThemeViewModel ThemeVM { get; }

    public string ActiveTab
    {
        get => _activeTab;
        set
        {
            if (SetProperty(ref _activeTab, value))
            {
                OnPropertyChanged(nameof(IsTasksTabActive));
                OnPropertyChanged(nameof(IsFollowUpsTabActive));
                OnPropertyChanged(nameof(IsPlanMyDayTabActive));
                OnPropertyChanged(nameof(IsNotesTabActive));
                OnPropertyChanged(nameof(IsInboxTabActive));
                OnPropertyChanged(nameof(IsCalendarTabActive));
                OnPropertyChanged(nameof(IsAnalyticsTabActive));
                OnPropertyChanged(nameof(IsBackupTabActive));
                UpdateStatus();
                OnTabActivated(value);
            }
        }
    }

    public bool IsTasksTabActive => string.Equals(ActiveTab, "Tasks", StringComparison.OrdinalIgnoreCase);
    public bool IsFollowUpsTabActive => string.Equals(ActiveTab, "FollowUps", StringComparison.OrdinalIgnoreCase);
    public bool IsPlanMyDayTabActive => string.Equals(ActiveTab, "PlanMyDay", StringComparison.OrdinalIgnoreCase);
    public bool IsNotesTabActive => string.Equals(ActiveTab, "Notes", StringComparison.OrdinalIgnoreCase);
    public bool IsInboxTabActive => string.Equals(ActiveTab, "Inbox", StringComparison.OrdinalIgnoreCase);
    public bool IsCalendarTabActive => string.Equals(ActiveTab, "Calendar", StringComparison.OrdinalIgnoreCase);
    public bool IsAnalyticsTabActive => string.Equals(ActiveTab, "Analytics", StringComparison.OrdinalIgnoreCase);
    public bool IsBackupTabActive => string.Equals(ActiveTab, "Backup", StringComparison.OrdinalIgnoreCase);

    public string GlobalSearch
    {
        get => _globalSearch;
        set
        {
            if (SetProperty(ref _globalSearch, value))
            {
                ApplySearch(value);
            }
        }
    }

    public string StatusText
    {
        get => _statusText;
        set => SetProperty(ref _statusText, value);
    }

    public ICommand NavigateToTasksCommand { get; }
    public ICommand NavigateToFollowUpsCommand { get; }
    public ICommand NavigateToPlanMyDayCommand { get; }
    public ICommand NavigateToNotesCommand { get; }
    public ICommand NavigateToInboxCommand { get; }
    public ICommand NavigateToCalendarCommand { get; }
    public ICommand NavigateToAnalyticsCommand { get; }
    public ICommand NavigateToBackupCommand { get; }
    public ICommand QuickCreateCommand { get; }
    public ICommand DeleteSelectedCommand { get; }
    public ICommand ToggleSelectedCommand { get; }
    public ICommand ClearSearchCommand { get; }

    public MainViewModel(
        TasksViewModel tasksVm,
        NotesViewModel notesVm,
        BackupViewModel backupVm,
        FollowUpsViewModel? followUpsVm = null,
        PlanMyDayViewModel? planMyDayVm = null,
        InboxViewModel? inboxVm = null,
        CalendarViewModel? calendarVm = null,
        AnalyticsViewModel? analyticsVm = null,
        ThemeViewModel? themeVm = null)
    {
        TasksVM = tasksVm;
        NotesVM = notesVm;
        BackupVM = backupVm;

        FollowUpsVM = followUpsVm ?? new FollowUpsViewModel(new Repositories.FollowUpRepository(Data.DatabaseConnectionFactory.CreateInMemory()), new Services.LauncherService());
        PlanMyDayVM = planMyDayVm ?? new PlanMyDayViewModel(
            new Repositories.DailyPlanRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
            new Repositories.TaskRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
            new Repositories.FollowUpRepository(Data.DatabaseConnectionFactory.CreateInMemory()));
        InboxVM = inboxVm ?? new InboxViewModel(
            new Repositories.InboxRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
            new Services.InboxTriageService(
                new Repositories.InboxRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
                new Repositories.TaskRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
                new Repositories.NoteRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
                new Repositories.FollowUpRepository(Data.DatabaseConnectionFactory.CreateInMemory())));
        CalendarVM = calendarVm ?? new CalendarViewModel(
            new Repositories.TaskRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
            new Repositories.FollowUpRepository(Data.DatabaseConnectionFactory.CreateInMemory()));
        AnalyticsVM = analyticsVm ?? new AnalyticsViewModel(
            new Repositories.TaskRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
            new Repositories.NoteRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
            new Repositories.FollowUpRepository(Data.DatabaseConnectionFactory.CreateInMemory()),
            new Repositories.InboxRepository(Data.DatabaseConnectionFactory.CreateInMemory()));
        ThemeVM = themeVm ?? new ThemeViewModel();

        NavigateToTasksCommand = new RelayCommand(() => ActiveTab = "Tasks");
        NavigateToFollowUpsCommand = new RelayCommand(() => ActiveTab = "FollowUps");
        NavigateToPlanMyDayCommand = new RelayCommand(() => ActiveTab = "PlanMyDay");
        NavigateToNotesCommand = new RelayCommand(() => ActiveTab = "Notes");
        NavigateToInboxCommand = new RelayCommand(() => ActiveTab = "Inbox");
        NavigateToCalendarCommand = new RelayCommand(() => ActiveTab = "Calendar");
        NavigateToAnalyticsCommand = new RelayCommand(() => ActiveTab = "Analytics");
        NavigateToBackupCommand = new RelayCommand(() => ActiveTab = "Backup");

        QuickCreateCommand = new RelayCommand(() =>
        {
            if (IsTasksTabActive)
            {
                TasksVM.IsCreatePanelVisible = true;
            }
            else if (IsFollowUpsTabActive)
            {
                FollowUpsVM.IsCreatePanelVisible = true;
            }
            else if (IsNotesTabActive)
            {
                NotesVM.IsCreatePanelVisible = true;
            }
        });

        DeleteSelectedCommand = new RelayCommand(async () =>
        {
            if (IsTasksTabActive && TasksVM.SelectedTask != null)
            {
                await TasksVM.DeleteTaskAsync(TasksVM.SelectedTask);
            }
            else if (IsFollowUpsTabActive && FollowUpsVM.SelectedFollowUp != null)
            {
                await FollowUpsVM.DeleteAsync();
            }
            else if (IsNotesTabActive && NotesVM.SelectedNote != null)
            {
                await NotesVM.DeleteNoteAsync(NotesVM.SelectedNote);
            }
            else if (IsInboxTabActive && InboxVM.SelectedCapture != null)
            {
                await InboxVM.DeleteAsync(InboxVM.SelectedCapture);
            }
        });

        ToggleSelectedCommand = new RelayCommand(async () =>
        {
            if (IsTasksTabActive && TasksVM.SelectedTask != null)
            {
                await TasksVM.ToggleCompleteAsync(TasksVM.SelectedTask);
            }
            else if (IsFollowUpsTabActive && FollowUpsVM.SelectedFollowUp != null)
            {
                await FollowUpsVM.CompleteOccurrenceAsync();
            }
        });

        ClearSearchCommand = new RelayCommand(() => GlobalSearch = string.Empty);

        BackupVM.OnDataRestored += () =>
        {
            _ = TasksVM.LoadTasksAsync();
            _ = NotesVM.LoadNotesAsync();
            _ = FollowUpsVM.LoadAsync();
            _ = InboxVM.LoadAsync();
            _ = AnalyticsVM.RefreshMetricsAsync();
        };

        UpdateStatus();
    }

    private void ApplySearch(string query)
    {
        if (IsTasksTabActive)
        {
            TasksVM.SearchQuery = query;
        }
        else if (IsFollowUpsTabActive)
        {
            FollowUpsVM.SearchText = query;
        }
        else if (IsNotesTabActive)
        {
            NotesVM.SearchQuery = query;
        }
        else if (IsInboxTabActive)
        {
            InboxVM.SearchQuery = query;
        }
    }

    private void OnTabActivated(string tab)
    {
        if (string.Equals(tab, "FollowUps", StringComparison.OrdinalIgnoreCase))
        {
            _ = FollowUpsVM.LoadAsync();
        }
        else if (string.Equals(tab, "PlanMyDay", StringComparison.OrdinalIgnoreCase))
        {
            _ = PlanMyDayVM.InitializeAsync();
        }
        else if (string.Equals(tab, "Inbox", StringComparison.OrdinalIgnoreCase))
        {
            _ = InboxVM.LoadAsync();
        }
        else if (string.Equals(tab, "Calendar", StringComparison.OrdinalIgnoreCase))
        {
            _ = CalendarVM.RefreshCalendarAsync();
        }
        else if (string.Equals(tab, "Analytics", StringComparison.OrdinalIgnoreCase))
        {
            _ = AnalyticsVM.RefreshMetricsAsync();
        }
    }

    private void UpdateStatus()
    {
        StatusText = $"{ActiveTab} active | Ctrl+1..8: Tabs | Ctrl+N: New | Ctrl+F: Search";
    }

    public async Task InitializeAsync()
    {
        await TasksVM.LoadTasksAsync();
        await NotesVM.LoadNotesAsync();
        try
        {
            await FollowUpsVM.LoadAsync();
            await InboxVM.LoadAsync();
            await AnalyticsVM.RefreshMetricsAsync();
        }
        catch
        {
            // Ignore unmigrated test stub databases
        }
    }
}
