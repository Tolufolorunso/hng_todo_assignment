using System.Threading.Tasks;

namespace TaskFlow.Services;

public record BackupImportResult(
    string Mode,
    int TasksImported,
    int NotesImported,
    int TasksUpdated,
    int NotesUpdated,
    int TotalProcessed
);

public interface IBackupService
{
    Task<string> ExportJsonAsync();
    Task<BackupImportResult> ImportJsonAsync(string json, string mode = "merge");
}
