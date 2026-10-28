using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;

namespace TaskFlow.ViewModels;

public class InboxViewModel : ObservableObject
{
    private readonly IInboxRepository _inboxRepo;
    private readonly InboxTriageService _triageService;
    private readonly ILauncherService? _launcher;

    private string _fastCaptureText = string.Empty;
    private string _sharedUrl = string.Empty;
    private string _sourceAppLabel = string.Empty;
    private string _selectedState = "pending";
    private string _searchQuery = string.Empty;
    private InboxCaptureItem? _selectedCapture;

    // Triage modal / parameters
    private string _triagePersonName = string.Empty;
    private string _triageTitle = string.Empty;

    public ObservableCollection<InboxCaptureItem> Captures { get; } = new();
    public ObservableCollection<InboxCaptureItem> FilteredCaptures { get; } = new();

    public string FastCaptureText
    {
        get => _fastCaptureText;
        set => SetProperty(ref _fastCaptureText, value);
    }

    public string SharedUrl
    {
        get => _sharedUrl;
        set => SetProperty(ref _sharedUrl, value);
    }

    public string SourceAppLabel
    {
        get => _sourceAppLabel;
        set => SetProperty(ref _sourceAppLabel, value);
    }

    public string SelectedState
    {
        get => _selectedState;
        set
        {
            if (SetProperty(ref _selectedState, value))
            {
                ApplyFilter();
            }
        }
    }

    public string SearchQuery
    {
        get => _searchQuery;
        set
        {
            if (SetProperty(ref _searchQuery, value))
            {
                ApplyFilter();
            }
        }
    }

    public InboxCaptureItem? SelectedCapture
    {
        get => _selectedCapture;
        set
        {
            if (SetProperty(ref _selectedCapture, value))
            {
                OnPropertyChanged(nameof(HasSelectedCapture));
                if (value != null)
                {
                    TriageTitle = value.Text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? string.Empty;
                }
            }
        }
    }

    public bool HasSelectedCapture => SelectedCapture != null;

    public string TriagePersonName
    {
        get => _triagePersonName;
        set => SetProperty(ref _triagePersonName, value);
    }

    public string TriageTitle
    {
        get => _triageTitle;
        set => SetProperty(ref _triageTitle, value);
    }

    public int PendingCount => Captures.Count(c => string.Equals(c.State, "pending", StringComparison.OrdinalIgnoreCase));
    public int ProcessedCount => Captures.Count(c => string.Equals(c.State, "processed", StringComparison.OrdinalIgnoreCase));
    public int TotalCount => Captures.Count;

    public ICommand CaptureCommand { get; }
    public ICommand TriageToTaskCommand { get; }
    public ICommand TriageToNoteCommand { get; }
    public ICommand TriageToFollowUpCommand { get; }
    public ICommand DiscardCommand { get; }
    public ICommand DeleteCommand { get; }
    public ICommand LoadCommand { get; }
    public ICommand SetFilterStateCommand { get; }
    public ICommand LaunchUrlCommand { get; }

    public InboxViewModel(IInboxRepository inboxRepo, InboxTriageService triageService, ILauncherService? launcher = null)
    {
        _inboxRepo = inboxRepo;
        _triageService = triageService;
        _launcher = launcher;

        CaptureCommand = new RelayCommand(async () => await CaptureAsync());
        TriageToTaskCommand = new RelayCommand<InboxCaptureItem>(async item => await TriageToTaskAsync(item));
        TriageToNoteCommand = new RelayCommand<InboxCaptureItem>(async item => await TriageToNoteAsync(item));
        TriageToFollowUpCommand = new RelayCommand<InboxCaptureItem>(async item => await TriageToFollowUpAsync(item));
        DiscardCommand = new RelayCommand<InboxCaptureItem>(async item => await DiscardAsync(item));
        DeleteCommand = new RelayCommand<InboxCaptureItem>(async item => await DeleteAsync(item));
        LoadCommand = new RelayCommand(async () => await LoadAsync());
        SetFilterStateCommand = new RelayCommand<string>(state => SelectedState = state ?? "all");
        LaunchUrlCommand = new RelayCommand<string>(url =>
        {
            if (string.IsNullOrWhiteSpace(url)) return;
            if (_launcher != null)
            {
                _launcher.LaunchUrl(url);
            }
            else
            {
                try
                {
                    Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                }
                catch { }
            }
        });
    }

    public async Task LoadAsync()
    {
        var items = await _inboxRepo.ListAsync();
        Captures.Clear();
        foreach (var item in items)
        {
            Captures.Add(item);
        }
        ApplyFilter();
        NotifyCounts();
    }

    public void ApplyFilter()
    {
        var query = Captures.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(SelectedState) && !string.Equals(SelectedState, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(c => string.Equals(c.State, SelectedState, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(SearchQuery))
        {
            var term = SearchQuery.Trim();
            query = query.Where(c =>
                (c.Text != null && c.Text.Contains(term, StringComparison.OrdinalIgnoreCase)) ||
                (c.SharedUrl != null && c.SharedUrl.Contains(term, StringComparison.OrdinalIgnoreCase)));
        }

        FilteredCaptures.Clear();
        foreach (var item in query.OrderByDescending(c => c.CapturedAt))
        {
            FilteredCaptures.Add(item);
        }
    }

    public async Task CaptureAsync()
    {
        if (string.IsNullOrWhiteSpace(FastCaptureText))
        {
            return;
        }

        string raw = FastCaptureText.Trim();
        string? url = string.IsNullOrWhiteSpace(SharedUrl) ? null : SharedUrl.Trim();

        if (url == null && (raw.Contains("http://") || raw.Contains("https://")))
        {
            var match = Regex.Match(raw, @"https?://[^\s]+");
            if (match.Success)
            {
                url = match.Value;
            }
        }

        var item = await _inboxRepo.CreateAsync(
            raw,
            url,
            string.IsNullOrWhiteSpace(SourceAppLabel) ? null : SourceAppLabel.Trim());

        Captures.Insert(0, item);
        FastCaptureText = string.Empty;
        SharedUrl = string.Empty;
        SourceAppLabel = string.Empty;

        ApplyFilter();
        NotifyCounts();
        SelectedCapture = item;
    }

    public async Task TriageToTaskAsync(InboxCaptureItem? item)
    {
        var target = item ?? SelectedCapture;
        if (target == null) return;

        var result = await _triageService.TriageToTaskAsync(target.Id, title: string.IsNullOrWhiteSpace(TriageTitle) ? null : TriageTitle);
        int index = Captures.IndexOf(target);
        if (index >= 0)
        {
            Captures[index] = result.Capture;
        }
        ApplyFilter();
        NotifyCounts();
    }

    public async Task TriageToNoteAsync(InboxCaptureItem? item)
    {
        var target = item ?? SelectedCapture;
        if (target == null) return;

        var result = await _triageService.TriageToNoteAsync(target.Id, title: string.IsNullOrWhiteSpace(TriageTitle) ? null : TriageTitle);
        int index = Captures.IndexOf(target);
        if (index >= 0)
        {
            Captures[index] = result.Capture;
        }
        ApplyFilter();
        NotifyCounts();
    }

    public async Task TriageToFollowUpAsync(InboxCaptureItem? item)
    {
        var target = item ?? SelectedCapture;
        if (target == null) return;

        string person = !string.IsNullOrWhiteSpace(TriagePersonName) ? TriagePersonName : "Follow Up Contact";
        var result = await _triageService.TriageToFollowUpAsync(target.Id, personName: person);
        int index = Captures.IndexOf(target);
        if (index >= 0)
        {
            Captures[index] = result.Capture;
        }
        ApplyFilter();
        NotifyCounts();
    }

    public async Task DiscardAsync(InboxCaptureItem? item)
    {
        var target = item ?? SelectedCapture;
        if (target == null) return;

        var discarded = await _inboxRepo.MarkDiscardedAsync(target.Id);
        int index = Captures.IndexOf(target);
        if (index >= 0)
        {
            Captures[index] = discarded;
        }
        ApplyFilter();
        NotifyCounts();
    }

    public async Task DeleteAsync(InboxCaptureItem? item)
    {
        var target = item ?? SelectedCapture;
        if (target == null) return;

        await _inboxRepo.DeleteAsync(target.Id);
        Captures.Remove(target);
        if (SelectedCapture == target)
        {
            SelectedCapture = null;
        }
        ApplyFilter();
        NotifyCounts();
    }

    private void NotifyCounts()
    {
        OnPropertyChanged(nameof(PendingCount));
        OnPropertyChanged(nameof(ProcessedCount));
        OnPropertyChanged(nameof(TotalCount));
    }
}
