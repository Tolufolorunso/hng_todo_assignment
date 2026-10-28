using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;
using TaskFlow.ViewModels;
using TaskFlow.Views;
using Xunit;

namespace TaskFlow.Tests;

[Collection("WpfTests")]
public class NotesViewTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly NoteRepository _noteRepository;
    private readonly TaskRepository _taskRepository;
    private readonly FollowUpRepository _followUpRepository;
    private readonly ActionableNotesService _actionableNotesService;

    public NotesViewTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _noteRepository = new NoteRepository(_factory);
        _taskRepository = new TaskRepository(_factory);
        _followUpRepository = new FollowUpRepository(_factory);
        _actionableNotesService = new ActionableNotesService(_taskRepository, _followUpRepository, _noteRepository);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public void NoteItemViewModel_InitializesPropertiesAndCalculatesMetrics()
    {
        var model = new NoteItem
        {
            Id = "note-1",
            Title = "Engineering Design Document",
            Body = "<h1>System Design</h1><p>This is a <strong>rich text</strong> document discussing architecture.</p>",
            CreatedAt = "2026-10-28T09:00:00Z",
            UpdatedAt = "2026-10-28T10:30:00Z"
        };

        var vm = new NoteItemViewModel(model);

        Assert.Equal("note-1", vm.Id);
        Assert.Equal("Engineering Design Document", vm.Title);
        Assert.Equal(model.Body, vm.Body);
        Assert.True(vm.HasBody);
        Assert.Contains("System Design", vm.Excerpt);
        Assert.DoesNotContain("<h1>", vm.Excerpt);
        Assert.True(vm.WordCount > 0);
        Assert.True(vm.ReadingTimeMinutes >= 1);
        Assert.Contains("words", vm.FormattedReadingStats);
        Assert.Contains("2026", vm.FormattedUpdatedAt);
    }

    [Fact]
    public void NoteItemViewModel_ExcerptTruncation()
    {
        string longBody = "<p>" + string.Concat(Enumerable.Repeat("Long technical sentence describing project architecture and specifications. ", 6)) + "</p>";
        var model = new NoteItem
        {
            Title = "Long Note",
            Body = longBody
        };

        var vm = new NoteItemViewModel(model);

        Assert.EndsWith("...", vm.Excerpt);
        Assert.True(vm.Excerpt.Length <= 123);
    }

    [Fact]
    public void NoteItemViewModel_EmptyBodyMetrics()
    {
        var model = new NoteItem
        {
            Title = "Empty Note",
            Body = ""
        };

        var vm = new NoteItemViewModel(model);

        Assert.False(vm.HasBody);
        Assert.Equal(string.Empty, vm.Excerpt);
        Assert.Equal(0, vm.WordCount);
        Assert.Equal("0 words", vm.FormattedReadingStats);
    }

    [Fact]
    public async Task NotesViewModel_LoadNotesAndSelection()
    {
        await _noteRepository.CreateAsync(new NoteItem { Title = "First Note", Body = "<p>First content</p>" });
        await _noteRepository.CreateAsync(new NoteItem { Title = "Second Note", Body = "<p>Second content</p>" });

        var vm = new NotesViewModel(_noteRepository, _actionableNotesService, _taskRepository, _followUpRepository);
        await vm.LoadNotesAsync();

        Assert.Equal(2, vm.Notes.Count);
        Assert.NotNull(vm.SelectedNote);
        Assert.True(vm.HasSelectedNote);
        Assert.Equal("2 notes", vm.NotesCountLabel);
    }

    [Fact]
    public async Task NotesViewModel_SearchAndClear()
    {
        await _noteRepository.CreateAsync(new NoteItem { Title = "Alpha Project", Body = "<p>Alpha specifications</p>" });
        await _noteRepository.CreateAsync(new NoteItem { Title = "Beta Project", Body = "<p>Beta guidelines</p>" });

        var vm = new NotesViewModel(_noteRepository, _actionableNotesService, _taskRepository, _followUpRepository);
        await vm.LoadNotesAsync();
        Assert.Equal(2, vm.Notes.Count);

        // Search for Alpha
        vm.SearchQuery = "Alpha";
        await vm.LoadNotesAsync();
        Assert.Single(vm.Notes);
        Assert.Equal("Alpha Project", vm.Notes[0].Title);

        // Clear search
        vm.ClearSearchCommand.Execute(null);
        Assert.Equal(string.Empty, vm.SearchQuery);
        await vm.LoadNotesAsync();
        Assert.Equal(2, vm.Notes.Count);
    }

    [Fact]
    public async Task NotesViewModel_CreateNoteValidationAndSuccess()
    {
        var vm = new NotesViewModel(_noteRepository, _actionableNotesService, _taskRepository, _followUpRepository);
        await vm.LoadNotesAsync();

        // Empty title validation
        vm.NewNoteTitle = "   ";
        await vm.CreateNoteAsync();
        Assert.Equal("Note title cannot be empty.", vm.ErrorMessage);
        Assert.True(vm.HasError);
        Assert.Empty(vm.Notes);

        // Valid creation
        vm.NewNoteTitle = "New Note Title";
        vm.NewNoteBody = "<p>Created body content.</p>";
        await vm.CreateNoteAsync();

        Assert.Null(vm.ErrorMessage);
        Assert.False(vm.HasError);
        Assert.Single(vm.Notes);
        Assert.Equal("New Note Title", vm.Notes[0].Title);
        Assert.Equal(vm.Notes[0], vm.SelectedNoteViewModel);
        Assert.Equal(string.Empty, vm.NewNoteTitle);
        Assert.Equal(string.Empty, vm.NewNoteBody);
    }

    [Fact]
    public async Task NotesViewModel_SaveAndEditSelectedNote()
    {
        var created = await _noteRepository.CreateAsync(new NoteItem
        {
            Title = "Initial Note",
            Body = "<p>Initial body</p>"
        });

        var vm = new NotesViewModel(_noteRepository, _actionableNotesService, _taskRepository, _followUpRepository);
        await vm.LoadNotesAsync();
        Assert.Single(vm.Notes);

        // Edit note
        vm.SelectedNote!.Title = "Updated Note Title";
        vm.SelectedNote.Body = "<p>Updated rich body with <strong>bold</strong> text.</p>";
        await vm.SaveSelectedNoteAsync();

        Assert.Equal("Updated Note Title", vm.SelectedNote.Title);
        Assert.Equal("<p>Updated rich body with <strong>bold</strong> text.</p>", vm.SelectedNote.Body);

        // Verify persistence
        var fromDb = await _noteRepository.GetByIdAsync(created.Id);
        Assert.NotNull(fromDb);
        Assert.Equal("Updated Note Title", fromDb.Title);
        Assert.Equal("<p>Updated rich body with <strong>bold</strong> text.</p>", fromDb.Body);
    }

    [Fact]
    public async Task NotesViewModel_DeleteNoteAndFallbackSelection()
    {
        var note1 = await _noteRepository.CreateAsync(new NoteItem { Title = "Note 1", Body = "Body 1" });
        var note2 = await _noteRepository.CreateAsync(new NoteItem { Title = "Note 2", Body = "Body 2" });

        var vm = new NotesViewModel(_noteRepository, _actionableNotesService, _taskRepository, _followUpRepository);
        await vm.LoadNotesAsync();
        Assert.Equal(2, vm.Notes.Count);

        var toDelete = vm.Notes.First(n => n.Id == note2.Id);
        vm.SelectedNoteViewModel = toDelete;

        await vm.DeleteNoteAsync(toDelete);

        Assert.Single(vm.Notes);
        Assert.Equal(note1.Id, vm.Notes[0].Id);
        Assert.Equal(note1.Id, vm.SelectedNoteViewModel?.Id);

        var deleted = await _noteRepository.GetByIdAsync(note2.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public void NotesViewModel_ReaderModeToggle()
    {
        var vm = new NotesViewModel(_noteRepository, _actionableNotesService, _taskRepository, _followUpRepository);

        Assert.False(vm.IsReaderMode);
        Assert.True(vm.IsEditorMode);
        Assert.Equal("Read Document", vm.ReaderToggleLabel);

        // Switch to reader mode
        vm.OpenReaderModeCommand.Execute(null);
        Assert.True(vm.IsReaderMode);
        Assert.False(vm.IsEditorMode);
        Assert.Equal("Edit Note", vm.ReaderToggleLabel);

        // Switch back to editor mode
        vm.OpenEditorModeCommand.Execute(null);
        Assert.False(vm.IsReaderMode);
        Assert.True(vm.IsEditorMode);

        // Toggle command
        vm.ToggleReaderModeCommand.Execute(null);
        Assert.True(vm.IsReaderMode);
        vm.ToggleReaderModeCommand.Execute(null);
        Assert.False(vm.IsReaderMode);
    }

    [Fact]
    public async Task NotesViewModel_ActionableExtraction_CreatesLinkedTaskAndFollowUp()
    {
        var note = await _noteRepository.CreateAsync(new NoteItem
        {
            Title = "Sprint Planning Note",
            Body = "<p>Action item: review PR #42 by Friday.</p>"
        });

        var vm = new NotesViewModel(_noteRepository, _actionableNotesService, _taskRepository, _followUpRepository);
        await vm.LoadNotesAsync();

        // Create Task from excerpt
        vm.ActionableExcerpt = "Review PR #42 by Friday";
        vm.ActionableTaskTitle = "Review pull request";
        vm.CreateTaskFromExcerptCommand.Execute(null);

        // Allow async task execution
        await Task.Delay(50);
        await vm.LoadLinkedActionsAsync();

        Assert.True(vm.HasActionableSuccessMessage);
        Assert.Contains("Task created", vm.ActionableSuccessMessage);
        Assert.True(vm.HasLinkedActions);
        Assert.True(vm.HasLinkedTasks);
        Assert.Single(vm.LinkedTasks);
        Assert.Equal("Review pull request", vm.LinkedTasks[0].Title);
        Assert.Equal(note.Id, vm.LinkedTasks[0].SourceNoteId);

        // Create Follow-Up from excerpt
        vm.ActionableExcerpt = "Confirm staging deployment with Sarah";
        vm.ActionablePersonName = "Sarah";
        vm.ActionableCommitment = "Verify staging deployment";
        vm.CreateFollowUpFromExcerptCommand.Execute(null);

        await Task.Delay(50);
        await vm.LoadLinkedActionsAsync();

        Assert.True(vm.HasLinkedFollowUps);
        Assert.Single(vm.LinkedFollowUps);
        Assert.Equal("Sarah", vm.LinkedFollowUps[0].PersonName);
        Assert.Equal("Verify staging deployment", vm.LinkedFollowUps[0].Commitment);
        Assert.Equal(note.Id, vm.LinkedFollowUps[0].SourceNoteId);

        // Toggle completion of linked task
        var linkedTask = vm.LinkedTasks[0];
        Assert.False(linkedTask.Completed);
        vm.ToggleLinkedTaskCommand.Execute(linkedTask);

        await Task.Delay(50);
        var updatedTask = await _taskRepository.GetByIdAsync(linkedTask.Id);
        Assert.NotNull(updatedTask);
        Assert.True(updatedTask.Completed);
    }

    [Fact]
    public void NotesView_STA_CanBeInstantiated()
    {
        ExecuteOnSta(() =>
        {
            WpfTestHelper.EnsureApplicationResources();

            var view = new NotesView();
            Assert.NotNull(view);

            var vm = new NotesViewModel(_noteRepository, _actionableNotesService, _taskRepository, _followUpRepository);
            view.DataContext = vm;
            Assert.Same(vm, view.DataContext);
        });
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

