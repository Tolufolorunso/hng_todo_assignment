using System.Collections.Generic;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public interface IInboxRepository
{
    Task<IReadOnlyList<InboxCaptureItem>> ListAsync(string? state = null, string? search = null);
    Task<InboxCaptureItem?> GetByIdAsync(string id);
    Task<InboxCaptureItem> CreateAsync(string text, string? sharedUrl = null, string? sourceAppLabel = null);
    Task<InboxCaptureItem> MarkProcessedAsync(string id, string resultEntityType, string resultEntityId);
    Task<InboxCaptureItem> MarkDiscardedAsync(string id);
    Task<bool> DeleteAsync(string id);
}
