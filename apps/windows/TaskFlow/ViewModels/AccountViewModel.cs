using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows.Input;
using TaskFlow.Common;
using TaskFlow.Models;
using TaskFlow.Services;

namespace TaskFlow.ViewModels;

public class AccountViewModel : ObservableObject
{
    private readonly IAuthService _authService;
    private readonly IAdoptionService _adoptionService;
    private readonly ISyncEngine _syncEngine;

    private string _email = string.Empty;
    private string _otpCode = string.Empty;
    private bool _isOtpSent;
    private bool _isLoading;
    private string? _errorMessage;
    private string? _statusMessage;
    private bool _hasPendingAdoption;
    private int _pendingAdoptionCount;

    public string Email
    {
        get => _email;
        set => SetProperty(ref _email, value);
    }

    public string OtpCode
    {
        get => _otpCode;
        set => SetProperty(ref _otpCode, value);
    }

    public bool IsOtpSent
    {
        get => _isOtpSent;
        set => SetProperty(ref _isOtpSent, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public string? ErrorMessage
    {
        get => _errorMessage;
        set => SetProperty(ref _errorMessage, value);
    }

    public string? StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public bool IsAuthenticated => _authService.IsAuthenticated;

    public string? UserEmail => _authService.CurrentSession?.Email;
    public string? UserId => _authService.CurrentSession?.UserId;

    public ObservableCollection<ActiveSessionItem> Sessions { get; } = new();

    public bool HasPendingAdoption
    {
        get => _hasPendingAdoption;
        set => SetProperty(ref _hasPendingAdoption, value);
    }

    public int PendingAdoptionCount
    {
        get => _pendingAdoptionCount;
        set => SetProperty(ref _pendingAdoptionCount, value);
    }

    public ICommand RequestOtpCommand { get; }
    public ICommand VerifyOtpCommand { get; }
    public ICommand AdoptDataCommand { get; }
    public ICommand DismissAdoptionCommand { get; }
    public ICommand LogoutCommand { get; }
    public ICommand RefreshSessionsCommand { get; }
    public ICommand RevokeSessionCommand { get; }
    public ICommand DeleteAccountCommand { get; }
    public ICommand SyncNowCommand { get; }

    public AccountViewModel(
        IAuthService authService,
        IAdoptionService adoptionService,
        ISyncEngine syncEngine)
    {
        _authService = authService;
        _adoptionService = adoptionService;
        _syncEngine = syncEngine;

        _authService.AuthStateChanged += OnAuthStateChanged;

        RequestOtpCommand = new RelayCommand(async () => await RequestOtpAsync());
        VerifyOtpCommand = new RelayCommand(async () => await VerifyOtpAsync());
        AdoptDataCommand = new RelayCommand(async () => await AdoptDataAsync());
        DismissAdoptionCommand = new RelayCommand(() => HasPendingAdoption = false);
        LogoutCommand = new RelayCommand(async () => await LogoutAsync());
        RefreshSessionsCommand = new RelayCommand(async () => await LoadSessionsAsync());
        RevokeSessionCommand = new RelayCommand<string>(async id => await RevokeSessionAsync(id));
        DeleteAccountCommand = new RelayCommand(async () => await DeleteAccountAsync());
        SyncNowCommand = new RelayCommand(async () => await _syncEngine.SyncOnceAsync());
    }

    private void OnAuthStateChanged(bool isAuthenticated)
    {
        OnPropertyChanged(nameof(IsAuthenticated));
        OnPropertyChanged(nameof(UserEmail));
        OnPropertyChanged(nameof(UserId));

        if (isAuthenticated)
        {
            _ = CheckPendingAdoptionAsync();
            _ = LoadSessionsAsync();
        }
        else
        {
            Sessions.Clear();
            HasPendingAdoption = false;
        }
    }

    public async Task RequestOtpAsync()
    {
        if (string.IsNullOrWhiteSpace(Email) || !Email.Contains("@"))
        {
            ErrorMessage = "Please enter a valid email address.";
            return;
        }

        IsLoading = true;
        ErrorMessage = null;
        StatusMessage = null;

        try
        {
            bool ok = await _authService.RequestOtpAsync(Email.Trim());
            if (ok)
            {
                IsOtpSent = true;
                StatusMessage = "Verification code sent to your email.";
            }
            else
            {
                ErrorMessage = "Failed to request code. Please try again.";
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task VerifyOtpAsync()
    {
        if (string.IsNullOrWhiteSpace(OtpCode) || OtpCode.Trim().Length < 4)
        {
            ErrorMessage = "Please enter the verification code.";
            return;
        }

        IsLoading = true;
        ErrorMessage = null;
        StatusMessage = null;

        try
        {
            await _authService.VerifyOtpAsync(Email.Trim(), OtpCode.Trim());
            IsOtpSent = false;
            OtpCode = string.Empty;
            StatusMessage = "Successfully signed in.";

            await CheckPendingAdoptionAsync();
            await _syncEngine.SyncOnceAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task CheckPendingAdoptionAsync()
    {
        try
        {
            bool hasData = await _adoptionService.HasLocalDataToAdoptAsync();
            if (hasData)
            {
                int count = await _adoptionService.GetLocalEntityCountAsync();
                PendingAdoptionCount = count;
                HasPendingAdoption = count > 0;
            }
            else
            {
                HasPendingAdoption = false;
            }
        }
        catch
        {
            HasPendingAdoption = false;
        }
    }

    public async Task AdoptDataAsync()
    {
        IsLoading = true;
        ErrorMessage = null;

        try
        {
            int adopted = await _adoptionService.AdoptLocalDataAsync();
            HasPendingAdoption = false;
            StatusMessage = $"Adopted {adopted} local items for cloud sync.";
            await _syncEngine.SyncOnceAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task LogoutAsync()
    {
        IsLoading = true;
        try
        {
            await _authService.LogoutAsync();
            StatusMessage = "Signed out.";
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task LoadSessionsAsync()
    {
        if (!IsAuthenticated)
        {
            return;
        }

        try
        {
            var list = await _authService.ListSessionsAsync();
            Sessions.Clear();
            foreach (var item in list)
            {
                Sessions.Add(item);
            }
        }
        catch
        {
            // Ignore session load failure in offline mode
        }
    }

    public async Task RevokeSessionAsync(string? sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return;
        }

        try
        {
            await _authService.RevokeSessionAsync(sessionId);
            await LoadSessionsAsync();
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }

    public async Task DeleteAccountAsync()
    {
        IsLoading = true;
        try
        {
            bool ok = await _authService.DeleteAccountAsync();
            if (ok)
            {
                StatusMessage = "Account deleted.";
            }
            else
            {
                ErrorMessage = "Failed to delete account.";
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }
}
