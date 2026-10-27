using System.Collections.Generic;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Services;

public interface IConflictService
{
    Task<IReadOnlyList<ConflictItem>> GetConflictsAsync();
    Task ResolveKeepLocalAsync(string conflictId);
    Task ResolveKeepServerAsync(string conflictId);
}
