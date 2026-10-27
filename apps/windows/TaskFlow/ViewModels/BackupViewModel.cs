using System;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Services;

namespace TaskFlow.ViewModels;

public class BackupViewModel : ObservableObject
{
    private readonly IBackupService _backupService;
    private string _exportedJson = string.Empty;
    private string _importJsonText = string.Empty;
    private string _importMode = "merge";
    private bool _isBusy;
    private string? _statusMessage;
    private string? _errorMessage;
    private BackupImportResult? _lastImportResult;

    public string ExportedJson
    {
        get => _exportedJson;
        set => SetProperty(ref _exportedJson, value);
    }

    public string ImportJsonText
    {
        get => _importJsonText;
        set => SetProperty(ref _importJsonText, value);
    }

    public string ImportMode
    {
        get => _importMode;
        set => SetProperty(ref _importMode, value);
    }

    public bool IsBusy
    {
        get => _isBusy;
        set => SetProperty(ref _isBusy, value);
    }

    public string? StatusMessage
    {
        get => _statusMessage;
        set
        {
            if (SetProperty(ref _statusMessage, value))
            {
                OnPropertyChanged(nameof(HasStatus));
            }
        }
    }

    public bool HasStatus => !string.IsNullOrWhiteSpace(StatusMessage);

    public string? ErrorMessage
    {
        get => _errorMessage;
        set
        {
            if (SetProperty(ref _errorMessage, value))
            {
                OnPropertyChanged(nameof(HasError));
            }
        }
    }

    public bool HasError => !string.IsNullOrWhiteSpace(ErrorMessage);

    public BackupImportResult? LastImportResult
    {
        get => _lastImportResult;
        set => SetProperty(ref _lastImportResult, value);
    }

    public ICommand ExportBackupCommand { get; }
    public ICommand ImportBackupCommand { get; }
    public ICommand SetImportModeCommand { get; }

    public event Action? OnDataRestored;

    public BackupViewModel(IBackupService backupService)
    {
        _backupService = backupService;

        ExportBackupCommand = new RelayCommand(async () => await ExportBackupAsync());
        ImportBackupCommand = new RelayCommand(async () => await ImportBackupAsync());
        SetImportModeCommand = new RelayCommand((param) =>
        {
            if (param is string mode)
            {
                ImportMode = mode;
            }
        });
    }

    public async Task ExportBackupAsync()
    {
        IsBusy = true;
        ErrorMessage = null;
        StatusMessage = null;
        try
        {
            ExportedJson = await _backupService.ExportJsonAsync();
            StatusMessage = "Backup generated successfully.";
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to export backup: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    public async Task ImportBackupAsync()
    {
        if (string.IsNullOrWhiteSpace(ImportJsonText))
        {
            ErrorMessage = "Please paste a JSON backup string to restore.";
            return;
        }

        IsBusy = true;
        ErrorMessage = null;
        StatusMessage = null;
        try
        {
            var result = await _backupService.ImportJsonAsync(ImportJsonText, ImportMode);
            LastImportResult = result;
            StatusMessage = $"Import completed ({result.Mode}): {result.TasksImported} tasks added, {result.TasksUpdated} updated, {result.NotesImported} notes added, {result.NotesUpdated} updated.";
            OnDataRestored?.Invoke();
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to import backup: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }
}
