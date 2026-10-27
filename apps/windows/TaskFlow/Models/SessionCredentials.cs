using System;

namespace TaskFlow.Models;

public class SessionCredentials
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int ExpiresIn { get; set; } = 900;
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddSeconds(900);
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAt.AddSeconds(-30);
}

public class AccountProfile
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public class ActiveSessionItem
{
    public string Id { get; set; } = string.Empty;
    public string ClientPlatform { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string LastActiveAt { get; set; } = string.Empty;
    public bool IsCurrent { get; set; }
}
