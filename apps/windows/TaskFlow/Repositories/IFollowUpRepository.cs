using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public interface IFollowUpRepository
{
    Task<IReadOnlyList<FollowUpItem>> ListAsync(string? status = null, string? search = null);
    Task<FollowUpItem?> GetByIdAsync(string id);
    Task<FollowUpItem> CreateAsync(FollowUpItem item);
    Task<FollowUpItem> UpdateAsync(FollowUpItem item);
    Task<FollowUpItem> CompleteOccurrenceAsync(string followUpId, string? notes = null);
    Task<FollowUpItem> SnoozeAsync(string followUpId, int hours = 24);
    Task<FollowUpItem> RescheduleAsync(string followUpId, string newDueAt);
    Task<bool> DeleteAsync(string id);
    Task<IReadOnlyList<FollowUpOccurrenceItem>> ListOccurrencesAsync(string followUpId);
    Task<IReadOnlyList<FollowUpItem>> ListDueAsync(DateTimeOffset asOf);
}
