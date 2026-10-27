using System.Collections.Generic;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public interface IDailyPlanRepository
{
    Task<DailyPlanItem?> GetByDateAsync(string localDate);
    Task<DailyPlanItem> SaveAsync(DailyPlanItem plan);
    Task<DailyPlanItem> AcceptAsync(string localDate);
    Task<IReadOnlyList<DailyPlanItem>> ListRecentAsync(int limit = 14);
}
