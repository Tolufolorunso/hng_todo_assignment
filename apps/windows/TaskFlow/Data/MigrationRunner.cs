using System;
using System.Collections.Generic;
using Microsoft.Data.Sqlite;

namespace TaskFlow.Data;

public class MigrationRunner
{
    private readonly DatabaseConnectionFactory _connectionFactory;

    public MigrationRunner(DatabaseConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public void RunMigrations(SqliteConnection connection)
    {
        bool wasClosed = connection.State == System.Data.ConnectionState.Closed;
        if (wasClosed)
        {
            connection.Open();
        }

        using (var pragmaCmd = connection.CreateCommand())
        {
            pragmaCmd.CommandText = "PRAGMA foreign_keys = ON;";
            pragmaCmd.ExecuteNonQuery();
        }

        using (var initCmd = connection.CreateCommand())
        {
            initCmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS __migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    applied_at TEXT NOT NULL
                );";
            initCmd.ExecuteNonQuery();
        }

        var appliedMigrations = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using (var selectCmd = connection.CreateCommand())
        {
            selectCmd.CommandText = "SELECT name FROM __migrations;";
            using var reader = selectCmd.ExecuteReader();
            while (reader.Read())
            {
                appliedMigrations.Add(reader.GetString(0));
            }
        }

        var migrations = GetMigrations();
        foreach (var migration in migrations)
        {
            if (appliedMigrations.Contains(migration.Name))
            {
                continue;
            }

            using var transaction = connection.BeginTransaction();
            try
            {
                using var migrateCmd = connection.CreateCommand();
                migrateCmd.Transaction = transaction;
                migrateCmd.CommandText = migration.Sql;
                migrateCmd.ExecuteNonQuery();

                using var recordCmd = connection.CreateCommand();
                recordCmd.Transaction = transaction;
                recordCmd.CommandText = "INSERT INTO __migrations (name, applied_at) VALUES (@name, @appliedAt);";
                recordCmd.Parameters.AddWithValue("@name", migration.Name);
                recordCmd.Parameters.AddWithValue("@appliedAt", DateTime.UtcNow.ToString("O"));
                recordCmd.ExecuteNonQuery();

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
    }

    private static IReadOnlyList<(string Name, string Sql)> GetMigrations()
    {
        return new List<(string Name, string Sql)>
        {
            (
                "001_InitialSchema",
                @"
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    completed INTEGER NOT NULL DEFAULT 0,
                    completed_at TEXT,
                    priority TEXT NOT NULL DEFAULT 'medium',
                    due_date TEXT,
                    category TEXT,
                    estimated_minutes INTEGER,
                    source_note_id TEXT,
                    source_excerpt TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
                CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
                CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

                CREATE TABLE IF NOT EXISTS notes (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    body TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
                "
            ),
            (
                "002_DifferentiatedFeatures",
                @"
                CREATE TABLE IF NOT EXISTS followups (
                    id TEXT PRIMARY KEY,
                    person_name TEXT NOT NULL,
                    commitment TEXT NOT NULL,
                    details TEXT,
                    due_at TEXT NOT NULL,
                    time_zone TEXT NOT NULL DEFAULT 'UTC',
                    email_address TEXT,
                    phone_number TEXT,
                    whatsapp_number TEXT,
                    preferred_action TEXT,
                    recurrence_json TEXT,
                    status TEXT NOT NULL DEFAULT 'open',
                    source_note_id TEXT,
                    source_excerpt TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_followups_due_at ON followups(due_at);
                CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
                CREATE INDEX IF NOT EXISTS idx_followups_updated_at ON followups(updated_at);

                CREATE TABLE IF NOT EXISTS followup_occurrences (
                    id TEXT PRIMARY KEY,
                    followup_id TEXT NOT NULL,
                    scheduled_due_time TEXT NOT NULL,
                    outcome TEXT NOT NULL DEFAULT 'open',
                    resolution_time TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(followup_id) REFERENCES followups(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_followup_occ_followup_id ON followup_occurrences(followup_id);
                CREATE INDEX IF NOT EXISTS idx_followup_occ_due ON followup_occurrences(scheduled_due_time);

                CREATE TABLE IF NOT EXISTS daily_plans (
                    id TEXT PRIMARY KEY,
                    local_date TEXT NOT NULL UNIQUE,
                    time_zone TEXT NOT NULL DEFAULT 'UTC',
                    available_minutes INTEGER NOT NULL,
                    items_json TEXT NOT NULL DEFAULT '[]',
                    accepted_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_daily_plans_local_date ON daily_plans(local_date);

                CREATE TABLE IF NOT EXISTS inbox_captures (
                    id TEXT PRIMARY KEY,
                    text TEXT NOT NULL,
                    shared_url TEXT,
                    source_app_label TEXT,
                    state TEXT NOT NULL DEFAULT 'pending',
                    result_entity_type TEXT,
                    result_entity_id TEXT,
                    processed_at TEXT,
                    captured_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_inbox_captures_state ON inbox_captures(state);
                CREATE INDEX IF NOT EXISTS idx_inbox_captures_captured_at ON inbox_captures(captured_at);

                CREATE TABLE IF NOT EXISTS task_orders (
                    id TEXT PRIMARY KEY,
                    ordered_ids_json TEXT NOT NULL DEFAULT '[]',
                    updated_at TEXT NOT NULL
                );
                "
            )
        };
    }
}
