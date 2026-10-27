using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskFlow.Models;
using TaskFlow.Services;
using TaskFlow.ViewModels;
using Xunit;

namespace TaskFlow.Tests;

public class AccountViewModelTests
{
    private class MockAuthService : IAuthService
    {
        public bool IsAuthenticated => CurrentSession != null;
        public SessionCredentials? CurrentSession { get; set; }
        public event Action<bool>? AuthStateChanged;

        public bool RequestOtpResult { get; set; } = true;
        public string? LastRequestedEmail { get; private set; }
        public bool RevokeCalled { get; private set; }
        public bool DeleteCalled { get; private set; }

        public Task InitializeAsync() => Task.CompletedTask;

        public Task<bool> RequestOtpAsync(string email)
        {
            LastRequestedEmail = email;
            return Task.FromResult(RequestOtpResult);
        }

        public Task<SessionCredentials> VerifyOtpAsync(string email, string code)
        {
            CurrentSession = new SessionCredentials
            {
                AccessToken = "tok-123",
                RefreshToken = "ref-123",
                UserId = "user-abc",
                Email = email,
                ExpiresAt = DateTime.UtcNow.AddHours(2)
            };
            AuthStateChanged?.Invoke(true);
            return Task.FromResult(CurrentSession);
        }

        public Task<SessionCredentials?> RefreshSessionAsync() => Task.FromResult(CurrentSession);

        public Task LogoutAsync()
        {
            CurrentSession = null;
            AuthStateChanged?.Invoke(false);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<ActiveSessionItem>> ListSessionsAsync()
        {
            var list = new List<ActiveSessionItem>
            {
                new() { Id = "sess-1", ClientPlatform = "Windows 11 PC", IpAddress = "127.0.0.1", CreatedAt = "2026-10-27" }
            };
            return Task.FromResult<IReadOnlyList<ActiveSessionItem>>(list);
        }

        public Task RevokeSessionAsync(string sessionId)
        {
            RevokeCalled = true;
            return Task.CompletedTask;
        }

        public Task<AccountProfile?> GetAccountProfileAsync() => Task.FromResult<AccountProfile?>(null);

        public Task<bool> DeleteAccountAsync()
        {
            DeleteCalled = true;
            CurrentSession = null;
            AuthStateChanged?.Invoke(false);
            return Task.FromResult(true);
        }
    }

    private class MockAdoptionService : IAdoptionService
    {
        public bool HasLocalData { get; set; } = true;
        public int LocalCount { get; set; } = 5;
        public bool AdoptCalled { get; private set; }

        public Task<int> GetLocalEntityCountAsync() => Task.FromResult(LocalCount);
        public Task<bool> HasLocalDataToAdoptAsync() => Task.FromResult(HasLocalData);
        public Task<int> AdoptLocalDataAsync()
        {
            AdoptCalled = true;
            return Task.FromResult(LocalCount);
        }
    }

    private class MockSyncEngine : ISyncEngine
    {
        public SyncState State { get; set; } = new();
        public event Action<SyncState>? StateChanged { add { } remove { } }
        public int SyncCount { get; private set; }

        public Task<SyncResultSummary> SyncOnceAsync()
        {
            SyncCount++;
            return Task.FromResult(new SyncResultSummary { Success = true });
        }

        public void StartPeriodicSync(TimeSpan? interval = null) { }
        public void StopPeriodicSync() { }
    }

    private class MockConflictService : IConflictService
    {
        public List<ConflictItem> ConflictList { get; set; } = new();
        public string? ResolvedKeepLocalId { get; private set; }
        public string? ResolvedKeepServerId { get; private set; }

        public Task<IReadOnlyList<ConflictItem>> GetConflictsAsync() => Task.FromResult<IReadOnlyList<ConflictItem>>(ConflictList);

        public Task ResolveKeepLocalAsync(string conflictId)
        {
            ResolvedKeepLocalId = conflictId;
            ConflictList.RemoveAll(c => c.Id == conflictId);
            return Task.CompletedTask;
        }

        public Task ResolveKeepServerAsync(string conflictId)
        {
            ResolvedKeepServerId = conflictId;
            ConflictList.RemoveAll(c => c.Id == conflictId);
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task RequestOtp_WithValidEmail_SetsIsOtpSent()
    {
        var auth = new MockAuthService();
        var adoption = new MockAdoptionService();
        var sync = new MockSyncEngine();

        var vm = new AccountViewModel(auth, adoption, sync)
        {
            Email = "test@taskflow.dev"
        };

        await vm.RequestOtpAsync();

        Assert.True(vm.IsOtpSent);
        Assert.Null(vm.ErrorMessage);
        Assert.Equal("test@taskflow.dev", auth.LastRequestedEmail);
    }

    [Fact]
    public async Task RequestOtp_WithInvalidEmail_SetsErrorMessage()
    {
        var auth = new MockAuthService();
        var adoption = new MockAdoptionService();
        var sync = new MockSyncEngine();

        var vm = new AccountViewModel(auth, adoption, sync)
        {
            Email = "invalid-email"
        };

        await vm.RequestOtpAsync();

        Assert.False(vm.IsOtpSent);
        Assert.NotNull(vm.ErrorMessage);
    }

    [Fact]
    public async Task VerifyOtp_Success_AuthenticatesAndChecksAdoption()
    {
        var auth = new MockAuthService();
        var adoption = new MockAdoptionService { HasLocalData = true, LocalCount = 7 };
        var sync = new MockSyncEngine();

        var vm = new AccountViewModel(auth, adoption, sync)
        {
            Email = "test@taskflow.dev",
            OtpCode = "123456"
        };

        await vm.VerifyOtpAsync();

        Assert.True(vm.IsAuthenticated);
        Assert.Equal("test@taskflow.dev", vm.UserEmail);
        Assert.True(vm.HasPendingAdoption);
        Assert.Equal(7, vm.PendingAdoptionCount);
        Assert.Equal(1, sync.SyncCount);
    }

    [Fact]
    public async Task AdoptData_AdoptsAndTriggersSync()
    {
        var auth = new MockAuthService();
        var adoption = new MockAdoptionService { LocalCount = 12 };
        var sync = new MockSyncEngine();

        var vm = new AccountViewModel(auth, adoption, sync)
        {
            HasPendingAdoption = true,
            PendingAdoptionCount = 12
        };

        await vm.AdoptDataAsync();

        Assert.True(adoption.AdoptCalled);
        Assert.False(vm.HasPendingAdoption);
        Assert.Equal(1, sync.SyncCount);
    }

    [Fact]
    public async Task ConflictViewModel_ResolvesKeepLocalAndKeepServer()
    {
        var mockConflict = new MockConflictService
        {
            ConflictList = new List<ConflictItem>
            {
                new()
                {
                    Id = "conf-1",
                    EntityType = "task",
                    EntityId = "t-1",
                    LocalValue = "{\"title\":\"local\"}",
                    ServerValue = "{\"title\":\"server\"}",
                    ServerRevision = 4
                }
            }
        };

        var vm = new ConflictViewModel(mockConflict);
        await vm.LoadConflictsAsync();

        Assert.True(vm.IsOpen);
        Assert.True(vm.HasConflicts);
        Assert.NotNull(vm.SelectedConflict);
        Assert.Contains("local", vm.LocalSummary);
        Assert.Contains("server", vm.ServerSummary);

        // Keep Local
        await vm.KeepLocalAsync();
        Assert.Equal("conf-1", mockConflict.ResolvedKeepLocalId);
        Assert.False(vm.IsOpen);
        Assert.False(vm.HasConflicts);
    }
}
