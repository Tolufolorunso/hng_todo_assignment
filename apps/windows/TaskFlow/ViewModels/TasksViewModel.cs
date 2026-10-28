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

public class TasksViewModel : ObservableObject
{
    private readonly ITaskRepository _taskRepository;
    private TaskItemViewModel? _selectedTask;
    private string _statusFilter = "all";
    private string _categoryFilter = "all";
    private string _searchQuery = string.Empty;
    private bool _isLoading;
    private string? _errorMessage;

    // Modal state
    private bool _isModalOpen;
    private string _modalMode = "create";
    private string? _editingTaskId;
    private string _modalTitle = string.Empty;
    private string _modalDescription = string.Empty;
    private string _modalPriority = "medium";
    private string _modalCategory = "work";
    private string? _modalDueDate;
    private string? _modalEstimatedMinutesText;
    private string? _modalErrorMessage;

    public ObservableCollection<TaskItemViewModel> Tasks { get; } = new();

    public IReadOnlyList<string> Categories { get; } = new[] { "all", "work", "personal", "urgent", "study", "ideas" };
    public IReadOnlyList<string> Priorities { get; } = new[] { "low", "medium", "high" };
    public IReadOnlyList<string> Statuses { get; } = new[] { "all", "active", "completed" };

    public IReadOnlyList<string> ModalCategories { get; } = new[] { "work", "personal", "urgent", "study", "ideas" };
    public IReadOnlyList<string> ModalPriorities { get; } = new[] { "low", "medium", "high" };

    public TaskItemViewModel? SelectedTask
    {
        get => _selectedTask;
        set
        {
            if (SetProperty(ref _selectedTask, value))
            {
                OnPropertyChanged(nameof(HasSelectedTask));
                OnPropertyChanged(nameof(SelectedTaskModel));
            }
        }
    }

    public TaskItem? SelectedTaskModel => SelectedTask?.Model;

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

    // Modal properties
    public bool IsModalOpen
    {
        get => _isModalOpen;
        set
        {
            if (SetProperty(ref _isModalOpen, value))
            {
                OnPropertyChanged(nameof(IsCreatePanelVisible));
            }
        }
    }

    public bool IsCreatePanelVisible
    {
        get => IsModalOpen;
        set => IsModalOpen = value;
    }

    public string ModalMode
    {
        get => _modalMode;
        set
        {
            if (SetProperty(ref _modalMode, value))
            {
                OnPropertyChanged(nameof(ModalHeading));
            }
        }
    }

    public string ModalHeading => ModalMode == "create" ? "New Task" : "Edit Task";

    public string? EditingTaskId
    {
        get => _editingTaskId;
        set => SetProperty(ref _editingTaskId, value);
    }

    public string ModalTitle
    {
        get => _modalTitle;
        set
        {
            if (SetProperty(ref _modalTitle, value))
            {
                OnPropertyChanged(nameof(TitleCharCounter));
                OnPropertyChanged(nameof(NewTaskTitle));
            }
        }
    }

    public string TitleCharCounter => $"{ModalTitle?.Length ?? 0}/200";

    public string ModalDescription
    {
        get => _modalDescription;
        set
        {
            if (SetProperty(ref _modalDescription, value))
            {
                OnPropertyChanged(nameof(NewTaskDescription));
            }
        }
    }

    public string ModalPriority
    {
        get => _modalPriority;
        set
        {
            if (SetProperty(ref _modalPriority, value))
            {
                OnPropertyChanged(nameof(NewTaskPriority));
            }
        }
    }

    public string ModalCategory
    {
        get => _modalCategory;
        set
        {
            if (SetProperty(ref _modalCategory, value))
            {
                OnPropertyChanged(nameof(NewTaskCategory));
            }
        }
    }

    public string? ModalDueDate
    {
        get => _modalDueDate;
        set
        {
            if (SetProperty(ref _modalDueDate, value))
            {
                OnPropertyChanged(nameof(NewTaskDueDate));
            }
        }
    }

    public string? ModalEstimatedMinutesText
    {
        get => _modalEstimatedMinutesText;
        set => SetProperty(ref _modalEstimatedMinutesText, value);
    }

    public string? ModalErrorMessage
    {
        get => _modalErrorMessage;
        set
        {
            if (SetProperty(ref _modalErrorMessage, value))
            {
                OnPropertyChanged(nameof(HasModalError));
            }
        }
    }

    public bool HasModalError => !string.IsNullOrWhiteSpace(ModalErrorMessage);

    // Backwards-compatible aliases for legacy properties
    public string NewTaskTitle { get => ModalTitle; set => ModalTitle = value; }
    public string NewTaskDescription { get => ModalDescription; set => ModalDescription = value; }
    public string NewTaskPriority { get => ModalPriority; set => ModalPriority = value; }
    public string NewTaskCategory { get => ModalCategory; set => ModalCategory = value; }
    public string? NewTaskDueDate { get => ModalDueDate; set => ModalDueDate = value; }

    // Commands
    public ICommand LoadTasksCommand { get; }
    public ICommand OpenCreateModalCommand { get; }
    public ICommand OpenCreatePanelCommand { get; }
    public ICommand OpenEditModalCommand { get; }
    public ICommand CloseModalCommand { get; }
    public ICommand CloseCreatePanelCommand { get; }
    public ICommand SaveModalCommand { get; }
    public ICommand CreateTaskCommand { get; }
    public ICommand ToggleCompleteCommand { get; }
    public ICommand DeleteTaskCommand { get; }
    public ICommand SetStatusFilterCommand { get; }
    public ICommand SetCategoryFilterCommand { get; }

    public TasksViewModel(ITaskRepository taskRepository)
    {
        _taskRepository = taskRepository;

        LoadTasksCommand = new RelayCommand(async () => await LoadTasksAsync());
        OpenCreateModalCommand = new RelayCommand(OpenCreateModal);
        OpenCreatePanelCommand = OpenCreateModalCommand;
        OpenEditModalCommand = new RelayCommand((param) => OpenEditModal(param));
        CloseModalCommand = new RelayCommand(CloseModal);
        CloseCreatePanelCommand = CloseModalCommand;
        SaveModalCommand = new RelayCommand(async () => await SaveModalAsync());
        CreateTaskCommand = SaveModalCommand;
        ToggleCompleteCommand = new RelayCommand(async (param) => await ToggleCompleteAsync(param));
        DeleteTaskCommand = new RelayCommand(async (param) => await DeleteTaskAsync(param));
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

    public void OpenCreateModal()
    {
        ModalMode = "create";
        EditingTaskId = null;
        ModalTitle = string.Empty;
        ModalDescription = string.Empty;
        ModalCategory = "work";
        ModalPriority = "medium";
        ModalDueDate = null;
        ModalEstimatedMinutesText = null;
        ModalErrorMessage = null;
        IsModalOpen = true;
    }

    public void OpenEditModal(object? param)
    {
        TaskItem? task = param switch
        {
            TaskItemViewModel vm => vm.Model,
            TaskItem item => item,
            _ => SelectedTask?.Model
        };

        if (task == null) return;

        ModalMode = "edit";
        EditingTaskId = task.Id;
        ModalTitle = task.Title;
        ModalDescription = task.Description ?? string.Empty;
        ModalCategory = string.IsNullOrWhiteSpace(task.Category) ? "work" : task.Category;
        ModalPriority = string.IsNullOrWhiteSpace(task.Priority) ? "medium" : task.Priority;
        ModalDueDate = task.DueDate;
        ModalEstimatedMinutesText = task.EstimatedMinutes?.ToString(CultureInfo.InvariantCulture);
        ModalErrorMessage = null;
        IsModalOpen = true;
    }

    public void CloseModal()
    {
        IsModalOpen = false;
        ModalErrorMessage = null;
    }

    public async Task SaveModalAsync()
    {
        if (string.IsNullOrWhiteSpace(ModalTitle))
        {
            ModalErrorMessage = "Task title cannot be empty.";
            return;
        }

        int? estimatedMinutes = null;
        if (!string.IsNullOrWhiteSpace(ModalEstimatedMinutesText))
        {
            if (int.TryParse(ModalEstimatedMinutesText.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out int mins) && mins >= 0)
            {
                estimatedMinutes = mins;
            }
            else
            {
                ModalErrorMessage = "Effort must be a valid number of minutes.";
                return;
            }
        }

        try
        {
            if (ModalMode == "create")
            {
                var task = new TaskItem
                {
                    Title = ModalTitle.Trim(),
                    Description = ModalDescription?.Trim() ?? string.Empty,
                    Priority = ModalPriority,
                    Category = ModalCategory,
                    DueDate = string.IsNullOrWhiteSpace(ModalDueDate) ? null : ModalDueDate.Trim(),
                    EstimatedMinutes = estimatedMinutes
                };

                var created = await _taskRepository.CreateAsync(task);
                var createdVm = new TaskItemViewModel(created);
                Tasks.Insert(0, createdVm);
                SelectedTask = createdVm;
                IsModalOpen = false;
                ErrorMessage = null;
            }
            else if (ModalMode == "edit" && !string.IsNullOrEmpty(EditingTaskId))
            {
                var existingVm = Tasks.FirstOrDefault(t => t.Id == EditingTaskId);
                if (existingVm != null)
                {
                    var model = existingVm.Model;
                    model.Title = ModalTitle.Trim();
                    model.Description = ModalDescription?.Trim() ?? string.Empty;
                    model.Priority = ModalPriority;
                    model.Category = ModalCategory;
                    model.DueDate = string.IsNullOrWhiteSpace(ModalDueDate) ? null : ModalDueDate.Trim();
                    model.EstimatedMinutes = estimatedMinutes;

                    var updated = await _taskRepository.UpdateAsync(model);
                    int idx = Tasks.IndexOf(existingVm);
                    var updatedVm = new TaskItemViewModel(updated);
                    if (idx >= 0)
                    {
                        Tasks[idx] = updatedVm;
                    }
                    if (SelectedTask?.Id == updated.Id)
                    {
                        SelectedTask = updatedVm;
                    }
                }
                IsModalOpen = false;
                ErrorMessage = null;
            }
        }
        catch (Exception ex)
        {
            ModalErrorMessage = $"Failed to save task: {ex.Message}";
        }
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
                Tasks.Add(new TaskItemViewModel(item));
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
        await SaveModalAsync();
    }

    public async Task ToggleCompleteAsync(object? param)
    {
        TaskItem? task = param switch
        {
            TaskItemViewModel vm => vm.Model,
            TaskItem item => item,
            _ => SelectedTask?.Model
        };

        if (task == null) return;

        try
        {
            var updated = await _taskRepository.ToggleCompleteAsync(task.Id);
            var updatedVm = new TaskItemViewModel(updated);
            var existingVm = Tasks.FirstOrDefault(t => t.Id == task.Id);
            if (existingVm != null)
            {
                int index = Tasks.IndexOf(existingVm);
                if (index >= 0)
                {
                    Tasks[index] = updatedVm;
                    if (SelectedTask?.Id == updated.Id)
                    {
                        SelectedTask = updatedVm;
                    }
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

    public async Task DeleteTaskAsync(object? param)
    {
        TaskItem? task = param switch
        {
            TaskItemViewModel vm => vm.Model,
            TaskItem item => item,
            _ => SelectedTask?.Model
        };

        if (task == null) return;

        try
        {
            bool deleted = await _taskRepository.DeleteAsync(task.Id);
            if (deleted)
            {
                var existingVm = Tasks.FirstOrDefault(t => t.Id == task.Id);
                if (existingVm != null)
                {
                    Tasks.Remove(existingVm);
                    if (SelectedTask?.Id == task.Id)
                    {
                        SelectedTask = Tasks.FirstOrDefault();
                    }
                }
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to delete task: {ex.Message}";
        }
    }
}
