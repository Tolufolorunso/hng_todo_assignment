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

        // Verify all core and differentiated tables exist
        var requiredTables = new[] { "tasks", "notes", "followups", "followup_occurrences", "daily_plans", "inbox_captures", "task_orders" };
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
        Assert.Equal(2, count);
    }
}
