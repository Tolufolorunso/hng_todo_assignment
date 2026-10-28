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

    // Quick Add state
    private string _quickAddTitle = string.Empty;
    private bool _isQuickAddDetailsOpen;
    private string _quickAddPriority = "medium";
    private string _quickAddCategory = "work";
    private string? _quickAddDueDate;
    private string? _quickAddEstimatedMinutesText;
    private string _quickAddDescription = string.Empty;

    // Sidebar Metrics state
    private int _activeCount;
    private int _completedCount;
    private int _totalCount;
    private int _overdueCount;
    private int _remainingTodayCount;
    private int _categoryWorkCount;
    private int _categoryPersonalCount;
    private int _categoryUrgentCount;
    private int _categoryStudyCount;
    private int _categoryIdeasCount;
    private string _sortOption = "Custom";

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

    // Quick Add Properties
    public string QuickAddTitle
    {
        get => _quickAddTitle;
        set
        {
            if (SetProperty(ref _quickAddTitle, value))
            {
                OnPropertyChanged(nameof(QuickAddCharCounter));
            }
        }
    }

    public string QuickAddCharCounter => $"{QuickAddTitle?.Length ?? 0}/200";

    public bool IsQuickAddDetailsOpen
    {
        get => _isQuickAddDetailsOpen;
        set => SetProperty(ref _isQuickAddDetailsOpen, value);
    }

    public string QuickAddPriority
    {
        get => _quickAddPriority;
        set => SetProperty(ref _quickAddPriority, value);
    }

    public string QuickAddCategory
    {
        get => _quickAddCategory;
        set => SetProperty(ref _quickAddCategory, value);
    }

    public string? QuickAddDueDate
    {
        get => _quickAddDueDate;
        set => SetProperty(ref _quickAddDueDate, value);
    }

    public string? QuickAddEstimatedMinutesText
    {
        get => _quickAddEstimatedMinutesText;
        set => SetProperty(ref _quickAddEstimatedMinutesText, value);
    }

    public string QuickAddDescription
    {
        get => _quickAddDescription;
        set => SetProperty(ref _quickAddDescription, value);
    }

    // Sidebar Metrics Properties
    public string TodayDisplay => DateTime.Now.ToString("dddd d MMM", CultureInfo.InvariantCulture);
    public string RemainingTodaySummary => RemainingTodayCount == 1 ? "1 task remaining today." : $"{RemainingTodayCount} tasks remaining today.";

    public int RemainingTodayCount
    {
        get => _remainingTodayCount;
        set
        {
            if (SetProperty(ref _remainingTodayCount, value))
            {
                OnPropertyChanged(nameof(RemainingTodaySummary));
            }
        }
    }

    public int ActiveCount
    {
        get => _activeCount;
        set => SetProperty(ref _activeCount, value);
    }

    public int CompletedCount
    {
        get => _completedCount;
        set => SetProperty(ref _completedCount, value);
    }

    public int TotalCount
    {
        get => _totalCount;
        set => SetProperty(ref _totalCount, value);
    }

    public int OverdueCount
    {
        get => _overdueCount;
        set => SetProperty(ref _overdueCount, value);
    }

    public int CompletionPercent => TotalCount > 0 ? (int)Math.Round((double)CompletedCount / TotalCount * 100) : 0;

    public string TaggedCategoriesText => $"{CategoryWorkCount + CategoryPersonalCount + CategoryUrgentCount + CategoryStudyCount + CategoryIdeasCount} tagged";

    public int CategoryWorkCount
    {
        get => _categoryWorkCount;
        set { if (SetProperty(ref _categoryWorkCount, value)) OnPropertyChanged(nameof(TaggedCategoriesText)); }
    }

    public int CategoryPersonalCount
    {
        get => _categoryPersonalCount;
        set { if (SetProperty(ref _categoryPersonalCount, value)) OnPropertyChanged(nameof(TaggedCategoriesText)); }
    }

    public int CategoryUrgentCount
    {
        get => _categoryUrgentCount;
        set { if (SetProperty(ref _categoryUrgentCount, value)) OnPropertyChanged(nameof(TaggedCategoriesText)); }
    }

    public int CategoryStudyCount
    {
        get => _categoryStudyCount;
        set { if (SetProperty(ref _categoryStudyCount, value)) OnPropertyChanged(nameof(TaggedCategoriesText)); }
    }

    public int CategoryIdeasCount
    {
        get => _categoryIdeasCount;
        set { if (SetProperty(ref _categoryIdeasCount, value)) OnPropertyChanged(nameof(TaggedCategoriesText)); }
    }

    public IReadOnlyList<string> SortOptions { get; } = new[] { "Custom", "Due Date", "Priority", "Title" };

    public string SortOption
    {
        get => _sortOption;
        set
        {
            if (SetProperty(ref _sortOption, value))
            {
                _ = LoadTasksAsync();
            }
        }
    }

    public ICommand ToggleQuickAddDetailsCommand { get; }
    public ICommand SelectQuickAddCategoryCommand { get; }
    public ICommand SubmitQuickAddCommand { get; }

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
    public ICommand MoveTaskUpCommand { get; }
    public ICommand MoveTaskDownCommand { get; }
    public ICommand? NavigateToPlanMyDayCommand { get; set; }

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
        MoveTaskUpCommand = new RelayCommand((param) => MoveTaskUp(param));
        MoveTaskDownCommand = new RelayCommand((param) => MoveTaskDown(param));
        SetStatusFilterCommand = new RelayCommand((param) =>
        {
            if (param is string status)
            {
                StatusFilter = status;
            }
        });
        ToggleQuickAddDetailsCommand = new RelayCommand(() => IsQuickAddDetailsOpen = !IsQuickAddDetailsOpen);
        SelectQuickAddCategoryCommand = new RelayCommand((param) =>
        {
            if (param is string cat)
            {
                QuickAddCategory = cat;
            }
        });
        SubmitQuickAddCommand = new RelayCommand(async () => await SubmitQuickAddAsync());
        SetCategoryFilterCommand = new RelayCommand((param) =>
        {
            if (param is string cat)
            {
                CategoryFilter = cat;
            }
        });
    }

    public void MoveTaskUp(object? param)
    {
        if (param is TaskItemViewModel item)
        {
            int idx = Tasks.IndexOf(item);
            if (idx > 0)
            {
                Tasks.Move(idx, idx - 1);
            }
        }
    }

    public void MoveTaskDown(object? param)
    {
        if (param is TaskItemViewModel item)
        {
            int idx = Tasks.IndexOf(item);
            if (idx >= 0 && idx < Tasks.Count - 1)
            {
                Tasks.Move(idx, idx + 1);
            }
        }
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
            if (string.Equals(SortOption, "Due Date", StringComparison.OrdinalIgnoreCase))
            {
                items = items.OrderBy(t => string.IsNullOrWhiteSpace(t.DueDate) ? "9999" : t.DueDate).ToList();
            }
            else if (string.Equals(SortOption, "Priority", StringComparison.OrdinalIgnoreCase))
            {
                static int PriorityWeight(string p) => string.Equals(p, "high", StringComparison.OrdinalIgnoreCase) ? 1 : (string.Equals(p, "medium", StringComparison.OrdinalIgnoreCase) ? 2 : 3);
                items = items.OrderBy(t => PriorityWeight(t.Priority)).ToList();
            }
            else if (string.Equals(SortOption, "Title", StringComparison.OrdinalIgnoreCase))
            {
                items = items.OrderBy(t => t.Title, StringComparer.OrdinalIgnoreCase).ToList();
            }

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
            await UpdateSidebarMetricsAsync();
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
        await UpdateSidebarMetricsAsync();
    }

    public async Task SubmitQuickAddAsync()
    {
        if (string.IsNullOrWhiteSpace(QuickAddTitle)) return;

        int? estimatedMinutes = null;
        if (!string.IsNullOrWhiteSpace(QuickAddEstimatedMinutesText) &&
            int.TryParse(QuickAddEstimatedMinutesText.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out int mins) && mins >= 0)
        {
            estimatedMinutes = mins;
        }

        try
        {
            var task = new TaskItem
            {
                Title = QuickAddTitle.Trim(),
                Description = QuickAddDescription?.Trim() ?? string.Empty,
                Priority = QuickAddPriority,
                Category = QuickAddCategory,
                DueDate = string.IsNullOrWhiteSpace(QuickAddDueDate) ? null : QuickAddDueDate.Trim(),
                EstimatedMinutes = estimatedMinutes
            };

            var created = await _taskRepository.CreateAsync(task);
            var createdVm = new TaskItemViewModel(created);
            Tasks.Insert(0, createdVm);
            SelectedTask = createdVm;

            QuickAddTitle = string.Empty;
            QuickAddDescription = string.Empty;
            QuickAddDueDate = null;
            QuickAddEstimatedMinutesText = null;
            IsQuickAddDetailsOpen = false;

            await UpdateSidebarMetricsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to create task: {ex.Message}";
        }
    }

    public async Task UpdateSidebarMetricsAsync()
    {
        try
        {
            var all = await _taskRepository.ListAsync();
            TotalCount = all.Count;
            ActiveCount = all.Count(t => !t.Completed);
            CompletedCount = all.Count(t => t.Completed);

            var todayKey = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            RemainingTodayCount = all.Count(t => !t.Completed && !string.IsNullOrWhiteSpace(t.DueDate) && t.DueDate.StartsWith(todayKey, StringComparison.OrdinalIgnoreCase));
            OverdueCount = all.Count(t => !t.Completed && !string.IsNullOrWhiteSpace(t.DueDate) && string.Compare(t.DueDate, todayKey, StringComparison.OrdinalIgnoreCase) < 0);

            CategoryWorkCount = all.Count(t => string.Equals(t.Category, "work", StringComparison.OrdinalIgnoreCase));
            CategoryPersonalCount = all.Count(t => string.Equals(t.Category, "personal", StringComparison.OrdinalIgnoreCase));
            CategoryUrgentCount = all.Count(t => string.Equals(t.Category, "urgent", StringComparison.OrdinalIgnoreCase));
            CategoryStudyCount = all.Count(t => string.Equals(t.Category, "study", StringComparison.OrdinalIgnoreCase));
            CategoryIdeasCount = all.Count(t => string.Equals(t.Category, "ideas", StringComparison.OrdinalIgnoreCase));

            OnPropertyChanged(nameof(CompletionPercent));
            OnPropertyChanged(nameof(TodayDisplay));
            OnPropertyChanged(nameof(RemainingTodaySummary));
            OnPropertyChanged(nameof(TaggedCategoriesText));
        }
        catch
        {
            // Ignore metrics refresh failures
        }
    }
}
