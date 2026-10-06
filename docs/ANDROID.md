# Android app

NET CBT Simulator runs on Android in two ways:

|               | Android app (APK)                                   | Website installed from Chrome             |
| ------------- | --------------------------------------------------- | ----------------------------------------- |
| Offline       | From the first launch (everything is in the APK)    | After the first visit                     |
| Printing      | Android's print dialog (printer or Save as PDF)     | Chrome's print dialog                     |
| Back button   | Never leaves a running test, like the real terminal | Browser back                              |
| Your history  | Stored in the app; uninstalling deletes it          | Stored in Chrome's site data              |
| Needs hosting | No                                                  | Yes (for example the GitHub Pages deploy) |

The app is the same web app, bundled into a native shell with [Capacitor](https://capacitorjs.com/).
It needs Android 6.0 or later with an up-to-date Android System WebView (updated through the Play Store).

## Install the APK on a phone

1. Get `net-cbt-simulator-<version>.apk`: from a GitHub release, from the **Android APK** workflow's
   artifacts, or by [building it](#build-the-apk) yourself.
2. Copy it to the phone (USB cable, Google Drive, or send it to yourself) and open it.
3. Android asks you to allow installing apps from that source ("Install unknown apps"). Allow it for the app
   you opened the file with. Google Play Protect may say it does not recognise the developer; that is normal
   for apps installed outside the Play Store.

To update, install the newer APK over the old one; your history is kept. This only works when both APKs are
signed with the same key. The debug and release builds use different keys, so switching between them means
uninstalling first, which deletes your history (export it from **History** first).

## Install the website as an app

If the site is deployed, open it in Chrome, open the menu and choose **Install app** (or **Add to Home
screen**). It then opens without the browser bar and works offline after the first visit.

## What is different in the app

- **Printing.** The printable paper opens Android's print dialog. Pick a printer or **Save as PDF**.
- **History export** opens the share sheet, so you can save the backup to Files or Drive, or send it.
  **Import** opens the system file picker.
- **Sharing a paper.** "Share link" uses the public website address. If the app was built without one
  (`VITE_SITE_URL`, or `VITE_REPO_URL` naming a real GitHub repository with Pages), it shares the paper code
  instead; the code rebuilds exactly the same paper under **Open a paper code** on the dashboard.
- **Back button.** It closes an open dialog first. During a test it does nothing, as on the real CBT terminal
  (end the test with FINISH). Elsewhere it goes back, and on the first screen it sends the app to the
  background.
- **The exam clock keeps running** while the app is in the background, as in the real exam. If time ran out
  meanwhile, the paper is submitted when you return.

## Build the APK

Prerequisites:

- Node.js 20 or later.
- JDK 21, with `JAVA_HOME` pointing to it. Newer JDKs are too new for this project's Gradle version.
- The Android SDK with platform 35, with `ANDROID_HOME` pointing to it (or `sdk.dir` in
  `android/local.properties`). Android Studio installs both the JDK and the SDK.

```bash
npm ci
npm run android:sync          # build the website and copy it into android/
cd android
./gradlew assembleDebug       # Windows: gradlew assembleDebug
./gradlew assembleRelease     # signed when release signing is set up (see below)
```

The APKs are written to `android/app/build/outputs/apk/debug/` and `.../release/`. Install one on a phone
connected with USB debugging with `adb install -r <file>.apk`, or open the project in Android Studio with
`npm run android:open`.

Run `npm run android:sync` again after every change to the web app.

### Release signing

A release APK must be signed. Create a key once:

```bash
keytool -genkeypair -keystore net-cbt-release.jks -storetype PKCS12 -alias netcbt \
  -keyalg RSA -keysize 4096 -validity 10000
```

Then create `android/keystore.properties` (it is git-ignored; never commit it or the keystore):

```properties
storeFile=C:/path/to/net-cbt-release.jks
storePassword=your-password
keyAlias=netcbt
keyPassword=your-password
```

**Back up the keystore and its password.** Every update of an installed app must be signed with the same key;
if the key is lost, users have to uninstall (and lose their history) to install a new version. Without
`keystore.properties`, `assembleRelease` produces `app-release-unsigned.apk`, which cannot be installed.

### Versions

The app's `versionName` and `versionCode` come from `version` in `package.json` (1.2.3 gives versionCode
10203). Bump it before building a release.

### Icon and splash screen

The sources in `assets/` are rendered from the logo in `public/favicon.svg`. `npm run android:assets`
regenerates them and the Android launcher icons and splash screens.

## Continuous integration

`.github/workflows/android.yml` builds the APKs on pushes to `main`, on pull requests that touch the Android
project, on version tags and on demand:

- It always builds a debug APK and uploads it as the `android-apk` artifact.
- It also builds a signed release APK when these repository secrets exist:
  - `ANDROID_KEYSTORE_BASE64`: the keystore, base64-encoded (`base64 -w0 net-cbt-release.jks`, or in
    PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes('net-cbt-release.jks'))`);
  - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`.
- On a version tag such as `v1.0.0`, it attaches the APKs to the GitHub release.

CI builds set `VITE_REPO_URL` to the repository, so their share links point to its GitHub Pages site.

## Testing on a device or emulator

`npm run android:smoke` drives the **debug** app on a connected device or emulator (`adb devices`) through a
full test and the Android-specific behaviour: the back button during and after a test, going to the
background, the print dialog and the share sheet. Install the debug APK first. Release builds cannot be
automated because their WebView is not debuggable.

## Publishing on Google Play

Before the first upload:

- Choose an application id you own (for example `io.github.<your-name>.netcbt`) and set it in
  `capacitor.config.ts` and in `android/app/build.gradle` (`namespace` and `applicationId`), and move
  `MainActivity.java` and `PrintPlugin.java` to the matching Java package. The id can never change after
  the first upload.
- Build an app bundle with `./gradlew bundleRelease`; Google Play requires `.aab` files.
- Keep the "unofficial" disclaimer. The app is not affiliated with NUST.
