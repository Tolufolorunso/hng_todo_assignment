using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.ViewModels;

public class NotesViewModel : ObservableObject
{
    private readonly INoteRepository _noteRepository;
    private NoteItem? _selectedNote;
    private string _searchQuery = string.Empty;
    private bool _isLoading;
    private string? _errorMessage;
    private bool _isCreatePanelVisible;

    private string _newNoteTitle = string.Empty;
    private string _newNoteBody = string.Empty;

    public ObservableCollection<NoteItem> Notes { get; } = new();

    public NoteItem? SelectedNote
    {
        get => _selectedNote;
        set
        {
            if (SetProperty(ref _selectedNote, value))
            {
                OnPropertyChanged(nameof(HasSelectedNote));
            }
        }
    }

    public bool HasSelectedNote => SelectedNote != null;

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

    public ICommand LoadNotesCommand { get; }
    public ICommand OpenCreatePanelCommand { get; }
    public ICommand CloseCreatePanelCommand { get; }
    public ICommand CreateNoteCommand { get; }
    public ICommand DeleteNoteCommand { get; }
    public ICommand SaveSelectedNoteCommand { get; }

    public NotesViewModel(INoteRepository noteRepository)
    {
        _noteRepository = noteRepository;

        LoadNotesCommand = new RelayCommand(async () => await LoadNotesAsync());
        OpenCreatePanelCommand = new RelayCommand(() => IsCreatePanelVisible = true);
        CloseCreatePanelCommand = new RelayCommand(() => IsCreatePanelVisible = false);
        CreateNoteCommand = new RelayCommand(async () => await CreateNoteAsync());
        DeleteNoteCommand = new RelayCommand(async (param) => await DeleteNoteAsync(param as NoteItem ?? SelectedNote));
        SaveSelectedNoteCommand = new RelayCommand(async () => await SaveSelectedNoteAsync());
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
                Notes.Add(item);
            }

            if (SelectedNote != null && !Notes.Any(n => n.Id == SelectedNote.Id))
            {
                SelectedNote = Notes.FirstOrDefault();
            }
            else if (SelectedNote == null && Notes.Count > 0)
            {
                SelectedNote = Notes[0];
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
            Notes.Insert(0, created);
            SelectedNote = created;

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
        if (SelectedNote == null)
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
            int index = Notes.IndexOf(SelectedNote);
            if (index >= 0)
            {
                Notes[index] = updated;
                SelectedNote = updated;
            }
            ErrorMessage = null;
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to update note: {ex.Message}";
        }
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
                Notes.Remove(note);
                if (SelectedNote?.Id == note.Id)
                {
                    SelectedNote = Notes.FirstOrDefault();
                }
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to delete note: {ex.Message}";
        }
    }
}
