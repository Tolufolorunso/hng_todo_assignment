using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Services;

public class AuthService : IAuthService
{
    private readonly ISessionStore _sessionStore;
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private SessionCredentials? _currentSession;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public bool IsAuthenticated => _currentSession != null && !string.IsNullOrWhiteSpace(_currentSession.AccessToken);
    public SessionCredentials? CurrentSession => _currentSession;
    public event Action<bool>? AuthStateChanged;

    public AuthService(ISessionStore sessionStore, HttpClient? httpClient = null, string baseUrl = "http://localhost:3000")
    {
        _sessionStore = sessionStore;
        _httpClient = httpClient ?? new HttpClient();
        _baseUrl = baseUrl.TrimEnd('/');
    }

    public async Task InitializeAsync()
    {
        _currentSession = await _sessionStore.LoadSessionAsync();
        if (_currentSession != null)
        {
            if (_currentSession.IsExpired && !string.IsNullOrWhiteSpace(_currentSession.RefreshToken))
            {
                try
                {
                    await RefreshSessionAsync();
                }
                catch
                {
                    // Refresh failed; keep session or clear on explicit auth failure
                }
            }
        }

        AuthStateChanged?.Invoke(IsAuthenticated);
    }

    public async Task<bool> RequestOtpAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required.", nameof(email));
        }

        string url = $"{_baseUrl}/api/v1/auth/otp/request";
        var payload = JsonSerializer.Serialize(new { email = email.Trim() });
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");

        using var response = await _httpClient.PostAsync(url, content);
        if (!response.IsSuccessStatusCode)
        {
            string err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"OTP request failed: {err}");
        }

        return true;
    }

    public async Task<SessionCredentials> VerifyOtpAsync(string email, string code)
    {
        if (string.IsNullOrWhiteSpace(email)) throw new ArgumentException("Email is required.", nameof(email));
        if (string.IsNullOrWhiteSpace(code)) throw new ArgumentException("Code is required.", nameof(code));

        string url = $"{_baseUrl}/api/v1/auth/otp/verify";
        var payload = JsonSerializer.Serialize(new
        {
            email = email.Trim(),
            code = code.Trim(),
            clientPlatform = "windows"
        });
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");

        using var response = await _httpClient.PostAsync(url, content);
        string responseText = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"OTP verification failed: {responseText}");
        }

        using var doc = JsonDocument.Parse(responseText);
        var data = doc.RootElement.GetProperty("data");

        string accessToken = data.GetProperty("accessToken").GetString() ?? string.Empty;
        string refreshToken = data.GetProperty("refreshToken").GetString() ?? string.Empty;
        int expiresIn = data.TryGetProperty("expiresIn", out var expEl) ? expEl.GetInt32() : 900;

        string accountId = string.Empty;
        string accountEmail = email.Trim();
        if (data.TryGetProperty("account", out var accEl))
        {
            accountId = accEl.GetProperty("id").GetString() ?? string.Empty;
            if (accEl.TryGetProperty("email", out var mailEl))
            {
                accountEmail = mailEl.GetString() ?? accountEmail;
            }
        }

        var credentials = new SessionCredentials
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            UserId = accountId,
            Email = accountEmail,
            ExpiresIn = expiresIn,
            ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(expiresIn),
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _sessionStore.SaveSessionAsync(credentials);
        _currentSession = credentials;
        AuthStateChanged?.Invoke(true);

        return credentials;
    }

    public async Task<SessionCredentials?> RefreshSessionAsync()
    {
        if (_currentSession == null || string.IsNullOrWhiteSpace(_currentSession.RefreshToken))
        {
            return null;
        }

        string url = $"{_baseUrl}/api/v1/auth/refresh";
        var payload = JsonSerializer.Serialize(new { refreshToken = _currentSession.RefreshToken });
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");

        using var response = await _httpClient.PostAsync(url, content);
        string responseText = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            await _sessionStore.ClearSessionAsync();
            _currentSession = null;
            AuthStateChanged?.Invoke(false);
            return null;
        }

        using var doc = JsonDocument.Parse(responseText);
        var data = doc.RootElement.GetProperty("data");

        string newAccessToken = data.GetProperty("accessToken").GetString() ?? string.Empty;
        string newRefreshToken = data.GetProperty("refreshToken").GetString() ?? _currentSession.RefreshToken;
        int expiresIn = data.TryGetProperty("expiresIn", out var expEl) ? expEl.GetInt32() : 900;

        _currentSession.AccessToken = newAccessToken;
        _currentSession.RefreshToken = newRefreshToken;
        _currentSession.ExpiresIn = expiresIn;
        _currentSession.ExpiresAt = DateTimeOffset.UtcNow.AddSeconds(expiresIn);

        await _sessionStore.SaveSessionAsync(_currentSession);
        AuthStateChanged?.Invoke(true);

        return _currentSession;
    }

    public async Task LogoutAsync()
    {
        if (_currentSession != null)
        {
            try
            {
                string url = $"{_baseUrl}/api/v1/auth/logout";
                var payload = JsonSerializer.Serialize(new { refreshToken = _currentSession.RefreshToken });
                using var request = new HttpRequestMessage(HttpMethod.Post, url);
                request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
                if (!string.IsNullOrWhiteSpace(_currentSession.AccessToken))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _currentSession.AccessToken);
                }
                await _httpClient.SendAsync(request);
            }
            catch
            {
                // Best-effort remote revocation
            }
        }

        await _sessionStore.ClearSessionAsync();
        _currentSession = null;
        AuthStateChanged?.Invoke(false);
    }

    public async Task<IReadOnlyList<ActiveSessionItem>> ListSessionsAsync()
    {
        await EnsureValidTokenAsync();
        if (_currentSession == null) return Array.Empty<ActiveSessionItem>();

        string url = $"{_baseUrl}/api/v1/auth/sessions";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _currentSession.AccessToken);

        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return Array.Empty<ActiveSessionItem>();
        }

        string json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");
        var list = new List<ActiveSessionItem>();

        if (data.TryGetProperty("sessions", out var sessionsEl) && sessionsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var s in sessionsEl.EnumerateArray())
            {
                list.Add(new ActiveSessionItem
                {
                    Id = s.GetProperty("id").GetString() ?? string.Empty,
                    ClientPlatform = s.TryGetProperty("clientPlatform", out var cp) ? cp.GetString() ?? "windows" : "windows",
                    UserAgent = s.TryGetProperty("userAgent", out var ua) ? ua.GetString() : null,
                    IpAddress = s.TryGetProperty("ipAddress", out var ip) ? ip.GetString() : null,
                    CreatedAt = s.TryGetProperty("createdAt", out var ca) ? ca.GetString() ?? string.Empty : string.Empty,
                    LastActiveAt = s.TryGetProperty("lastActiveAt", out var la) ? la.GetString() ?? string.Empty : string.Empty,
                    IsCurrent = s.TryGetProperty("isCurrent", out var ic) && ic.GetBoolean()
                });
            }
        }

        return list;
    }

    public async Task RevokeSessionAsync(string sessionId)
    {
        await EnsureValidTokenAsync();
        if (_currentSession == null) return;

        string url = $"{_baseUrl}/api/v1/auth/sessions/{sessionId}";
        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _currentSession.AccessToken);

        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            string err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Session revocation failed: {err}");
        }
    }

    public async Task<AccountProfile?> GetAccountProfileAsync()
    {
        await EnsureValidTokenAsync();
        if (_currentSession == null) return null;

        string url = $"{_baseUrl}/api/v1/account";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _currentSession.AccessToken);

        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;

        string json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");
        if (data.TryGetProperty("account", out var accEl))
        {
            return new AccountProfile
            {
                Id = accEl.GetProperty("id").GetString() ?? string.Empty,
                Email = accEl.GetProperty("email").GetString() ?? string.Empty,
                CreatedAt = accEl.TryGetProperty("createdAt", out var ca) ? ca.GetString() ?? string.Empty : string.Empty
            };
        }

        return null;
    }

    public async Task<bool> DeleteAccountAsync()
    {
        await EnsureValidTokenAsync();
        if (_currentSession == null) return false;

        string url = $"{_baseUrl}/api/v1/account";
        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _currentSession.AccessToken);

        using var response = await _httpClient.SendAsync(request);
        if (response.IsSuccessStatusCode)
        {
            await _sessionStore.ClearSessionAsync();
            _currentSession = null;
            AuthStateChanged?.Invoke(false);
            return true;
        }

        return false;
    }

    private async Task EnsureValidTokenAsync()
    {
        if (_currentSession != null && _currentSession.IsExpired && !string.IsNullOrWhiteSpace(_currentSession.RefreshToken))
        {
            await RefreshSessionAsync();
        }
    }
}
