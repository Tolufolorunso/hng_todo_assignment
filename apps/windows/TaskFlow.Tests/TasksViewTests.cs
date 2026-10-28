using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Markup;
using Microsoft.Data.Sqlite;
using TaskFlow.Controls;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.ViewModels;
using TaskFlow.Views;
using Xunit;

namespace TaskFlow.Tests;

[Collection("WpfTests")]
public class TasksViewTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly TaskRepository _taskRepository;

    public TasksViewTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _taskRepository = new TaskRepository(_factory);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public void TaskItemViewModel_InitializesPropertiesFromModel()
    {
        var model = new TaskItem
        {
            Id = "task-1",
            Title = "Complete Windows view parity",
            Description = "<p>Task description with <strong>rich text</strong>.</p>",
            Completed = false,
            Priority = "high",
            Category = "work",
            DueDate = "2026-11-15",
            EstimatedMinutes = 45,
            SourceNoteId = "note-99",
            SourceExcerpt = "Reference from architecture sync"
        };

        var vm = new TaskItemViewModel(model);

        Assert.Equal("task-1", vm.Id);
        Assert.Equal("Complete Windows view parity", vm.Title);
        Assert.Equal("<p>Task description with <strong>rich text</strong>.</p>", vm.Description);
        Assert.False(vm.Completed);
        Assert.Equal("high", vm.Priority);
        Assert.Equal("HIGH", vm.PriorityLabel);
        Assert.Equal("work", vm.Category);
        Assert.Equal("WORK", vm.CategoryLabel);
        Assert.True(vm.HasDescription);
        Assert.True(vm.HasCategory);
        Assert.True(vm.HasSourceNote);
        Assert.True(vm.HasSourceExcerpt);
        Assert.Equal("Reference from architecture sync", vm.SourceExcerpt);
        Assert.True(vm.HasEstimatedMinutes);
        Assert.Equal("⏱️ 45m", vm.FormattedEstimatedMinutes);
        Assert.False(vm.IsOverdue);
        Assert.Contains("Nov", vm.FormattedDueDate);
    }

    [Fact]
    public void TaskItemViewModel_OverdueDetection()
    {
        // Yesterday date -> Overdue
        string yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        var overdueModel = new TaskItem
        {
            Title = "Overdue task",
            DueDate = yesterday,
            Completed = false
        };
        var overdueVm = new TaskItemViewModel(overdueModel);
        Assert.True(overdueVm.IsOverdue);
        Assert.StartsWith("Overdue, ", overdueVm.FormattedDueDate);

        // Completed yesterday task -> Not overdue
        var completedYesterdayModel = new TaskItem
        {
            Title = "Completed overdue task",
            DueDate = yesterday,
            Completed = true
        };
        var completedYesterdayVm = new TaskItemViewModel(completedYesterdayModel);
        Assert.False(completedYesterdayVm.IsOverdue);
        Assert.DoesNotContain("Overdue", completedYesterdayVm.FormattedDueDate);

        // Tomorrow date -> Not overdue
        string tomorrow = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
        var futureModel = new TaskItem
        {
            Title = "Future task",
            DueDate = tomorrow,
            Completed = false
        };
        var futureVm = new TaskItemViewModel(futureModel);
        Assert.False(futureVm.IsOverdue);
        Assert.DoesNotContain("Overdue", futureVm.FormattedDueDate);

        // Null due date -> Not overdue, empty formatted date
        var noDueDateModel = new TaskItem
        {
            Title = "No due date task",
            DueDate = null
        };
        var noDueDateVm = new TaskItemViewModel(noDueDateModel);
        Assert.False(noDueDateVm.IsOverdue);
        Assert.Equal(string.Empty, noDueDateVm.FormattedDueDate);
    }

    [Fact]
    public void TaskItemViewModel_ShowMoreToggleAndDescriptionLength()
    {
        // Short description <= 180 chars
        var shortModel = new TaskItem
        {
            Title = "Short task",
            Description = "<p>Short description text under 180 characters.</p>"
        };
        var shortVm = new TaskItemViewModel(shortModel);
        Assert.False(shortVm.IsLongDescription);
        Assert.False(shortVm.IsExpanded);
        Assert.Equal("Show more", shortVm.ShowMoreText);

        // Long description > 180 chars
        string longContent = string.Concat(Enumerable.Repeat("Long detailed content about task requirements and deliverables. ", 5));
        var longModel = new TaskItem
        {
            Title = "Long task",
            Description = $"<p>{longContent}</p>"
        };
        var longVm = new TaskItemViewModel(longModel);
        Assert.True(longVm.IsLongDescription);
        Assert.False(longVm.IsExpanded);
        Assert.Equal("Show more", longVm.ShowMoreText);

        // Toggle expansion
        longVm.ToggleExpanded();
        Assert.True(longVm.IsExpanded);
        Assert.Equal("Show less", longVm.ShowMoreText);

        longVm.ToggleExpanded();
        Assert.False(longVm.IsExpanded);
        Assert.Equal("Show more", longVm.ShowMoreText);
    }

    [Fact]
    public void TasksViewModel_OpenCreateModal_SetsDefaultProperties()
    {
        var vm = new TasksViewModel(_taskRepository);
        Assert.False(vm.IsModalOpen);

        vm.OpenCreateModalCommand.Execute(null);

        Assert.True(vm.IsModalOpen);
        Assert.Equal("create", vm.ModalMode);
        Assert.Equal("New Task", vm.ModalHeading);
        Assert.Equal(string.Empty, vm.ModalTitle);
        Assert.Equal(string.Empty, vm.ModalDescription);
        Assert.Equal("work", vm.ModalCategory);
        Assert.Equal("medium", vm.ModalPriority);
        Assert.Null(vm.ModalDueDate);
        Assert.Null(vm.ModalEstimatedMinutesText);
        Assert.Null(vm.ModalErrorMessage);
        Assert.False(vm.HasModalError);
        Assert.Equal("0/200", vm.TitleCharCounter);
    }

    [Fact]
    public void TasksViewModel_OpenEditModal_PopulatesModalProperties()
    {
        var vm = new TasksViewModel(_taskRepository);
        var task = new TaskItem
        {
            Id = "edit-1",
            Title = "Review pull request",
            Description = "<p>Ensure all boundaries pass.</p>",
            Priority = "high",
            Category = "study",
            DueDate = "2026-11-20",
            EstimatedMinutes = 60
        };

        var itemVm = new TaskItemViewModel(task);
        vm.OpenEditModalCommand.Execute(itemVm);

        Assert.True(vm.IsModalOpen);
        Assert.Equal("edit", vm.ModalMode);
        Assert.Equal("Edit Task", vm.ModalHeading);
        Assert.Equal("edit-1", vm.EditingTaskId);
        Assert.Equal("Review pull request", vm.ModalTitle);
        Assert.Equal("<p>Ensure all boundaries pass.</p>", vm.ModalDescription);
        Assert.Equal("high", vm.ModalPriority);
        Assert.Equal("study", vm.ModalCategory);
        Assert.Equal("2026-11-20", vm.ModalDueDate);
        Assert.Equal("60", vm.ModalEstimatedMinutesText);
        Assert.Null(vm.ModalErrorMessage);
        Assert.False(vm.HasModalError);
    }

    [Fact]
    public void TasksViewModel_CloseModal_ResetsState()
    {
        var vm = new TasksViewModel(_taskRepository);
        vm.OpenCreateModalCommand.Execute(null);
        Assert.True(vm.IsModalOpen);

        vm.CloseModalCommand.Execute(null);

        Assert.False(vm.IsModalOpen);
        Assert.Null(vm.ModalErrorMessage);
        Assert.False(vm.HasModalError);
    }

    [Fact]
    public async Task TasksViewModel_SaveModal_ValidatesEmptyTitleAndEffort()
    {
        var vm = new TasksViewModel(_taskRepository);
        vm.OpenCreateModalCommand.Execute(null);

        // Empty title validation
        vm.ModalTitle = "   ";
        await vm.SaveModalAsync();

        Assert.True(vm.IsModalOpen);
        Assert.Equal("Task title cannot be empty.", vm.ModalErrorMessage);
        Assert.True(vm.HasModalError);
        Assert.Empty(vm.Tasks);

        // Invalid effort minutes validation
        vm.ModalTitle = "Valid task title";
        vm.ModalEstimatedMinutesText = "not-a-number";
        await vm.SaveModalAsync();

        Assert.True(vm.IsModalOpen);
        Assert.Equal("Effort must be a valid number of minutes.", vm.ModalErrorMessage);
        Assert.True(vm.HasModalError);
        Assert.Empty(vm.Tasks);
    }

    [Fact]
    public async Task TasksViewModel_SaveModal_CreatesTaskSuccessfully()
    {
        var vm = new TasksViewModel(_taskRepository);
        await vm.LoadTasksAsync();
        Assert.Empty(vm.Tasks);

        vm.OpenCreateModalCommand.Execute(null);
        vm.ModalTitle = "Implement desktop notification service";
        vm.ModalDescription = "<p>Native toast notification integration.</p>";
        vm.ModalCategory = "urgent";
        vm.ModalPriority = "high";
        vm.ModalDueDate = "2026-11-01";
        vm.ModalEstimatedMinutesText = "30";

        await vm.SaveModalAsync();

        Assert.False(vm.IsModalOpen);
        Assert.Null(vm.ModalErrorMessage);
        Assert.Single(vm.Tasks);

        var created = vm.Tasks[0];
        Assert.Equal("Implement desktop notification service", created.Title);
        Assert.Equal("<p>Native toast notification integration.</p>", created.Description);
        Assert.Equal("urgent", created.Category);
        Assert.Equal("high", created.Priority);
        Assert.Equal(30, created.EstimatedMinutes);
        Assert.Equal(created, vm.SelectedTask);
    }

    [Fact]
    public async Task TasksViewModel_SaveModal_EditsExistingTaskSuccessfully()
    {
        var initial = await _taskRepository.CreateAsync(new TaskItem
        {
            Title = "Initial title",
            Category = "work",
            Priority = "low"
        });

        var vm = new TasksViewModel(_taskRepository);
        await vm.LoadTasksAsync();
        Assert.Single(vm.Tasks);

        var existingItem = vm.Tasks[0];
        vm.OpenEditModalCommand.Execute(existingItem);

        vm.ModalTitle = "Updated title";
        vm.ModalDescription = "<p>Updated description.</p>";
        vm.ModalCategory = "ideas";
        vm.ModalPriority = "high";
        vm.ModalDueDate = "2026-12-25";
        vm.ModalEstimatedMinutesText = "90";

        await vm.SaveModalAsync();

        Assert.False(vm.IsModalOpen);
        Assert.Single(vm.Tasks);

        var updated = vm.Tasks[0];
        Assert.Equal(initial.Id, updated.Id);
        Assert.Equal("Updated title", updated.Title);
        Assert.Equal("<p>Updated description.</p>", updated.Description);
        Assert.Equal("ideas", updated.Category);
        Assert.Equal("high", updated.Priority);
        Assert.Equal("2026-12-25", updated.DueDate);
        Assert.Equal(90, updated.EstimatedMinutes);

        // Verify database persistence
        var reloaded = await _taskRepository.GetByIdAsync(initial.Id);
        Assert.NotNull(reloaded);
        Assert.Equal("Updated title", reloaded.Title);
        Assert.Equal("ideas", reloaded.Category);
        Assert.Equal("high", reloaded.Priority);
    }

    [Fact]
    public async Task TasksViewModel_ToggleComplete_FlipsCompletionAndRefreshes()
    {
        var task = await _taskRepository.CreateAsync(new TaskItem
        {
            Title = "Parity check item",
            Completed = false
        });

        var vm = new TasksViewModel(_taskRepository);
        await vm.LoadTasksAsync();
        Assert.Single(vm.Tasks);
        Assert.False(vm.Tasks[0].Completed);

        // Toggle to completed
        await vm.ToggleCompleteAsync(vm.Tasks[0]);
        Assert.True(vm.Tasks[0].Completed);

        // Verify database
        var fromDb = await _taskRepository.GetByIdAsync(task.Id);
        Assert.NotNull(fromDb);
        Assert.True(fromDb.Completed);
        Assert.NotNull(fromDb.CompletedAt);

        // Toggle back to active
        await vm.ToggleCompleteAsync(vm.Tasks[0]);
        Assert.False(vm.Tasks[0].Completed);

        var fromDbActive = await _taskRepository.GetByIdAsync(task.Id);
        Assert.NotNull(fromDbActive);
        Assert.False(fromDbActive.Completed);
    }

    [Fact]
    public async Task TasksViewModel_FilteringByCategoryAndStatus()
    {
        await _taskRepository.CreateAsync(new TaskItem { Title = "Task 1", Category = "work", Completed = false });
        await _taskRepository.CreateAsync(new TaskItem { Title = "Task 2", Category = "personal", Completed = true });
        await _taskRepository.CreateAsync(new TaskItem { Title = "Task 3", Category = "work", Completed = true });

        var vm = new TasksViewModel(_taskRepository);
        await vm.LoadTasksAsync();
        Assert.Equal(3, vm.Tasks.Count);

        // Filter by category: work
        vm.CategoryFilter = "work";
        await vm.LoadTasksAsync();
        Assert.Equal(2, vm.Tasks.Count);
        Assert.All(vm.Tasks, t => Assert.Equal("work", t.Category));

        // Filter by status: active
        vm.StatusFilter = "active";
        await vm.LoadTasksAsync();
        Assert.Single(vm.Tasks);
        Assert.Equal("Task 1", vm.Tasks[0].Title);

        // Filter by status: completed
        vm.StatusFilter = "completed";
        await vm.LoadTasksAsync();
        Assert.Single(vm.Tasks);
        Assert.Equal("Task 3", vm.Tasks[0].Title);

        // Reset category filter to all
        vm.CategoryFilter = "all";
        await vm.LoadTasksAsync();
        Assert.Equal(2, vm.Tasks.Count); // Task 2 and Task 3 are completed
    }

    [Fact]
    public async Task TasksViewModel_DeleteTask_RemovesFromCollectionAndReselects()
    {
        var task1 = await _taskRepository.CreateAsync(new TaskItem { Title = "Item to keep" });
        var task2 = await _taskRepository.CreateAsync(new TaskItem { Title = "Item to delete" });

        var vm = new TasksViewModel(_taskRepository);
        await vm.LoadTasksAsync();
        Assert.Equal(2, vm.Tasks.Count);

        var toDelete = vm.Tasks.First(t => t.Id == task2.Id);
        vm.SelectedTask = toDelete;

        await vm.DeleteTaskAsync(toDelete);

        Assert.Single(vm.Tasks);
        Assert.Equal(task1.Id, vm.Tasks[0].Id);
        Assert.Equal(task1.Id, vm.SelectedTask?.Id);

        var deleted = await _taskRepository.GetByIdAsync(task2.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public void TaskModalDialog_STA_CanBeInstantiated()
    {
        ExecuteOnSta(() =>
        {
            EnsureApplicationResources();

            var dialog = new TaskModalDialog();
            Assert.NotNull(dialog);

            var vm = new TasksViewModel(_taskRepository);
            dialog.DataContext = vm;
            Assert.Same(vm, dialog.DataContext);
        });
    }

    [Fact]
    public void TasksView_STA_CanBeInstantiated()
    {
        ExecuteOnSta(() =>
        {
            EnsureApplicationResources();

            var view = new TasksView();
            Assert.NotNull(view);

            var vm = new TasksViewModel(_taskRepository);
            view.DataContext = vm;
            Assert.Same(vm, view.DataContext);
        });
    }

    private static void EnsureApplicationResources()
    {
        WpfTestHelper.EnsureApplicationResources();
    }

    private static void ExecuteOnSta(Action action)
    {
        Exception? threadEx = null;
        var thread = new Thread(() =>
        {
            try
            {
                action();
            }
            catch (Exception ex)
            {
                threadEx = ex;
            }
        });
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        thread.Join();

        if (threadEx != null)
        {
            throw new AggregateException("STA thread execution failed", threadEx);
        }
    }
}
