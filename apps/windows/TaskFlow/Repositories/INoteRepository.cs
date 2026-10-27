using System.Collections.Generic;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public interface INoteRepository
{
    Task<IReadOnlyList<NoteItem>> ListAsync(string? search = null);
    Task<NoteItem?> GetByIdAsync(string id);
    Task<NoteItem> CreateAsync(NoteItem note);
    Task<NoteItem> UpdateAsync(NoteItem note);
    Task<bool> DeleteAsync(string id);
}
