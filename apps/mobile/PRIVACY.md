# TaskFlow Mobile Privacy & Store Disclosures

This document details the privacy architecture and app store disclosure declarations for TaskFlow Mobile on iOS (Apple App Store) and Android (Google Play).

## 1. Core Privacy Architecture

- Local-first design: All tasks, notes, follow-up commitments, daily plans, and inbox captures are stored on-device in SQLite.
- Optional accounts: The app is fully functional without an account or internet connection.
- Optional synchronization: Cloud synchronization is initiated only when the user explicitly requests an email verification code and signs in.
- Zero tracking: TaskFlow contains no advertising SDKs, third-party behavioral analytics, crash reporters that transmit PII, or device fingerprinting.

## 2. Apple App Store Privacy Nutrition Labels

### Data Used to Track You
- None. TaskFlow does not track users across apps or websites owned by other companies.

### Data Linked to You
- Contact Info (Email Address):
  - Purpose: App Functionality / Account Management.
  - Linked to identity: Yes (when user chooses to create an account).
  - Optional: Yes (local mode requires no email).

### Data Not Linked to You
- User Content (Tasks, Notes, Follow Ups):
  - Purpose: App Functionality (productivity data).
  - Encrypted in transit: Yes (HTTPS / TLS 1.3).
  - Third-party sharing: Zero.

## 3. Google Play Data Safety Declaration

### Data Collected
- Email address:
  - Purpose: Account management and authentication via passwordless one-time passcodes.
  - Optional: Users can use the application entirely offline without an account.
- User content (in-app text, commitments, notes):
  - Purpose: Core productivity app functionality.
  - Ephemeral processing: No (stored in SQLite locally; synchronized to PostgreSQL if signed in).
- Communication targets (Phone numbers, WhatsApp numbers, email addresses for Follow Ups):
  - Purpose: Launching device phone, messaging, or email client directly on user tap.
  - Not uploaded to any global directory or shared with any third party.

### Security Practices
- Data encrypted in transit: All network communication uses HTTPS with modern cipher suites.
- Data deletion mechanism: Users can delete their cloud account directly within the app (Account Screen -> Delete Cloud Account), which permanently purges all cloud records.
- Independent privacy review: Verified via repository boundary checks and automated tests.
