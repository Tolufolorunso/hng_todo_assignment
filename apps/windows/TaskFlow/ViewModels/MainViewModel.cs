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

    public string ActiveTab
    {
        get => _activeTab;
        set
        {
            if (SetProperty(ref _activeTab, value))
            {
                OnPropertyChanged(nameof(IsTasksTabActive));
                OnPropertyChanged(nameof(IsNotesTabActive));
                OnPropertyChanged(nameof(IsBackupTabActive));
                UpdateStatus();
            }
        }
    }

    public bool IsTasksTabActive => string.Equals(ActiveTab, "Tasks", StringComparison.OrdinalIgnoreCase);
    public bool IsNotesTabActive => string.Equals(ActiveTab, "Notes", StringComparison.OrdinalIgnoreCase);
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
    public ICommand NavigateToNotesCommand { get; }
    public ICommand NavigateToBackupCommand { get; }
    public ICommand QuickCreateCommand { get; }
    public ICommand DeleteSelectedCommand { get; }
    public ICommand ToggleSelectedCommand { get; }
    public ICommand ClearSearchCommand { get; }

    public MainViewModel(TasksViewModel tasksVm, NotesViewModel notesVm, BackupViewModel backupVm)
    {
        TasksVM = tasksVm;
        NotesVM = notesVm;
        BackupVM = backupVm;

        NavigateToTasksCommand = new RelayCommand(() => ActiveTab = "Tasks");
        NavigateToNotesCommand = new RelayCommand(() => ActiveTab = "Notes");
        NavigateToBackupCommand = new RelayCommand(() => ActiveTab = "Backup");

        QuickCreateCommand = new RelayCommand(() =>
        {
            if (IsTasksTabActive)
            {
                TasksVM.IsCreatePanelVisible = true;
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
            else if (IsNotesTabActive && NotesVM.SelectedNote != null)
            {
                await NotesVM.DeleteNoteAsync(NotesVM.SelectedNote);
            }
        });

        ToggleSelectedCommand = new RelayCommand(async () =>
        {
            if (IsTasksTabActive && TasksVM.SelectedTask != null)
            {
                await TasksVM.ToggleCompleteAsync(TasksVM.SelectedTask);
            }
        });

        ClearSearchCommand = new RelayCommand(() => GlobalSearch = string.Empty);

        BackupVM.OnDataRestored += () =>
        {
            _ = TasksVM.LoadTasksAsync();
            _ = NotesVM.LoadNotesAsync();
        };

        UpdateStatus();
    }

    private void ApplySearch(string query)
    {
        if (IsTasksTabActive)
        {
            TasksVM.SearchQuery = query;
        }
        else if (IsNotesTabActive)
        {
            NotesVM.SearchQuery = query;
        }
    }

    private void UpdateStatus()
    {
        StatusText = $"{ActiveTab} active | Ctrl+1: Tasks | Ctrl+2: Notes | Ctrl+3: Backup | Ctrl+N: New";
    }

    public async Task InitializeAsync()
    {
        await TasksVM.LoadTasksAsync();
        await NotesVM.LoadNotesAsync();
    }
}
