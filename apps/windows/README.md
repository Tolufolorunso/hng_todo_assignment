# TaskFlow Windows

Standalone desktop client for Windows 10 and Windows 11, built with C# and WPF on .NET 10 LTS.

## Architecture and Scope

- **Target Platforms:** Windows 10 (build 17763 or higher) and Windows 11.
- **Framework:** C# / .NET 10 LTS with Windows Presentation Foundation (WPF) and MVVM architecture.
- **Persistence:** Local SQLite via `Microsoft.Data.Sqlite` with Windows-owned schema and migrations.
- **Platform Features:** Direct Windows URI launching for communications (mailto, WhatsApp URI, tel), local toast notifications, and signed MSIX distribution.
- **Engine:** Windows-owned synchronization client, recurrence engine, and rich-text parsing.
- **Milestone:** Scheduled for Milestone M (Feature 40: Windows WPF offline foundation).

## Isolation Boundaries

- `apps/windows` owns its own solution (`.sln`), project files (`.csproj`), and NuGet lockfile.
- No dependencies shared at runtime with web or mobile clients.
- Zero cross-application source imports: `apps/windows` never references or imports source code from `apps/web` or `apps/mobile`.
- Behavioral compatibility with sibling clients is validated solely through independent implementation and contract fixtures.
