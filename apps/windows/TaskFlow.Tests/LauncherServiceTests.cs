using System.Collections.Generic;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class LauncherServiceTests
{
    [Fact]
    public void FormatEmailUri_BuildsValidMailtoUri()
    {
        var launcher = new LauncherService();
        var uri = launcher.FormatEmailUri("alice@example.com", "Project Status", "Here are the updates.");

        Assert.StartsWith("mailto:alice@example.com?", uri);
        Assert.Contains("subject=Project%20Status", uri);
        Assert.Contains("body=Here%20are%20the%20updates.", uri);
    }

    [Fact]
    public void FormatPhoneUri_StripsNonDialableCharacters()
    {
        var launcher = new LauncherService();
        var uri = launcher.FormatPhoneUri("+1 (555) 234-5678");

        Assert.Equal("tel:+15552345678", uri);
    }

    [Fact]
    public void FormatWhatsAppUri_FormatsWaMeLinkWithDigitsOnly()
    {
        var launcher = new LauncherService();
        var uri = launcher.FormatWhatsAppUri("+1 (555) 987-6543", "Hello there!");

        Assert.Equal("https://wa.me/15559876543?text=Hello%20there%21", uri);
    }

    [Fact]
    public void Launchers_InvokeInjectedCallback()
    {
        var launched = new List<string>();
        var launcher = new LauncherService(uri => launched.Add(uri));

        launcher.LaunchEmail("test@example.com");
        launcher.LaunchPhone("+1234567890");
        launcher.LaunchWhatsApp("+1234567890", "Hi");
        launcher.LaunchUrl("https://taskflow.local");

        Assert.Equal(4, launched.Count);
        Assert.StartsWith("mailto:test@example.com", launched[0]);
        Assert.Equal("tel:+1234567890", launched[1]);
        Assert.StartsWith("https://wa.me/1234567890", launched[2]);
        Assert.Equal("https://taskflow.local", launched[3]);
    }
}
