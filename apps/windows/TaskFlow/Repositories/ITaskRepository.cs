using System.Collections.Generic;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public interface ITaskRepository
{
    Task<IReadOnlyList<TaskItem>> ListAsync(string? status = null, string? category = null, string? search = null);
    Task<TaskItem?> GetByIdAsync(string id);
    Task<TaskItem> CreateAsync(TaskItem task);
    Task<TaskItem> UpdateAsync(TaskItem task);
    Task<TaskItem> ToggleCompleteAsync(string id);
    Task<bool> DeleteAsync(string id);
}
