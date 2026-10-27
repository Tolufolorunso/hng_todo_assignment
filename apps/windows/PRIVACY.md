# TaskFlow Windows Privacy Policy

TaskFlow for Windows is engineered with a strict local-first, privacy-respecting architecture. Your personal productivity data, commitments, and notes belong entirely to you.

## 1. Local Data Storage

- All tasks, notes, follow-up commitments, daily plans, and fast captures are stored locally in an isolated SQLite database on your device: `%LOCALAPPDATA%\TaskFlow\taskflow.db`.
- No account registration or cloud connectivity is required to use the application. If you choose not to sign in, your data never leaves your Windows computer.

## 2. Windows DPAPI Credential Security

- When you choose to authenticate, session credentials (access tokens and refresh tokens) are encrypted on disk using the Windows Data Protection API (DPAPI) via `System.Security.Cryptography.ProtectedData` configured with `DataProtectionScope.CurrentUser`.
- Encryption keys are tied directly to your Windows user account security identifier (SID). No other local Windows user or external process can decrypt your stored session credentials.

## 3. Optional Cloud Synchronization

- Cloud synchronization is entirely opt-in.
- When enabled, data is transferred securely over HTTPS to the TaskFlow sync service using protocol version 1 (`POST /api/v1/sync`).
- Only data required for synchronizing your workspace (tasks, notes, follow-ups, daily plans, inbox captures, and task orders) is transmitted.
- Authentication uses passwordless email verification codes (OTP). TaskFlow never stores passwords on your device or in cloud storage.

## 4. Telemetry and Analytics

- TaskFlow Windows contains zero analytics SDKs, zero behavioral trackers, and zero third-party telemetry tools.
- No diagnostic reports or device fingerprints are gathered or shared with advertising networks or data brokers.

## 5. Communications Launching

- TaskFlow integrates with Windows URI handlers (mailto, tel, and WhatsApp URI) to allow one-click communication with your contacts.
- TaskFlow does not access your Windows Contacts store without explicit user action and does not send communications automatically in the background.

## 6. Account Deletion and Data Retention

- You may delete your account and all associated cloud data at any time directly within the Windows application via Account and Cloud Sync settings.
- Account deletion executes `DELETE /api/v1/account` on the server, purging all server-side records.
- Uninstalling the application or deleting `%LOCALAPPDATA%\TaskFlow` removes all local data permanently.
