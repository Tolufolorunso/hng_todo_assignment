using System;
using System.Diagnostics;
using System.Text.RegularExpressions;

namespace TaskFlow.Services;

public class LauncherService : ILauncherService
{
    private readonly Action<string>? _openUriAction;

    public LauncherService(Action<string>? openUriAction = null)
    {
        _openUriAction = openUriAction;
    }

    public string FormatEmailUri(string emailAddress, string? subject = null, string? body = null)
    {
        var uri = $"mailto:{emailAddress.Trim()}";
        var queryParams = new System.Collections.Generic.List<string>();

        if (!string.IsNullOrWhiteSpace(subject))
        {
            queryParams.Add($"subject={Uri.EscapeDataString(subject.Trim())}");
        }

        if (!string.IsNullOrWhiteSpace(body))
        {
            queryParams.Add($"body={Uri.EscapeDataString(body.Trim())}");
        }

        if (queryParams.Count > 0)
        {
            uri += "?" + string.Join("&", queryParams);
        }

        return uri;
    }

    public string FormatPhoneUri(string phoneNumber)
    {
        var clean = Regex.Replace(phoneNumber.Trim(), @"[^\d+]", string.Empty);
        return $"tel:{clean}";
    }

    public string FormatWhatsAppUri(string whatsAppNumber, string? text = null)
    {
        var digitsOnly = Regex.Replace(whatsAppNumber.Trim(), @"\D", string.Empty);
        var uri = $"https://wa.me/{digitsOnly}";

        if (!string.IsNullOrWhiteSpace(text))
        {
            uri += $"?text={Uri.EscapeDataString(text.Trim())}";
        }

        return uri;
    }

    public bool LaunchEmail(string emailAddress, string? subject = null, string? body = null)
    {
        var uri = FormatEmailUri(emailAddress, subject, body);
        return LaunchUri(uri);
    }

    public bool LaunchPhone(string phoneNumber)
    {
        var uri = FormatPhoneUri(phoneNumber);
        return LaunchUri(uri);
    }

    public bool LaunchWhatsApp(string whatsAppNumber, string? text = null)
    {
        var uri = FormatWhatsAppUri(whatsAppNumber, text);
        return LaunchUri(uri);
    }

    public bool LaunchUrl(string url)
    {
        return LaunchUri(url);
    }

    private bool LaunchUri(string uri)
    {
        try
        {
            if (_openUriAction != null)
            {
                _openUriAction(uri);
                return true;
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = uri,
                UseShellExecute = true
            });
            return true;
        }
        catch
        {
            return false;
        }
    }
}
