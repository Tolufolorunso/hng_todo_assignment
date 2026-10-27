using System;
using System.IO;
using System.Threading.Tasks;
using TaskFlow.Models;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class DpapiSessionStoreTests : IDisposable
{
    private readonly string _testPath;

    public DpapiSessionStoreTests()
    {
        _testPath = Path.Combine(Path.GetTempPath(), $"taskflow_dpapi_test_{Guid.NewGuid():N}.dat");
    }

    public void Dispose()
    {
        if (File.Exists(_testPath))
        {
            try { File.Delete(_testPath); } catch { }
        }
    }

    [Fact]
    public async Task RoundTrip_SaveAndLoad_PreservesCredentials()
    {
        var store = new DpapiSessionStore(_testPath);

        Assert.False(await store.HasSessionAsync());
        Assert.Null(await store.LoadSessionAsync());

        var creds = new SessionCredentials
        {
            AccessToken = "jwt_access_token_123",
            RefreshToken = "refresh_token_456",
            UserId = "user_789",
            Email = "test@example.com",
            ExpiresIn = 900,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15)
        };

        await store.SaveSessionAsync(creds);

        Assert.True(await store.HasSessionAsync());
        Assert.True(File.Exists(_testPath));

        var loaded = await store.LoadSessionAsync();
        Assert.NotNull(loaded);
        Assert.Equal("jwt_access_token_123", loaded.AccessToken);
        Assert.Equal("refresh_token_456", loaded.RefreshToken);
        Assert.Equal("user_789", loaded.UserId);
        Assert.Equal("test@example.com", loaded.Email);
    }

    [Fact]
    public async Task ClearSession_RemovesPersistedFile()
    {
        var store = new DpapiSessionStore(_testPath);
        var creds = new SessionCredentials
        {
            AccessToken = "token",
            RefreshToken = "refresh",
            UserId = "user",
            Email = "user@test.com"
        };

        await store.SaveSessionAsync(creds);
        Assert.True(await store.HasSessionAsync());

        await store.ClearSessionAsync();
        Assert.False(await store.HasSessionAsync());
        Assert.Null(await store.LoadSessionAsync());
    }

    [Fact]
    public async Task CorruptFile_ReturnsNullGracefully()
    {
        await File.WriteAllBytesAsync(_testPath, new byte[] { 0xFF, 0x00, 0xAA, 0xBB });
        var store = new DpapiSessionStore(_testPath);

        var loaded = await store.LoadSessionAsync();
        Assert.Null(loaded);
    }
}
