using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public class NoteRepository : INoteRepository
{
    private readonly DatabaseConnectionFactory _connectionFactory;

    public NoteRepository(DatabaseConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<NoteItem>> ListAsync(string? search = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        if (!string.IsNullOrWhiteSpace(search))
        {
            cmd.CommandText = @"
                SELECT id, title, body, created_at, updated_at
                FROM notes
                WHERE title LIKE @search OR body LIKE @search
                ORDER BY updated_at DESC;";
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }
        else
        {
            cmd.CommandText = @"
                SELECT id, title, body, created_at, updated_at
                FROM notes
                ORDER BY updated_at DESC;";
        }

        var list = new List<NoteItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new NoteItem
            {
                Id = reader.GetString(0),
                Title = reader.GetString(1),
                Body = reader.GetString(2),
                CreatedAt = reader.GetString(3),
                UpdatedAt = reader.GetString(4)
            });
        }

        return list;
    }

    public async Task<NoteItem?> GetByIdAsync(string id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, title, body, created_at, updated_at
            FROM notes
            WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", id);

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new NoteItem
            {
                Id = reader.GetString(0),
                Title = reader.GetString(1),
                Body = reader.GetString(2),
                CreatedAt = reader.GetString(3),
                UpdatedAt = reader.GetString(4)
            };
        }

        return null;
    }

    public async Task<NoteItem> CreateAsync(NoteItem note)
    {
        if (string.IsNullOrWhiteSpace(note.Id))
        {
            note.Id = $"note_{Guid.NewGuid():N}";
        }

        string now = DateTime.UtcNow.ToString("O");
        if (string.IsNullOrWhiteSpace(note.CreatedAt))
        {
            note.CreatedAt = now;
        }
        if (string.IsNullOrWhiteSpace(note.UpdatedAt))
        {
            note.UpdatedAt = now;
        }

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO notes (id, title, body, created_at, updated_at)
            VALUES (@id, @title, @body, @created_at, @updated_at);";

        cmd.Parameters.AddWithValue("@id", note.Id);
        cmd.Parameters.AddWithValue("@title", note.Title);
        cmd.Parameters.AddWithValue("@body", note.Body ?? string.Empty);
        cmd.Parameters.AddWithValue("@created_at", note.CreatedAt);
        cmd.Parameters.AddWithValue("@updated_at", note.UpdatedAt);

        await cmd.ExecuteNonQueryAsync();
        return note;
    }

    public async Task<NoteItem> UpdateAsync(NoteItem note)
    {
        note.UpdatedAt = DateTime.UtcNow.ToString("O");

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE notes SET
                title = @title,
                body = @body,
                updated_at = @updated_at
            WHERE id = @id;";

        cmd.Parameters.AddWithValue("@id", note.Id);
        cmd.Parameters.AddWithValue("@title", note.Title);
        cmd.Parameters.AddWithValue("@body", note.Body ?? string.Empty);
        cmd.Parameters.AddWithValue("@updated_at", note.UpdatedAt);

        int rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0)
        {
            throw new InvalidOperationException($"Note with id '{note.Id}' not found.");
        }

        return note;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM notes WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", id);

        int rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }
}
