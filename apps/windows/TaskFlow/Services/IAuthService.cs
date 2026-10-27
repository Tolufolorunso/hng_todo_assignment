using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Services;

public interface IAuthService
{
    bool IsAuthenticated { get; }
    SessionCredentials? CurrentSession { get; }
    event Action<bool>? AuthStateChanged;

    Task InitializeAsync();
    Task<bool> RequestOtpAsync(string email);
    Task<SessionCredentials> VerifyOtpAsync(string email, string code);
    Task<SessionCredentials?> RefreshSessionAsync();
    Task LogoutAsync();
    Task<IReadOnlyList<ActiveSessionItem>> ListSessionsAsync();
    Task RevokeSessionAsync(string sessionId);
    Task<AccountProfile?> GetAccountProfileAsync();
    Task<bool> DeleteAccountAsync();
}
