using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using TaskFlow.Models;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class AuthServiceTests
{
    private class MockSessionStore : ISessionStore
    {
        public SessionCredentials? Stored { get; set; }
        public Task SaveSessionAsync(SessionCredentials credentials) { Stored = credentials; return Task.CompletedTask; }
        public Task<SessionCredentials?> LoadSessionAsync() => Task.FromResult(Stored);
        public Task ClearSessionAsync() { Stored = null; return Task.CompletedTask; }
        public Task<bool> HasSessionAsync() => Task.FromResult(Stored != null);
    }

    private class MockHttpHandler : HttpMessageHandler
    {
        public Func<HttpRequestMessage, HttpResponseMessage> Handler { get; set; } = _ => new HttpResponseMessage(HttpStatusCode.OK);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(Handler(request));
        }
    }

    [Fact]
    public async Task RequestOtp_PostsCorrectPayload()
    {
        var mockStore = new MockSessionStore();
        var mockHandler = new MockHttpHandler();
        string requestedUrl = string.Empty;
        string requestBody = string.Empty;

        mockHandler.Handler = req =>
        {
            requestedUrl = req.RequestUri?.ToString() ?? string.Empty;
            requestBody = req.Content?.ReadAsStringAsync().Result ?? string.Empty;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"success\":true,\"data\":{\"message\":\"Code sent\"}}", Encoding.UTF8, "application/json")
            };
        };

        var authService = new AuthService(mockStore, new HttpClient(mockHandler), "http://localhost:3000");
        bool result = await authService.RequestOtpAsync("user@example.com");

        Assert.True(result);
        Assert.Contains("/api/v1/auth/otp/request", requestedUrl);
        Assert.Contains("user@example.com", requestBody);
    }

    [Fact]
    public async Task VerifyOtp_Success_StoresSessionAndUpdatesState()
    {
        var mockStore = new MockSessionStore();
        var mockHandler = new MockHttpHandler();

        mockHandler.Handler = req =>
        {
            string json = @"{
                ""success"": true,
                ""data"": {
                    ""accessToken"": ""access_jwt_123"",
                    ""refreshToken"": ""refresh_jwt_456"",
                    ""expiresIn"": 900,
                    ""account"": {
                        ""id"": ""acc_123"",
                        ""email"": ""user@example.com"",
                        ""createdAt"": ""2026-10-27T00:00:00Z""
                    }
                }
            }";
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        };

        var authService = new AuthService(mockStore, new HttpClient(mockHandler), "http://localhost:3000");

        bool authStateTriggered = false;
        authService.AuthStateChanged += isAuth => authStateTriggered = isAuth;

        var creds = await authService.VerifyOtpAsync("user@example.com", "123456");

        Assert.True(authService.IsAuthenticated);
        Assert.True(authStateTriggered);
        Assert.Equal("access_jwt_123", creds.AccessToken);
        Assert.Equal("refresh_jwt_456", creds.RefreshToken);
        Assert.Equal("acc_123", creds.UserId);

        Assert.NotNull(mockStore.Stored);
        Assert.Equal("access_jwt_123", mockStore.Stored.AccessToken);
    }

    [Fact]
    public async Task RefreshSession_RotatesTokens()
    {
        var mockStore = new MockSessionStore
        {
            Stored = new SessionCredentials
            {
                AccessToken = "old_access",
                RefreshToken = "old_refresh",
                UserId = "acc_123",
                Email = "user@example.com"
            }
        };

        var mockHandler = new MockHttpHandler();
        mockHandler.Handler = req =>
        {
            string json = @"{
                ""success"": true,
                ""data"": {
                    ""accessToken"": ""new_access_789"",
                    ""refreshToken"": ""new_refresh_012"",
                    ""expiresIn"": 900
                }
            }";
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };
        };

        var authService = new AuthService(mockStore, new HttpClient(mockHandler), "http://localhost:3000");
        await authService.InitializeAsync();

        var refreshed = await authService.RefreshSessionAsync();

        Assert.NotNull(refreshed);
        Assert.Equal("new_access_789", refreshed.AccessToken);
        Assert.Equal("new_refresh_012", refreshed.RefreshToken);
        Assert.Equal("new_access_789", mockStore.Stored?.AccessToken);
    }

    [Fact]
    public async Task Logout_ClearsSessionStoreAndSetsUnauthenticated()
    {
        var mockStore = new MockSessionStore
        {
            Stored = new SessionCredentials
            {
                AccessToken = "access",
                RefreshToken = "refresh",
                UserId = "user",
                Email = "user@test.com"
            }
        };

        var mockHandler = new MockHttpHandler();
        var authService = new AuthService(mockStore, new HttpClient(mockHandler), "http://localhost:3000");
        await authService.InitializeAsync();

        Assert.True(authService.IsAuthenticated);

        await authService.LogoutAsync();

        Assert.False(authService.IsAuthenticated);
        Assert.Null(mockStore.Stored);
    }
}
