using System.Collections.Generic;
using System.Threading.Tasks;

namespace TaskFlow.Repositories;

public interface ITaskOrderRepository
{
    Task<IReadOnlyList<string>> GetOrderAsync(string id = "default");
    Task SaveOrderAsync(string id, IReadOnlyList<string> orderedIds);
}
