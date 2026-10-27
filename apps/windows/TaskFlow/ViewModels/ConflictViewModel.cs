using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Models;
using TaskFlow.Services;

namespace TaskFlow.ViewModels;

public class ConflictViewModel : ObservableObject
{
    private readonly IConflictService _conflictService;

    private ConflictItem? _selectedConflict;
    private bool _isOpen;
    private string _localSummary = string.Empty;
    private string _serverSummary = string.Empty;

    public ObservableCollection<ConflictItem> Conflicts { get; } = new();

    public ConflictItem? SelectedConflict
    {
        get => _selectedConflict;
        set
        {
            if (SetProperty(ref _selectedConflict, value))
            {
                UpdateSummaries();
                OnPropertyChanged(nameof(HasSelectedConflict));
            }
        }
    }

    public bool HasSelectedConflict => SelectedConflict != null;
    public bool HasConflicts => Conflicts.Count > 0;

    public bool IsOpen
    {
        get => _isOpen;
        set => SetProperty(ref _isOpen, value);
    }

    public string LocalSummary
    {
        get => _localSummary;
        private set => SetProperty(ref _localSummary, value);
    }

    public string ServerSummary
    {
        get => _serverSummary;
        private set => SetProperty(ref _serverSummary, value);
    }

    public ICommand LoadConflictsCommand { get; }
    public ICommand KeepLocalCommand { get; }
    public ICommand KeepServerCommand { get; }
    public ICommand CloseCommand { get; }

    public ConflictViewModel(IConflictService conflictService)
    {
        _conflictService = conflictService;

        LoadConflictsCommand = new RelayCommand(async () => await LoadConflictsAsync());
        KeepLocalCommand = new RelayCommand(async () => await KeepLocalAsync());
        KeepServerCommand = new RelayCommand(async () => await KeepServerAsync());
        CloseCommand = new RelayCommand(() => IsOpen = false);
    }

    public async Task LoadConflictsAsync()
    {
        try
        {
            var list = await _conflictService.GetConflictsAsync();
            Conflicts.Clear();
            foreach (var item in list)
            {
                Conflicts.Add(item);
            }

            OnPropertyChanged(nameof(HasConflicts));

            if (Conflicts.Count > 0)
            {
                SelectedConflict = Conflicts[0];
                IsOpen = true;
            }
            else
            {
                SelectedConflict = null;
                IsOpen = false;
            }
        }
        catch
        {
            // Ignore failure to load conflicts
        }
    }

    public async Task KeepLocalAsync()
    {
        if (SelectedConflict == null)
        {
            return;
        }

        string id = SelectedConflict.Id;
        await _conflictService.ResolveKeepLocalAsync(id);
        await LoadConflictsAsync();
    }

    public async Task KeepServerAsync()
    {
        if (SelectedConflict == null)
        {
            return;
        }

        string id = SelectedConflict.Id;
        await _conflictService.ResolveKeepServerAsync(id);
        await LoadConflictsAsync();
    }

    private void UpdateSummaries()
    {
        if (SelectedConflict == null)
        {
            LocalSummary = string.Empty;
            ServerSummary = string.Empty;
            return;
        }

        LocalSummary = FormatJsonOrText(SelectedConflict.LocalValue);
        ServerSummary = FormatJsonOrText(SelectedConflict.ServerValue);
    }

    private static string FormatJsonOrText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return "(Empty or deleted)";
        }

        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(text);
            return System.Text.Json.JsonSerializer.Serialize(doc.RootElement, new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = true
            });
        }
        catch
        {
            return text;
        }
    }
}
