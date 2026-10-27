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
    public void MigrationRunner_AppliesInitialSchemaSuccessfully()
    {
        var factory = DatabaseConnectionFactory.CreateInMemory();
        using var connection = factory.CreateConnection();
        connection.Open();

        var runner = new MigrationRunner(factory);
        runner.RunMigrations(connection);

        // Verify __migrations table has 001_InitialSchema
        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM __migrations WHERE name = '001_InitialSchema';";
        long count = (long)(cmd.ExecuteScalar() ?? 0);
        Assert.Equal(1, count);

        // Verify tasks table exists
        cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='tasks';";
        long taskTableCount = (long)(cmd.ExecuteScalar() ?? 0);
        Assert.Equal(1, taskTableCount);

        // Verify notes table exists
        cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notes';";
        long noteTableCount = (long)(cmd.ExecuteScalar() ?? 0);
        Assert.Equal(1, noteTableCount);
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
        Assert.Equal(1, count);
    }
}
