using System;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using Xunit;

namespace TaskFlow.Tests;

public class DatabaseMigrationTests
{
    [Fact]
    public void DatabaseConnectionFactory_ResolvesDefaultPath()
    {
        string defaultPath = DatabaseConnectionFactory.GetDefaultFilePath();
        Assert.NotNull(defaultPath);
        Assert.Contains("TaskFlow", defaultPath);
        Assert.EndsWith("taskflow.db", defaultPath);
    }

    [Fact]
    public void MigrationRunner_AppliesMigrationsSuccessfully()
    {
        var factory = DatabaseConnectionFactory.CreateInMemory();
        using var connection = factory.CreateConnection();
        connection.Open();

        var runner = new MigrationRunner(factory);
        runner.RunMigrations(connection);

        // Verify __migrations table has both 001_InitialSchema and 002_DifferentiatedFeatures
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM __migrations WHERE name = '001_InitialSchema';";
        long m1Count = (long)(cmd.ExecuteScalar() ?? 0);
        Assert.Equal(1, m1Count);

        cmd.CommandText = "SELECT COUNT(*) FROM __migrations WHERE name = '002_DifferentiatedFeatures';";
        long m2Count = (long)(cmd.ExecuteScalar() ?? 0);
        Assert.Equal(1, m2Count);

        cmd.CommandText = "SELECT COUNT(*) FROM __migrations WHERE name = '003_SyncEngine';";
        long m3Count = (long)(cmd.ExecuteScalar() ?? 0);
        Assert.Equal(1, m3Count);

        // Verify all core, differentiated, and sync tables exist
        var requiredTables = new[]
        {
            "tasks", "notes", "followups", "followup_occurrences", "daily_plans",
            "inbox_captures", "task_orders", "outbox", "sync_cursors", "conflicts",
            "tombstones", "server_revisions"
        };
        foreach (var table in requiredTables)
        {
            cmd.CommandText = $"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{table}';";
            long tableCount = (long)(cmd.ExecuteScalar() ?? 0);
            Assert.True(tableCount == 1, $"Table {table} should exist");
        }
    }

    [Fact]
    public void MigrationRunner_IsIdempotentOnSubsequentRuns()
    {
        var factory = DatabaseConnectionFactory.CreateInMemory();
        using var connection = factory.CreateConnection();
        connection.Open();

        var runner = new MigrationRunner(factory);
        runner.RunMigrations(connection);

        // Second run should execute cleanly without error
        var exception = Record.Exception(() => runner.RunMigrations(connection));
        Assert.Null(exception);

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM __migrations;";
        long count = (long)(cmd.ExecuteScalar() ?? 0);
        Assert.Equal(3, count);
    }

    [Fact]
    public void Database_RecoversCleanlyFromAbortedTransaction()
    {
        var factory = DatabaseConnectionFactory.CreateInMemory();
        using var connection = factory.CreateConnection();
        connection.Open();

        var runner = new MigrationRunner(factory);
        runner.RunMigrations(connection);

        // Simulate failed operation in transaction
        Assert.Throws<SqliteException>(() =>
        {
            using var tx = connection.BeginTransaction();
            using var cmd = connection.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = "INSERT INTO tasks (id, title, priority, created_at, updated_at) VALUES ('abort_1', 'Rollback Task', 'high', '2026-05-01', '2026-05-01');";
            cmd.ExecuteNonQuery();

            // Intentionally provoke constraint violation or bad query
            cmd.CommandText = "INSERT INTO non_existent_table (id) VALUES ('fail');";
            cmd.ExecuteNonQuery();
            tx.Commit();
        });

        // Verify task was rolled back
        using var verifyCmd = connection.CreateCommand();
        verifyCmd.CommandText = "SELECT COUNT(*) FROM tasks WHERE id = 'abort_1';";
        long taskCount = (long)(verifyCmd.ExecuteScalar() ?? 0);
        Assert.Equal(0, taskCount);
    }
}
