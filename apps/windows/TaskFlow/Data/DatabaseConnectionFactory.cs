using System;
using System.IO;
using Microsoft.Data.Sqlite;

namespace TaskFlow.Data;

public class DatabaseConnectionFactory
{
    private readonly string _connectionString;

    public string ConnectionString => _connectionString;

    public DatabaseConnectionFactory(string? connectionString = null)
    {
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            _connectionString = connectionString;
        }
        else
        {
            string dbPath = GetDefaultFilePath();
            string? dir = Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            _connectionString = $"Data Source={dbPath};";
        }
    }

    public static string GetDefaultFilePath()
    {
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return Path.Combine(localAppData, "TaskFlow", "taskflow.db");
    }

    public static DatabaseConnectionFactory CreateInMemory(string? name = null)
    {
        string dbName = string.IsNullOrWhiteSpace(name) ? Guid.NewGuid().ToString("N") : name;
        return new DatabaseConnectionFactory($"Data Source={dbName};Mode=Memory;Cache=Shared;");
    }

    public SqliteConnection CreateConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        return connection;
    }
}
