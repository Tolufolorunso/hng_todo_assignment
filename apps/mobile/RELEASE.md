# TaskFlow Mobile Release & Device Verification Guide

This guide describes how to produce signed production release builds for Android and iOS and verify them on physical hardware.

## 1. Android Release Build (Google Play)

### Prerequisites
- Android SDK with API level 35 and Build Tools installed.
- Production keystore configured in `apps/mobile/android/keystore.jks`.

### Keystore Generation
```bash
keytool -genkey -v -keystore taskflow-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias taskflow-key
```

### Build Command
To produce a signed Android App Bundle (.aab):
```bash
cd apps/mobile/android
./gradlew bundleRelease
```
The output artifact is generated at:
`apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`

## 2. iOS Release Build (Apple App Store & TestFlight)

### Prerequisites
- macOS workstation with Xcode 16 or newer.
- Apple Developer Program membership.
- Distribution Certificate and App Store Provisioning Profile for `com.taskflow.app`.

### Build Command
To build and archive via Xcode CLI:
```bash
cd apps/mobile/ios
xcodebuild -workspace TaskFlow.xcworkspace \
  -scheme TaskFlow \
  -configuration Release \
  -archivePath build/TaskFlow.xcarchive \
  archive
```

To export the .ipa and upload to App Store Connect:
```bash
xcodebuild -exportArchive \
  -archivePath build/TaskFlow.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/
```

## 3. Physical Device Verification Protocol

Before submitting any build to Google Play or App Store Review, verify each requirement on a physical device:

### A. Touch Targets and Accessibility
1. Measure touch targets: Every button, input, and tab item must meet the minimum 44x44 dp requirement.
2. High contrast and themes: Switch between dark and light themes; verify all text maintains at least 4.5:1 contrast against surface backgrounds.
3. Accessibility labels: Run TalkBack (Android) or VoiceOver (iOS) and ensure every actionable control announces its purpose clearly.

### B. Offline Resilience and Restart
1. Launch the app in airplane mode.
2. Create tasks, notes, follow-ups, and daily plans.
3. Force-close the application from the app switcher.
4. Re-open the app in airplane mode; confirm all created entities persist without data loss.

### C. Lifecycle and Network Recovery
1. Sign in with a test account while connected to Wi-Fi.
2. Toggle airplane mode to ON.
3. Create a task while offline; notice the pending outbox mutation count increases by 1.
4. Send the app to the background.
5. Toggle airplane mode to OFF.
6. Bring the app to the foreground; verify `LifecycleService` detects the active state and network reconnection, triggers synchronization, and dequeues the pending mutation.

### D. Scheduled Notification Verification
1. Create a Follow Up due 2 minutes into the future.
2. Lock the device or switch to the home screen.
3. Verify the local notification arrives at the scheduled wall-clock time with action buttons to launch email, phone, or WhatsApp.
