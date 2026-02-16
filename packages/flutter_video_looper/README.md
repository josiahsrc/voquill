# Flutter Video Looper

A native Flutter plugin for looping video playback with optional Picture-in-Picture (PiP) support on iOS and Android.

## Usage

```dart
import 'package:flutter_video_looper/flutter_video_looper.dart';

FlutterVideoLooper.asset(
  path: 'assets/videos/demo.mp4',
  isPipEnabled: true,
)
```

The widget plays the video in a loop with its natural aspect ratio. No playback controls are shown.

When `isPipEnabled` is `true`, the video automatically enters Picture-in-Picture mode when the user leaves the app.

## Setup

### Register your video asset

In your app's `pubspec.yaml`:

```yaml
flutter:
  assets:
    - assets/videos/demo.mp4
```

### iOS

**1. Enable Background Modes**

In Xcode, select your Runner target > Signing & Capabilities > + Capability > Background Modes, then enable:

- **Audio, AirPlay, and Picture in Picture**

Or add this to your `ios/Runner/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
</array>
```

**2. Minimum deployment target**

This plugin requires iOS 13.0+. In your `ios/Podfile`:

```ruby
platform :ios, '13.0'
```

### Android

**1. Enable PiP on your Activity**

In `android/app/src/main/AndroidManifest.xml`, add the following attributes to your `MainActivity`:

```xml
<activity
    android:name=".MainActivity"
    android:supportsPictureInPicture="true"
    android:configChanges="screenSize|smallestScreenSize|screenLayout|orientation"
    ...>
```

**2. Minimum SDK**

The plugin supports `minSdk 24`. PiP requires Android 8.0 (API 26) and auto-enters PiP on Android 12+ (API 31).

## How PiP works

| Platform | Behavior |
|---|---|
| **iOS** | Uses `AVPictureInPictureController`. Automatically starts PiP when the app enters background. |
| **Android 12+** | Uses `setAutoEnterEnabled(true)` for seamless PiP when navigating away. |
| **Android 8-11** | Enters PiP via `enterPictureInPictureMode()` when the app lifecycle becomes inactive. |
| **Android < 8** | PiP is not supported; the video pauses normally in background. |
