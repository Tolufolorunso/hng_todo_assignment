# TaskFlow Mobile

Standalone React Native client for Android and iOS, built with Expo development builds and Continuous Native Generation.

## Architecture and Scope

- **Target Platforms:** Android and iOS (phone and tablet form factors).
- **Framework:** React Native with Expo Continuous Native Generation (CNG).
- **Persistence:** Mobile-owned SQLite schema and local migrations.
- **Navigation and UI:** Mobile-owned navigation, offline-first task and note views, and accessible touch interactions.
- **Engine:** Mobile-owned API adapter, sync engine, recurrence engine, and local-notification scheduler.
- **Milestone:** Scheduled for Milestone L (Feature 37: React Native offline foundation).

## Isolation Boundaries

- `apps/mobile` owns its own `package.json`, dependencies, and lockfile.
- No dependency hoisting with root or sibling applications.
- Zero cross-application source imports: `apps/mobile` never imports source code from `apps/web` or `apps/windows`.
- Behavioral compatibility with sibling clients is validated solely through independent implementation and contract fixtures.
