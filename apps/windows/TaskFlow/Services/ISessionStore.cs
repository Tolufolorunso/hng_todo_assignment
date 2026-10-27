using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Services;

public interface ISessionStore
{
    Task SaveSessionAsync(SessionCredentials credentials);
    Task<SessionCredentials?> LoadSessionAsync();
    Task ClearSessionAsync();
    Task<bool> HasSessionAsync();
}
