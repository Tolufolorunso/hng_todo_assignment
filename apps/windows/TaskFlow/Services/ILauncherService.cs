namespace TaskFlow.Services;

public interface ILauncherService
{
    string FormatEmailUri(string emailAddress, string? subject = null, string? body = null);
    string FormatPhoneUri(string phoneNumber);
    string FormatWhatsAppUri(string whatsAppNumber, string? text = null);

    bool LaunchEmail(string emailAddress, string? subject = null, string? body = null);
    bool LaunchPhone(string phoneNumber);
    bool LaunchWhatsApp(string whatsAppNumber, string? text = null);
    bool LaunchUrl(string url);
}
