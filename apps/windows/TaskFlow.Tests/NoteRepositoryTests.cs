using System;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using Xunit;

namespace TaskFlow.Tests;

public class NoteRepositoryTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly NoteRepository _repository;

    public NoteRepositoryTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _repository = new NoteRepository(_factory);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task CreateAsync_And_GetByIdAsync_StoresAndRetrievesNote()
    {
        var note = new NoteItem
        {
            Title = "Sprint Planning Architecture",
            Body = "Key decisions on WPF desktop architecture and SQLite local store."
        };

        var created = await _repository.CreateAsync(note);
        Assert.NotNull(created.Id);
        Assert.Equal("Sprint Planning Architecture", created.Title);
        Assert.Equal("Key decisions on WPF desktop architecture and SQLite local store.", created.Body);
        Assert.NotNull(created.CreatedAt);
        Assert.NotNull(created.UpdatedAt);

        var retrieved = await _repository.GetByIdAsync(created.Id);
        Assert.NotNull(retrieved);
        Assert.Equal(created.Id, retrieved.Id);
        Assert.Equal(note.Title, retrieved.Title);
        Assert.Equal(note.Body, retrieved.Body);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotFound()
    {
        var note = await _repository.GetByIdAsync("non-existent-note-id");
        Assert.Null(note);
    }

    [Fact]
    public async Task ListAsync_RetrievesAllAndFiltersBySearch()
    {
        await _repository.CreateAsync(new NoteItem { Title = "Architecture notes", Body = "WPF MVVM pattern details" });
        await _repository.CreateAsync(new NoteItem { Title = "Weekly summary", Body = "Shipped mobile haptics and Android package" });
        await _repository.CreateAsync(new NoteItem { Title = "Meeting log", Body = "Client review discussion" });

        var allNotes = await _repository.ListAsync();
        Assert.Equal(3, allNotes.Count);

        var searchTitle = await _repository.ListAsync(search: "weekly");
        Assert.Single(searchTitle);
        Assert.Equal("Weekly summary", searchTitle[0].Title);

        var searchBody = await _repository.ListAsync(search: "MVVM");
        Assert.Single(searchBody);
        Assert.Equal("Architecture notes", searchBody[0].Title);
    }

    [Fact]
    public async Task UpdateAsync_ModifiesNoteDetails()
    {
        var note = await _repository.CreateAsync(new NoteItem { Title = "Draft idea", Body = "Initial thoughts" });

        note.Title = "Refined idea";
        note.Body = "Detailed explanation of the concept";

        var updated = await _repository.UpdateAsync(note);
        Assert.Equal("Refined idea", updated.Title);
        Assert.Equal("Detailed explanation of the concept", updated.Body);

        var retrieved = await _repository.GetByIdAsync(note.Id);
        Assert.NotNull(retrieved);
        Assert.Equal("Refined idea", retrieved.Title);
        Assert.Equal("Detailed explanation of the concept", retrieved.Body);
    }

    [Fact]
    public async Task DeleteAsync_RemovesNote()
    {
        var note = await _repository.CreateAsync(new NoteItem { Title = "Note to delete", Body = "Temporary text" });

        bool deleted = await _repository.DeleteAsync(note.Id);
        Assert.True(deleted);

        var retrieved = await _repository.GetByIdAsync(note.Id);
        Assert.Null(retrieved);

        bool deletedAgain = await _repository.DeleteAsync(note.Id);
        Assert.False(deletedAgain);
    }
}
