# TaskFlow Privacy Policy

TaskFlow is personal productivity software engineered with a local-first, privacy-respecting architecture. Your tasks, notes, follow-up commitments, daily plans, and inbox captures belong entirely to you.

## Core Privacy Commitments

1. **Local-First Storage by Default**:
   All user content is stored locally on your device:
   - Web: browser IndexedDB storage (`taskflow_db`).
   - Mobile: isolated SQLite database via native driver.
   - Windows: local SQLite database in `%LOCALAPPDATA%\TaskFlow\taskflow.db`.
   The application is fully functional offline without an account, internet connection, or telemetry.

2. **Zero Telemetry and Zero Tracking**:
   TaskFlow contains:
   - No advertising SDKs.
   - No behavioral trackers or session replay tools.
   - No commercial analytics frameworks.
   - No third-party data brokers or device fingerprinting.

3. **Explicit Opt-In Cloud Synchronization**:
   Cloud synchronization is strictly opt-in:
   - Requires explicit sign-in via passwordless email verification codes (OTP).
   - Only productivity data you create is synchronized via HTTPS/TLS 1.3 to the TaskFlow sync service.
   - Passwords are never stored on your device or in cloud storage.
   - Session credentials on Windows are encrypted on disk using the Windows Data Protection API (DPAPI).
   - Session credentials on Mobile are stored in secure platform storage.

4. **Content-Free Operational Logging**:
   Server-side operational logs are strictly content-free:
   - Task descriptions, note bodies, contact numbers, email addresses, OTP codes, session tokens, and passwords are never written to server logs.
   - Server logs capture only opaque entity identifiers, revision counters, timestamp metadata, and sanitized HTTP status codes for diagnostics.

5. **Notification and Communication Disclosures**:
   - Web Push: delivered via standardized Web Push protocol using VAPID authentication. You can choose generic preview mode (hiding task titles and note excerpts from notification popups) or disable push at any time.
   - Mobile: uses local native notification scheduling without transmitting content to third-party notification servers.
   - Windows: uses local toast notifications and URI handlers (mailto, tel, whatsapp) to launch your default apps. No background communications are sent automatically.

6. **Complete Data Portability and Account Deletion**:
   - You can export a full JSON backup of your productivity data at any time from Settings.
   - You can permanently delete your cloud account at any time using the in-app Delete Account option or via `DELETE /api/v1/account`. Account deletion triggers an atomic cascade deletion that completely purges all tasks, notes, follow-ups, occurrences, plans, inbox captures, task orders, receipts, tombstones, push subscriptions, and sessions from the server database.

## Platform Policies

For detailed platform-specific notices:
- Web: `/privacy`
- Mobile: `apps/mobile/PRIVACY.md`
- Windows: `apps/windows/PRIVACY.md`
