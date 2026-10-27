using System.Threading.Tasks;

namespace TaskFlow.Services;

public interface IAdoptionService
{
    Task<int> GetLocalEntityCountAsync();
    Task<bool> HasLocalDataToAdoptAsync();
    Task<int> AdoptLocalDataAsync();
}
