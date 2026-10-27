using System;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using Xunit;

namespace TaskFlow.Tests;

public class TaskRepositoryTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly TaskRepository _repository;

    public TaskRepositoryTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _repository = new TaskRepository(_factory);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task CreateAsync_And_GetByIdAsync_StoresAndRetrievesTask()
    {
        var task = new TaskItem
        {
            Title = "Implement Windows desktop UI",
            Description = "WPF offline foundation and keyboard navigation",
            Priority = "high",
            Category = "work",
            DueDate = "2026-11-01T12:00:00Z",
            EstimatedMinutes = 45,
            SourceNoteId = "note-123",
            SourceExcerpt = "Reference excerpt"
        };

        var created = await _repository.CreateAsync(task);
        Assert.NotNull(created.Id);
        Assert.Equal("Implement Windows desktop UI", created.Title);
        Assert.Equal("high", created.Priority);
        Assert.Equal("work", created.Category);
        Assert.False(created.Completed);
        Assert.Null(created.CompletedAt);

        var retrieved = await _repository.GetByIdAsync(created.Id);
        Assert.NotNull(retrieved);
        Assert.Equal(created.Id, retrieved.Id);
        Assert.Equal(task.Description, retrieved.Description);
        Assert.Equal(task.DueDate, retrieved.DueDate);
        Assert.Equal(45, retrieved.EstimatedMinutes);
        Assert.Equal("note-123", retrieved.SourceNoteId);
        Assert.Equal("Reference excerpt", retrieved.SourceExcerpt);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        var task = await _repository.GetByIdAsync("non-existent-task-id");
        Assert.Null(task);
    }

    [Fact]
    public async Task ListAsync_FiltersByStatusCorrectly()
    {
        var task1 = await _repository.CreateAsync(new TaskItem { Title = "Active task", Completed = false });
        var task2 = await _repository.CreateAsync(new TaskItem { Title = "Completed task", Completed = true, CompletedAt = "2026-10-27T00:00:00Z" });

        var allTasks = await _repository.ListAsync();
        Assert.Equal(2, allTasks.Count);

        var activeTasks = await _repository.ListAsync(status: "active");
        Assert.Single(activeTasks);
        Assert.Equal(task1.Id, activeTasks[0].Id);

        var completedTasks = await _repository.ListAsync(status: "completed");
        Assert.Single(completedTasks);
        Assert.Equal(task2.Id, completedTasks[0].Id);
    }

    [Fact]
    public async Task ListAsync_FiltersByCategoryAndSearchQuery()
    {
        await _repository.CreateAsync(new TaskItem { Title = "Study algorithms", Category = "study", Description = "Binary trees" });
        await _repository.CreateAsync(new TaskItem { Title = "Buy groceries", Category = "personal", Description = "Apples and milk" });
        await _repository.CreateAsync(new TaskItem { Title = "Work on presentation", Category = "work", Description = "Quarterly review" });

        var studyTasks = await _repository.ListAsync(category: "study");
        Assert.Single(studyTasks);
        Assert.Equal("Study algorithms", studyTasks[0].Title);

        var searchResults = await _repository.ListAsync(search: "groceries");
        Assert.Single(searchResults);
        Assert.Equal("Buy groceries", searchResults[0].Title);

        var searchDescriptionResults = await _repository.ListAsync(search: "Quarterly");
        Assert.Single(searchDescriptionResults);
        Assert.Equal("Work on presentation", searchDescriptionResults[0].Title);
    }

    [Fact]
    public async Task UpdateAsync_ModifiesTaskDetails()
    {
        var task = await _repository.CreateAsync(new TaskItem { Title = "Initial title", Priority = "low" });

        task.Title = "Updated title";
        task.Priority = "urgent";
        task.Description = "Added description";

        var updated = await _repository.UpdateAsync(task);
        Assert.Equal("Updated title", updated.Title);
        Assert.Equal("urgent", updated.Priority);
        Assert.Equal("Added description", updated.Description);

        var retrieved = await _repository.GetByIdAsync(task.Id);
        Assert.NotNull(retrieved);
        Assert.Equal("Updated title", retrieved.Title);
    }

    [Fact]
    public async Task ToggleCompleteAsync_TogglesCompletionState()
    {
        var task = await _repository.CreateAsync(new TaskItem { Title = "Task to toggle" });
        Assert.False(task.Completed);
        Assert.Null(task.CompletedAt);

        var completed = await _repository.ToggleCompleteAsync(task.Id);
        Assert.True(completed.Completed);
        Assert.NotNull(completed.CompletedAt);

        var reopened = await _repository.ToggleCompleteAsync(task.Id);
        Assert.False(reopened.Completed);
        Assert.Null(reopened.CompletedAt);
    }

    [Fact]
    public async Task DeleteAsync_RemovesTask()
    {
        var task = await _repository.CreateAsync(new TaskItem { Title = "Task to delete" });

        bool deleted = await _repository.DeleteAsync(task.Id);
        Assert.True(deleted);

        var retrieved = await _repository.GetByIdAsync(task.Id);
        Assert.Null(retrieved);

        bool deletedAgain = await _repository.DeleteAsync(task.Id);
        Assert.False(deletedAgain);
    }
}
