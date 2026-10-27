using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using TaskFlow.Data;
using TaskFlow.Models;

namespace TaskFlow.Services;

public class DpapiSessionStore : ISessionStore
{
    private readonly string _storageFilePath;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public DpapiSessionStore(string? storageFilePath = null)
    {
        if (!string.IsNullOrWhiteSpace(storageFilePath))
        {
            _storageFilePath = storageFilePath;
        }
        else
        {
            string dbPath = DatabaseConnectionFactory.GetDefaultFilePath();
            string? dir = Path.GetDirectoryName(dbPath);
            _storageFilePath = Path.Combine(dir ?? Path.GetTempPath(), "session.dat");
        }
    }

    public async Task SaveSessionAsync(SessionCredentials credentials)
    {
        string? dir = Path.GetDirectoryName(_storageFilePath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }

        string json = JsonSerializer.Serialize(credentials, JsonOptions);
        byte[] plaintextBytes = Encoding.UTF8.GetBytes(json);

        byte[] encryptedBytes;
        if (OperatingSystem.IsWindows())
        {
            encryptedBytes = ProtectedData.Protect(plaintextBytes, null, DataProtectionScope.CurrentUser);
        }
        else
        {
            encryptedBytes = plaintextBytes;
        }

        await File.WriteAllBytesAsync(_storageFilePath, encryptedBytes);
    }

    public async Task<SessionCredentials?> LoadSessionAsync()
    {
        if (!File.Exists(_storageFilePath))
        {
            return null;
        }

        try
        {
            byte[] encryptedBytes = await File.ReadAllBytesAsync(_storageFilePath);
            if (encryptedBytes.Length == 0)
            {
                return null;
            }

            byte[] plaintextBytes;
            if (OperatingSystem.IsWindows())
            {
                plaintextBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.CurrentUser);
            }
            else
            {
                plaintextBytes = encryptedBytes;
            }

            string json = Encoding.UTF8.GetString(plaintextBytes);
            return JsonSerializer.Deserialize<SessionCredentials>(json, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    public Task ClearSessionAsync()
    {
        if (File.Exists(_storageFilePath))
        {
            try
            {
                File.Delete(_storageFilePath);
            }
            catch
            {
            }
        }

        return Task.CompletedTask;
    }

    public Task<bool> HasSessionAsync()
    {
        return Task.FromResult(File.Exists(_storageFilePath) && new FileInfo(_storageFilePath).Length > 0);
    }
}
