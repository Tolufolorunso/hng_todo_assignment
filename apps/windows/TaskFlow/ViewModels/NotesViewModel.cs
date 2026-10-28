using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;

namespace TaskFlow.ViewModels;

public class NotesViewModel : ObservableObject
{
    private readonly INoteRepository _noteRepository;
    private readonly ActionableNotesService? _actionableNotesService;
    private readonly ITaskRepository? _taskRepository;
    private readonly IFollowUpRepository? _followUpRepository;

    private NoteItemViewModel? _selectedNoteViewModel;
    private string _searchQuery = string.Empty;
    private bool _isLoading;
    private string? _errorMessage;
    private bool _isCreatePanelVisible;
    private bool _isReaderMode;

    private string _newNoteTitle = string.Empty;
    private string _newNoteBody = string.Empty;

    // Actionable notes fields
    private string _actionableExcerpt = string.Empty;
    private string _actionableTaskTitle = string.Empty;
    private string _actionablePersonName = string.Empty;
    private string _actionableCommitment = string.Empty;
    private string? _actionableSuccessMessage;

    public ObservableCollection<NoteItemViewModel> Notes { get; } = new();
    public ObservableCollection<TaskItemViewModel> LinkedTasks { get; } = new();
    public ObservableCollection<FollowUpItem> LinkedFollowUps { get; } = new();

    public NoteItemViewModel? SelectedNoteViewModel
    {
        get => _selectedNoteViewModel;
        set
        {
            if (SetProperty(ref _selectedNoteViewModel, value))
            {
                OnPropertyChanged(nameof(SelectedNote));
                OnPropertyChanged(nameof(HasSelectedNote));
                OnPropertyChanged(nameof(WordCount));
                OnPropertyChanged(nameof(ReadingTimeMinutes));
                OnPropertyChanged(nameof(FormattedReadingStats));
                OnPropertyChanged(nameof(FormattedUpdatedAt));
                ActionableExcerpt = string.Empty;
                ActionableSuccessMessage = null;
                _ = LoadLinkedActionsAsync();
            }
        }
    }

    public NoteItem? SelectedNote
    {
        get => _selectedNoteViewModel?.Model;
        set
        {
            if (value == null)
            {
                SelectedNoteViewModel = null;
            }
            else
            {
                var existing = Notes.FirstOrDefault(n => n.Id == value.Id);
                SelectedNoteViewModel = existing ?? new NoteItemViewModel(value);
            }
        }
    }

    public bool HasSelectedNote => SelectedNoteViewModel != null;

    public bool HasLinkedActions => LinkedTasks.Count > 0 || LinkedFollowUps.Count > 0;
    public bool HasLinkedTasks => LinkedTasks.Count > 0;
    public bool HasLinkedFollowUps => LinkedFollowUps.Count > 0;

    public string NotesCountLabel => Notes.Count == 1 ? "1 note" : $"{Notes.Count} notes";

    public string SearchQuery
    {
        get => _searchQuery;
        set
        {
            if (SetProperty(ref _searchQuery, value))
            {
                _ = LoadNotesAsync();
            }
        }
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

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

    public bool IsCreatePanelVisible
    {
        get => _isCreatePanelVisible;
        set => SetProperty(ref _isCreatePanelVisible, value);
    }

    public bool IsReaderMode
    {
        get => _isReaderMode;
        set
        {
            if (SetProperty(ref _isReaderMode, value))
            {
                OnPropertyChanged(nameof(IsEditorMode));
                OnPropertyChanged(nameof(ReaderToggleLabel));
            }
        }
    }

    public bool IsEditorMode => !IsReaderMode;

    public string ReaderToggleLabel => IsReaderMode ? "Edit Note" : "Read Document";

    public int WordCount => SelectedNoteViewModel?.WordCount ?? 0;

    public string ReadingTimeMinutes
    {
        get
        {
            int mins = SelectedNoteViewModel?.ReadingTimeMinutes ?? 1;
            return $"{mins} min read";
        }
    }

    public string FormattedReadingStats => SelectedNoteViewModel?.FormattedReadingStats ?? "0 words";

    public string FormattedUpdatedAt => SelectedNoteViewModel?.FormattedUpdatedAt ?? string.Empty;

    public string NewNoteTitle
    {
        get => _newNoteTitle;
        set => SetProperty(ref _newNoteTitle, value);
    }

    public string NewNoteBody
    {
        get => _newNoteBody;
        set => SetProperty(ref _newNoteBody, value);
    }

    public string ActionableExcerpt
    {
        get => _actionableExcerpt;
        set => SetProperty(ref _actionableExcerpt, value);
    }

    public string ActionableTaskTitle
    {
        get => _actionableTaskTitle;
        set => SetProperty(ref _actionableTaskTitle, value);
    }

    public string ActionablePersonName
    {
        get => _actionablePersonName;
        set => SetProperty(ref _actionablePersonName, value);
    }

    public string ActionableCommitment
    {
        get => _actionableCommitment;
        set => SetProperty(ref _actionableCommitment, value);
    }

    public string? ActionableSuccessMessage
    {
        get => _actionableSuccessMessage;
        set
        {
            if (SetProperty(ref _actionableSuccessMessage, value))
            {
                OnPropertyChanged(nameof(HasActionableSuccessMessage));
            }
        }
    }

    public bool HasActionableSuccessMessage => !string.IsNullOrWhiteSpace(ActionableSuccessMessage);

    public ICommand LoadNotesCommand { get; }
    public ICommand OpenCreatePanelCommand { get; }
    public ICommand CloseCreatePanelCommand { get; }
    public ICommand CreateNoteCommand { get; }
    public ICommand DeleteNoteCommand { get; }
    public ICommand SaveSelectedNoteCommand { get; }
    public ICommand ToggleReaderModeCommand { get; }
    public ICommand OpenReaderModeCommand { get; }
    public ICommand OpenEditorModeCommand { get; }
    public ICommand CopyNoteBodyCommand { get; }
    public ICommand PrintNoteCommand { get; }
    public ICommand CreateTaskFromExcerptCommand { get; }
    public ICommand CreateFollowUpFromExcerptCommand { get; }
    public ICommand ToggleLinkedTaskCommand { get; }
    public ICommand ClearSearchCommand { get; }

    public NotesViewModel(
        INoteRepository noteRepository,
        ActionableNotesService? actionableNotesService = null,
        ITaskRepository? taskRepository = null,
        IFollowUpRepository? followUpRepository = null)
    {
        _noteRepository = noteRepository;
        _actionableNotesService = actionableNotesService;
        _taskRepository = taskRepository;
        _followUpRepository = followUpRepository;

        LoadNotesCommand = new RelayCommand(async () => await LoadNotesAsync());
        OpenCreatePanelCommand = new RelayCommand(() =>
        {
            IsReaderMode = false;
            IsCreatePanelVisible = true;
        });
        CloseCreatePanelCommand = new RelayCommand(() => IsCreatePanelVisible = false);
        CreateNoteCommand = new RelayCommand(async () => await CreateNoteAsync());
        DeleteNoteCommand = new RelayCommand(async (param) =>
        {
            NoteItem? target = param switch
            {
                NoteItemViewModel vm => vm.Model,
                NoteItem item => item,
                _ => SelectedNote
            };
            await DeleteNoteAsync(target);
        });
        SaveSelectedNoteCommand = new RelayCommand(async () => await SaveSelectedNoteAsync());
        ToggleReaderModeCommand = new RelayCommand(() => IsReaderMode = !IsReaderMode);
        OpenReaderModeCommand = new RelayCommand((param) =>
        {
            if (param is NoteItemViewModel vm)
            {
                SelectedNoteViewModel = vm;
            }
            IsReaderMode = true;
            IsCreatePanelVisible = false;
        });
        OpenEditorModeCommand = new RelayCommand((param) =>
        {
            if (param is NoteItemViewModel vm)
            {
                SelectedNoteViewModel = vm;
            }
            IsReaderMode = false;
            IsCreatePanelVisible = false;
        });

        CopyNoteBodyCommand = new RelayCommand(() =>
        {
            if (SelectedNote != null)
            {
                try
                {
                    string plain = HtmlMetricsHelper.StripHtmlToText(SelectedNote.Body);
                    string fullText = string.IsNullOrWhiteSpace(plain)
                        ? SelectedNote.Title
                        : $"{SelectedNote.Title}\n\n{plain}";

                    Clipboard.SetText(fullText);
                    ActionableSuccessMessage = "Note copied to clipboard!";
                }
                catch
                {
                    // Ignore clipboard exceptions in non-interactive/headless environments
                }
            }
        });

        PrintNoteCommand = new RelayCommand(() =>
        {
            ActionableSuccessMessage = "Print requested.";
        });

        CreateTaskFromExcerptCommand = new RelayCommand(async () =>
        {
            if (_actionableNotesService == null || SelectedNote == null) return;
            string excerpt = !string.IsNullOrWhiteSpace(ActionableExcerpt)
                ? ActionableExcerpt
                : HtmlMetricsHelper.StripHtmlToText(SelectedNote.Body);

            if (string.IsNullOrWhiteSpace(excerpt)) return;

            await _actionableNotesService.CreateTaskFromNoteAsync(
                SelectedNote.Id,
                excerpt,
                taskTitle: string.IsNullOrWhiteSpace(ActionableTaskTitle) ? null : ActionableTaskTitle);

            ActionableSuccessMessage = "Task created from note excerpt!";
            ActionableExcerpt = string.Empty;
            ActionableTaskTitle = string.Empty;
            await LoadLinkedActionsAsync();
        });

        CreateFollowUpFromExcerptCommand = new RelayCommand(async () =>
        {
            if (_actionableNotesService == null || SelectedNote == null) return;
            string excerpt = !string.IsNullOrWhiteSpace(ActionableExcerpt)
                ? ActionableExcerpt
                : HtmlMetricsHelper.StripHtmlToText(SelectedNote.Body);

            if (string.IsNullOrWhiteSpace(excerpt)) return;

            string person = !string.IsNullOrWhiteSpace(ActionablePersonName) ? ActionablePersonName : "Note Contact";
            string commitment = !string.IsNullOrWhiteSpace(ActionableCommitment) ? ActionableCommitment : excerpt;

            await _actionableNotesService.CreateFollowUpFromNoteAsync(
                SelectedNote.Id,
                excerpt,
                personName: person,
                commitment: commitment);

            ActionableSuccessMessage = "Follow-up commitment created from note excerpt!";
            ActionableExcerpt = string.Empty;
            ActionablePersonName = string.Empty;
            ActionableCommitment = string.Empty;
            await LoadLinkedActionsAsync();
        });

        ToggleLinkedTaskCommand = new RelayCommand(async (param) =>
        {
            if (_taskRepository == null) return;
            string? taskId = param switch
            {
                TaskItemViewModel tvm => tvm.Id,
                TaskItem item => item.Id,
                string id => id,
                _ => null
            };

            if (taskId != null)
            {
                try
                {
                    var updated = await _taskRepository.ToggleCompleteAsync(taskId);
                    var existing = LinkedTasks.FirstOrDefault(t => t.Id == taskId);
                    if (existing != null)
                    {
                        int idx = LinkedTasks.IndexOf(existing);
                        if (idx >= 0)
                        {
                            LinkedTasks[idx] = new TaskItemViewModel(updated);
                        }
                    }
                }
                catch (Exception ex)
                {
                    ErrorMessage = $"Failed to update linked task: {ex.Message}";
                }
            }
        });

        ClearSearchCommand = new RelayCommand(() => SearchQuery = string.Empty);
    }

    public async Task LoadNotesAsync()
    {
        IsLoading = true;
        ErrorMessage = null;
        try
        {
            string? search = string.IsNullOrWhiteSpace(SearchQuery) ? null : SearchQuery.Trim();
            var items = await _noteRepository.ListAsync(search);

            Notes.Clear();
            foreach (var item in items)
            {
                Notes.Add(new NoteItemViewModel(item));
            }
            OnPropertyChanged(nameof(NotesCountLabel));

            if (SelectedNoteViewModel != null && !Notes.Any(n => n.Id == SelectedNoteViewModel.Id))
            {
                SelectedNoteViewModel = Notes.FirstOrDefault();
            }
            else if (SelectedNoteViewModel == null && Notes.Count > 0)
            {
                SelectedNoteViewModel = Notes[0];
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to load notes: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task LoadLinkedActionsAsync()
    {
        if (SelectedNote == null)
        {
            LinkedTasks.Clear();
            LinkedFollowUps.Clear();
            OnPropertyChanged(nameof(HasLinkedActions));
            OnPropertyChanged(nameof(HasLinkedTasks));
            OnPropertyChanged(nameof(HasLinkedFollowUps));
            return;
        }

        string noteId = SelectedNote.Id;

        if (_taskRepository != null)
        {
            try
            {
                var tasks = await _taskRepository.ListAsync();
                var matchedTasks = tasks.Where(t => t.SourceNoteId == noteId).ToList();
                LinkedTasks.Clear();
                foreach (var t in matchedTasks)
                {
                    LinkedTasks.Add(new TaskItemViewModel(t));
                }
            }
            catch
            {
                // Ignore background backlink query failures
            }
        }

        if (_followUpRepository != null)
        {
            try
            {
                var followUps = await _followUpRepository.ListAsync();
                var matchedFollowUps = followUps.Where(f => f.SourceNoteId == noteId).ToList();
                LinkedFollowUps.Clear();
                foreach (var f in matchedFollowUps)
                {
                    LinkedFollowUps.Add(f);
                }
            }
            catch
            {
                // Ignore background backlink query failures
            }
        }

        OnPropertyChanged(nameof(HasLinkedActions));
        OnPropertyChanged(nameof(HasLinkedTasks));
        OnPropertyChanged(nameof(HasLinkedFollowUps));
    }

    public async Task CreateNoteAsync()
    {
        if (string.IsNullOrWhiteSpace(NewNoteTitle))
        {
            ErrorMessage = "Note title cannot be empty.";
            return;
        }

        try
        {
            var note = new NoteItem
            {
                Title = NewNoteTitle.Trim(),
                Body = NewNoteBody?.Trim() ?? string.Empty
            };

            var created = await _noteRepository.CreateAsync(note);
            var createdVm = new NoteItemViewModel(created);
            Notes.Insert(0, createdVm);
            SelectedNoteViewModel = createdVm;
            OnPropertyChanged(nameof(NotesCountLabel));

            NewNoteTitle = string.Empty;
            NewNoteBody = string.Empty;
            IsCreatePanelVisible = false;
            ErrorMessage = null;
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to create note: {ex.Message}";
        }
    }

    public async Task SaveSelectedNoteAsync()
    {
        if (SelectedNote == null || SelectedNoteViewModel == null)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(SelectedNote.Title))
        {
            ErrorMessage = "Note title cannot be empty.";
            return;
        }

        try
        {
            var updated = await _noteRepository.UpdateAsync(SelectedNote);
            var updatedVm = new NoteItemViewModel(updated);
            int index = Notes.IndexOf(SelectedNoteViewModel);
            if (index >= 0)
            {
                Notes[index] = updatedVm;
                SelectedNoteViewModel = updatedVm;
            }
            ErrorMessage = null;
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to update note: {ex.Message}";
        }
    }

    public async Task DeleteNoteAsync(NoteItemViewModel? noteVm)
    {
        await DeleteNoteAsync(noteVm?.Model);
    }

    public async Task DeleteNoteAsync(NoteItem? note)
    {
        if (note == null)
        {
            return;
        }

        try
        {
            bool deleted = await _noteRepository.DeleteAsync(note.Id);
            if (deleted)
            {
                var existingVm = Notes.FirstOrDefault(n => n.Id == note.Id);
                if (existingVm != null)
                {
                    Notes.Remove(existingVm);
                    OnPropertyChanged(nameof(NotesCountLabel));
                    if (SelectedNoteViewModel?.Id == note.Id)
                    {
                        SelectedNoteViewModel = Notes.FirstOrDefault();
                    }
                }
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to delete note: {ex.Message}";
        }
    }
}
