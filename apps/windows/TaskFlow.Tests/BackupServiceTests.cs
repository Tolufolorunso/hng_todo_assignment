using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class BackupServiceTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly TaskRepository _taskRepository;
    private readonly NoteRepository _noteRepository;
    private readonly BackupService _backupService;

    public BackupServiceTests()
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
    public async Task ExportJsonAsync_ProducesValidUniversalFormat()
    {
        await _taskRepository.CreateAsync(new TaskItem
        {
            Id = "tsk_export_1",
            Title = "Task for export",
            Description = "Checking universal export format",
            Priority = "high",
            Category = "work"
        });

        await _noteRepository.CreateAsync(new NoteItem
        {
            Id = "not_export_1",
            Title = "Note for export",
            Body = "Universal export content"
        });

        string json = await _backupService.ExportJsonAsync();
        Assert.NotNull(json);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.Equal(2, root.GetProperty("version").GetInt32());
        Assert.Equal("taskflow-windows", root.GetProperty("origin").GetString());
        Assert.True(root.TryGetProperty("exportedAt", out var exportedAt));
        Assert.NotNull(exportedAt.GetString());

        var tasks = root.GetProperty("tasks");
        Assert.Equal(1, tasks.GetArrayLength());
        Assert.Equal("tsk_export_1", tasks[0].GetProperty("id").GetString());
        Assert.Equal("Task for export", tasks[0].GetProperty("title").GetString());

        var notes = root.GetProperty("notes");
        Assert.Equal(1, notes.GetArrayLength());
        Assert.Equal("not_export_1", notes[0].GetProperty("id").GetString());
        Assert.Equal("Note for export", notes[0].GetProperty("title").GetString());
    }

    [Fact]
    public async Task ImportJsonAsync_MergeMode_InsertsNewAndUpdatesNewer()
    {
        await _taskRepository.CreateAsync(new TaskItem
        {
            Id = "task_m1",
            Title = "Original task title",
            UpdatedAt = "2026-10-01T00:00:00.000Z"
        });

        string importPayload = @"
        {
            ""version"": 2,
            ""tasks"": [
                {
                    ""id"": ""task_m1"",
                    ""title"": ""Updated task title"",
                    ""updatedAt"": ""2026-10-15T12:00:00.000Z""
                },
                {
                    ""id"": ""task_m2"",
                    ""title"": ""Newly inserted task"",
                    ""category"": ""study"",
                    ""updatedAt"": ""2026-10-10T00:00:00.000Z""
                }
            ],
            ""notes"": [
                {
                    ""id"": ""note_m1"",
                    ""title"": ""Imported note"",
                    ""body"": ""Note body"",
                    ""updatedAt"": ""2026-10-10T00:00:00.000Z""
                }
            ]
        }";

        var result = await _backupService.ImportJsonAsync(importPayload, "merge");
        Assert.Equal("merge", result.Mode);
        Assert.Equal(1, result.TasksImported);
        Assert.Equal(1, result.TasksUpdated);
        Assert.Equal(1, result.NotesImported);

        var updatedTask = await _taskRepository.GetByIdAsync("task_m1");
        Assert.NotNull(updatedTask);
        Assert.Equal("Updated task title", updatedTask.Title);

        var newTask = await _taskRepository.GetByIdAsync("task_m2");
        Assert.NotNull(newTask);
        Assert.Equal("Newly inserted task", newTask.Title);

        // Attempt importing an older version of task_m1 - should not overwrite
        string olderPayload = @"
        {
            ""version"": 2,
            ""tasks"": [
                {
                    ""id"": ""task_m1"",
                    ""title"": ""Stale task title"",
                    ""updatedAt"": ""2026-09-01T00:00:00.000Z""
                }
            ]
        }";

        var olderResult = await _backupService.ImportJsonAsync(olderPayload, "merge");
        Assert.Equal(0, olderResult.TasksUpdated);

        var preservedTask = await _taskRepository.GetByIdAsync("task_m1");
        Assert.NotNull(preservedTask);
        Assert.Equal("Updated task title", preservedTask.Title);
    }

    [Fact]
    public async Task ImportJsonAsync_ReplaceMode_ReplacesExistingData()
    {
        await _taskRepository.CreateAsync(new TaskItem { Id = "old_task_1", Title = "Old task" });
        await _noteRepository.CreateAsync(new NoteItem { Id = "old_note_1", Title = "Old note" });

        string replacePayload = @"
        {
            ""version"": 2,
            ""tasks"": [
                {
                    ""id"": ""fresh_task_1"",
                    ""title"": ""Fresh replaced task"",
                    ""priority"": ""urgent""
                }
            ],
            ""notes"": [
                {
                    ""id"": ""fresh_note_1"",
                    ""title"": ""Fresh replaced note"",
                    ""body"": ""Fresh content""
                }
            ]
        }";

        var result = await _backupService.ImportJsonAsync(replacePayload, "replace");
        Assert.Equal("replace", result.Mode);
        Assert.Equal(1, result.TasksImported);
        Assert.Equal(1, result.NotesImported);

        // Old records should no longer exist
        Assert.Null(await _taskRepository.GetByIdAsync("old_task_1"));
        Assert.Null(await _noteRepository.GetByIdAsync("old_note_1"));

        // New records should be present
        Assert.NotNull(await _taskRepository.GetByIdAsync("fresh_task_1"));
        Assert.NotNull(await _noteRepository.GetByIdAsync("fresh_note_1"));
    }

    [Fact]
    public async Task ImportJsonAsync_SupportsNestedDataFormat()
    {
        string nestedPayload = @"
        {
            ""version"": 2,
            ""app"": ""TaskFlow"",
            ""data"": {
                ""tasks"": [
                    { ""id"": ""web_task_1"", ""title"": ""Web imported task"" }
                ],
                ""notes"": [
                    { ""id"": ""web_note_1"", ""title"": ""Web imported note"", ""body"": ""From web export"" }
                ]
            }
        }";

        var result = await _backupService.ImportJsonAsync(nestedPayload, "merge");
        Assert.Equal(1, result.TasksImported);
        Assert.Equal(1, result.NotesImported);

        var task = await _taskRepository.GetByIdAsync("web_task_1");
        Assert.NotNull(task);
        Assert.Equal("Web imported task", task.Title);
    }

    [Fact]
    public async Task ImportJsonAsync_ThrowsOnCorruptJson()
    {
        await Assert.ThrowsAsync<FormatException>(async () =>
        {
            await _backupService.ImportJsonAsync("{ not valid json at all }");
        });
    }

    [Fact]
    public async Task ImportJsonAsync_ThrowsWhenNoValidEntitiesFound()
    {
        string emptyPayload = @"{ ""version"": 2, ""tasks"": [], ""notes"": [] }";
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await _backupService.ImportJsonAsync(emptyPayload);
        });
    }

    [Fact]
    public async Task ImportJsonAsync_SatisfiesSharedCrossPlatformBackupFixtures()
    {
        string? current = AppContext.BaseDirectory;
        string? root = null;
        for (int i = 0; i < 12 && current != null; i++)
        {
            var candidate = System.IO.Path.Combine(current, "fixtures", "backups", "v1-valid.json");
            if (System.IO.File.Exists(candidate))
            {
                root = current;
                break;
            }
            current = System.IO.Directory.GetParent(current)?.FullName;
        }

        if (root == null && System.IO.Directory.Exists("fixtures"))
        {
            root = System.IO.Directory.GetCurrentDirectory();
        }

        Assert.NotNull(root);

        // 1. Valid v1
        string v1Path = System.IO.Path.Combine(root!, "fixtures", "backups", "v1-valid.json");
        string v1Json = System.IO.File.ReadAllText(v1Path);
        var v1Result = await _backupService.ImportJsonAsync(v1Json, "replace");
        Assert.Equal(2, v1Result.TasksImported);
        Assert.Equal(1, v1Result.NotesImported);

        // 2. Valid v2
        string v2Path = System.IO.Path.Combine(root!, "fixtures", "backups", "v2-valid.json");
        string v2Json = System.IO.File.ReadAllText(v2Path);
        var v2Result = await _backupService.ImportJsonAsync(v2Json, "replace");
        Assert.Equal(1, v2Result.TasksImported);
        Assert.Equal(1, v2Result.NotesImported);

        // 3. Corrupted v2
        string corruptedPath = System.IO.Path.Combine(root!, "fixtures", "backups", "v2-corrupted.json");
        string corruptedJson = System.IO.File.ReadAllText(corruptedPath);
        await Assert.ThrowsAnyAsync<Exception>(async () =>
        {
            await _backupService.ImportJsonAsync(corruptedJson, "replace");
        });
    }
}
