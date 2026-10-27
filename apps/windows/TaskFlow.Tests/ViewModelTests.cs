using System;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;
using TaskFlow.ViewModels;
using Xunit;

namespace TaskFlow.Tests;

public class ViewModelTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly TaskRepository _taskRepository;
    private readonly NoteRepository _noteRepository;
    private readonly BackupService _backupService;

    public ViewModelTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _taskRepository = new TaskRepository(_factory);
        _noteRepository = new NoteRepository(_factory);
        _backupService = new BackupService(_factory, _taskRepository, _noteRepository);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task TasksViewModel_CreateAndFilterTasks()
    {
        var vm = new TasksViewModel(_taskRepository);
        await vm.LoadTasksAsync();
        Assert.Empty(vm.Tasks);

        vm.NewTaskTitle = "Write ViewModel tests";
        vm.NewTaskCategory = "work";
        vm.NewTaskPriority = "high";
        await vm.CreateTaskAsync();

        Assert.Single(vm.Tasks);
        Assert.Equal("Write ViewModel tests", vm.Tasks[0].Title);
        Assert.False(vm.Tasks[0].Completed);
        Assert.True(vm.HasSelectedTask);

        // Toggle completion
        await vm.ToggleCompleteAsync(vm.Tasks[0]);
        Assert.True(vm.Tasks[0].Completed);

        // Filter by active - should be empty now
        vm.StatusFilter = "active";
        await vm.LoadTasksAsync();
        Assert.Empty(vm.Tasks);

        // Filter by completed - should show item
        vm.StatusFilter = "completed";
        await vm.LoadTasksAsync();
        Assert.Single(vm.Tasks);

        // Delete task
        await vm.DeleteTaskAsync(vm.Tasks[0]);
        Assert.Empty(vm.Tasks);
    }

    [Fact]
    public async Task NotesViewModel_CreateEditAndSearch()
    {
        var vm = new NotesViewModel(_noteRepository);
        await vm.LoadNotesAsync();
        Assert.Empty(vm.Notes);

        vm.NewNoteTitle = "WPF Architecture";
        vm.NewNoteBody = "MVVM with xUnit test coverage";
        await vm.CreateNoteAsync();

        Assert.Single(vm.Notes);
        Assert.Equal("WPF Architecture", vm.Notes[0].Title);
        Assert.True(vm.HasSelectedNote);

        // Edit selected note
        vm.SelectedNote!.Body = "Updated architecture notes";
        await vm.SaveSelectedNoteAsync();
        Assert.Equal("Updated architecture notes", vm.SelectedNote.Body);

        // Search notes
        vm.SearchQuery = "Architecture";
        await vm.LoadNotesAsync();
        Assert.Single(vm.Notes);

        vm.SearchQuery = "NonExistentTerm";
        await vm.LoadNotesAsync();
        Assert.Empty(vm.Notes);

        // Delete note
        vm.SearchQuery = string.Empty;
        await vm.LoadNotesAsync();
        await vm.DeleteNoteAsync(vm.Notes[0]);
        Assert.Empty(vm.Notes);
    }

    [Fact]
    public async Task BackupViewModel_ExportAndImportRoundtrip()
    {
        await _taskRepository.CreateAsync(new TaskItem { Title = "Backup test task" });
        await _noteRepository.CreateAsync(new NoteItem { Title = "Backup test note" });

        var backupVm = new BackupViewModel(_backupService);
        await backupVm.ExportBackupAsync();

        Assert.NotNull(backupVm.ExportedJson);
        Assert.Contains("Backup test task", backupVm.ExportedJson);
        Assert.Contains("Backup test note", backupVm.ExportedJson);
        Assert.True(backupVm.HasStatus);

        // Test import
        bool restoredInvoked = false;
        backupVm.OnDataRestored += () => restoredInvoked = true;

        backupVm.ImportJsonText = backupVm.ExportedJson;
        backupVm.ImportMode = "merge";
        await backupVm.ImportBackupAsync();

        Assert.True(restoredInvoked);
        Assert.NotNull(backupVm.LastImportResult);
        Assert.Equal("merge", backupVm.LastImportResult.Mode);
    }

    [Fact]
    public async Task MainViewModel_CoordinatesTabsAndShortcuts()
    {
        var tasksVm = new TasksViewModel(_taskRepository);
        var notesVm = new NotesViewModel(_noteRepository);
        var backupVm = new BackupViewModel(_backupService);
        var followUpRepo = new FollowUpRepository(_factory);
        var dailyPlanRepo = new DailyPlanRepository(_factory);
        var inboxRepo = new InboxRepository(_factory);
        var launcher = new LauncherService();
        var triageService = new InboxTriageService(inboxRepo, _taskRepository, _noteRepository, followUpRepo);

        var followUpsVm = new FollowUpsViewModel(followUpRepo, launcher);
        var planMyDayVm = new PlanMyDayViewModel(dailyPlanRepo, _taskRepository, followUpRepo);
        var inboxVm = new InboxViewModel(inboxRepo, triageService);
        var calendarVm = new CalendarViewModel(_taskRepository, followUpRepo);
        var analyticsVm = new AnalyticsViewModel(_taskRepository, _noteRepository, followUpRepo, inboxRepo);
        var themeVm = new ThemeViewModel();

        var mainVm = new MainViewModel(
            tasksVm, notesVm, backupVm,
            followUpsVm, planMyDayVm, inboxVm, calendarVm, analyticsVm, themeVm);
        await mainVm.InitializeAsync();

        Assert.Equal("Tasks", mainVm.ActiveTab);
        Assert.True(mainVm.IsTasksTabActive);
        Assert.False(mainVm.IsNotesTabActive);
        Assert.False(mainVm.IsBackupTabActive);

        mainVm.NavigateToNotesCommand.Execute(null);
        Assert.Equal("Notes", mainVm.ActiveTab);
        Assert.True(mainVm.IsNotesTabActive);

        mainVm.NavigateToBackupCommand.Execute(null);
        Assert.Equal("Backup", mainVm.ActiveTab);
        Assert.True(mainVm.IsBackupTabActive);

        // Test GlobalSearch propagation
        mainVm.NavigateToTasksCommand.Execute(null);
        mainVm.GlobalSearch = "Search query test";
        Assert.Equal("Search query test", tasksVm.SearchQuery);

        // Quick create opens create panel on active tab
        Assert.False(tasksVm.IsCreatePanelVisible);
        mainVm.QuickCreateCommand.Execute(null);
        Assert.True(tasksVm.IsCreatePanelVisible);
    }
}
