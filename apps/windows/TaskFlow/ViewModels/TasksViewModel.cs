using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.ViewModels;

public class TasksViewModel : ObservableObject
{
    private readonly ITaskRepository _taskRepository;
    private TaskItem? _selectedTask;
    private string _statusFilter = "all";
    private string _categoryFilter = "all";
    private string _searchQuery = string.Empty;
    private bool _isLoading;
    private string? _errorMessage;
    private bool _isCreatePanelVisible;

    private string _newTaskTitle = string.Empty;
    private string _newTaskDescription = string.Empty;
    private string _newTaskPriority = "medium";
    private string _newTaskCategory = "work";
    private string? _newTaskDueDate;

    public ObservableCollection<TaskItem> Tasks { get; } = new();

    public IReadOnlyList<string> Categories { get; } = new[] { "all", "work", "personal", "urgent", "study", "ideas" };
    public IReadOnlyList<string> Priorities { get; } = new[] { "low", "medium", "high", "urgent" };
    public IReadOnlyList<string> Statuses { get; } = new[] { "all", "active", "completed" };

    public TaskItem? SelectedTask
    {
        get => _selectedTask;
        set
        {
            if (SetProperty(ref _selectedTask, value))
            {
                OnPropertyChanged(nameof(HasSelectedTask));
            }
        }
    }

    public bool HasSelectedTask => SelectedTask != null;

    public string StatusFilter
    {
        get => _statusFilter;
        set
        {
            if (SetProperty(ref _statusFilter, value))
            {
                _ = LoadTasksAsync();
            }
        }
    }

    public string CategoryFilter
    {
        get => _categoryFilter;
        set
        {
            if (SetProperty(ref _categoryFilter, value))
            {
                _ = LoadTasksAsync();
            }
        }
    }

    public string SearchQuery
    {
        get => _searchQuery;
        set
        {
            if (SetProperty(ref _searchQuery, value))
            {
                _ = LoadTasksAsync();
            }
        }
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public string? ErrorMessage
    {
        get => _errorMessage;
        set
        {
            if (SetProperty(ref _errorMessage, value))
            {
                OnPropertyChanged(nameof(HasError));
            }
        }
    }

    public bool HasError => !string.IsNullOrWhiteSpace(ErrorMessage);

    public bool IsCreatePanelVisible
    {
        get => _isCreatePanelVisible;
        set => SetProperty(ref _isCreatePanelVisible, value);
    }

    public string NewTaskTitle
    {
        get => _newTaskTitle;
        set => SetProperty(ref _newTaskTitle, value);
    }

    public string NewTaskDescription
    {
        get => _newTaskDescription;
        set => SetProperty(ref _newTaskDescription, value);
    }

    public string NewTaskPriority
    {
        get => _newTaskPriority;
        set => SetProperty(ref _newTaskPriority, value);
    }

    public string NewTaskCategory
    {
        get => _newTaskCategory;
        set => SetProperty(ref _newTaskCategory, value);
    }

    public string? NewTaskDueDate
    {
        get => _newTaskDueDate;
        set => SetProperty(ref _newTaskDueDate, value);
    }

    public ICommand LoadTasksCommand { get; }
    public ICommand OpenCreatePanelCommand { get; }
    public ICommand CloseCreatePanelCommand { get; }
    public ICommand CreateTaskCommand { get; }
    public ICommand ToggleCompleteCommand { get; }
    public ICommand DeleteTaskCommand { get; }
    public ICommand SetStatusFilterCommand { get; }
    public ICommand SetCategoryFilterCommand { get; }

    public TasksViewModel(ITaskRepository taskRepository)
    {
        _taskRepository = taskRepository;

        LoadTasksCommand = new RelayCommand(async () => await LoadTasksAsync());
        OpenCreatePanelCommand = new RelayCommand(() => IsCreatePanelVisible = true);
        CloseCreatePanelCommand = new RelayCommand(() => IsCreatePanelVisible = false);
        CreateTaskCommand = new RelayCommand(async () => await CreateTaskAsync());
        ToggleCompleteCommand = new RelayCommand(async (param) => await ToggleCompleteAsync(param as TaskItem ?? SelectedTask));
        DeleteTaskCommand = new RelayCommand(async (param) => await DeleteTaskAsync(param as TaskItem ?? SelectedTask));
        SetStatusFilterCommand = new RelayCommand((param) =>
        {
            if (param is string status)
            {
                StatusFilter = status;
            }
        });
        SetCategoryFilterCommand = new RelayCommand((param) =>
        {
            if (param is string cat)
            {
                CategoryFilter = cat;
            }
        });
    }

    public async Task LoadTasksAsync()
    {
        IsLoading = true;
        ErrorMessage = null;
        try
        {
            string? status = string.Equals(StatusFilter, "all", StringComparison.OrdinalIgnoreCase) ? null : StatusFilter;
            string? category = string.Equals(CategoryFilter, "all", StringComparison.OrdinalIgnoreCase) ? null : CategoryFilter;
            string? search = string.IsNullOrWhiteSpace(SearchQuery) ? null : SearchQuery.Trim();

            var items = await _taskRepository.ListAsync(status, category, search);
            Tasks.Clear();
            foreach (var item in items)
            {
                Tasks.Add(item);
            }

            if (SelectedTask != null && !Tasks.Any(t => t.Id == SelectedTask.Id))
            {
                SelectedTask = Tasks.FirstOrDefault();
            }
            else if (SelectedTask == null && Tasks.Count > 0)
            {
                SelectedTask = Tasks[0];
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to load tasks: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task CreateTaskAsync()
    {
        if (string.IsNullOrWhiteSpace(NewTaskTitle))
        {
            ErrorMessage = "Task title cannot be empty.";
            return;
        }

        try
        {
            var task = new TaskItem
            {
                Title = NewTaskTitle.Trim(),
                Description = NewTaskDescription?.Trim() ?? string.Empty,
                Priority = NewTaskPriority,
                Category = NewTaskCategory,
                DueDate = string.IsNullOrWhiteSpace(NewTaskDueDate) ? null : NewTaskDueDate.Trim()
            };

            var created = await _taskRepository.CreateAsync(task);
            Tasks.Insert(0, created);
            SelectedTask = created;

            NewTaskTitle = string.Empty;
            NewTaskDescription = string.Empty;
            NewTaskDueDate = null;
            IsCreatePanelVisible = false;
            ErrorMessage = null;
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to create task: {ex.Message}";
        }
    }

    public async Task ToggleCompleteAsync(TaskItem? task)
    {
        if (task == null)
        {
            return;
        }

        try
        {
            var updated = await _taskRepository.ToggleCompleteAsync(task.Id);
            int index = Tasks.IndexOf(task);
            if (index >= 0)
            {
                Tasks[index] = updated;
                if (SelectedTask?.Id == updated.Id)
                {
                    SelectedTask = updated;
                }
            }

            // If active or completed filter is selected, refresh list so item respects filter
            if (!string.Equals(StatusFilter, "all", StringComparison.OrdinalIgnoreCase))
            {
                await LoadTasksAsync();
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to toggle task: {ex.Message}";
        }
    }

    public async Task DeleteTaskAsync(TaskItem? task)
    {
        if (task == null)
        {
            return;
        }

        try
        {
            bool deleted = await _taskRepository.DeleteAsync(task.Id);
            if (deleted)
            {
                Tasks.Remove(task);
                if (SelectedTask?.Id == task.Id)
                {
                    SelectedTask = Tasks.FirstOrDefault();
                }
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to delete task: {ex.Message}";
        }
    }
}
