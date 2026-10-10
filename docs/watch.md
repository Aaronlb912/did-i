# Apple Watch app

A small watch app that ships inside the iPhone app. It shows tonight's
questions and lets you tap Did or Not yet from your wrist. The iPhone app
saves the answer, the same way a widget tap is saved.

## How it is built

- Package: `@bacons/apple-targets` (~5.0.0). It reads `targets/*/expo-target.config.json`
  at `expo prebuild` and adds each folder as an Xcode target.
- Target: `targets/watch/` (SwiftUI, watchOS 10.0, product `DidIWatch`,
  display name "Did I", bundle id `com.aaronbryant.didi.watchkitapp`,
  team `2ZUKFKSSV8`, App Group `group.com.aaronbryant.didi`, icon from
  `public/icon-512.png`).
- Opt-in: the target is only added when `DIDI_WATCH=1` (see `app.config.js`).
  Without it, prebuild and every build are the same as before.
- `targets/watch/Info.plist` holds `CFBundleShortVersionString`. It must match
  `version` in `app.json` or App Store Connect rejects the upload.
  `npm test` checks this, so bump both together.
- The App Group is shared for future use (a watch complication extension).
  It does not move data between iPhone and watch: they are separate devices.
  Data crosses with WatchConnectivity (step 2).

## CI

- `.github/workflows/ios-watch-check.yml` runs on pull requests that touch
  `targets/**`, app config, `package.json`, the lock file, `plugins/` or
  `patches/`, and by hand from Actions. It prebuilds with `DIDI_WATCH=1`,
  checks the watch target is in the Xcode project, builds the watch target
  for watchOS Simulator, builds the `DidI` scheme for iOS Simulator, and
  checks `DidI.app/Watch/DidIWatch.app` is embedded. `CODE_SIGNING_ALLOWED=NO`,
  no secrets, no upload, no build number bump.
- `.github/workflows/ios-ipa.yml` adds the watch app only when the repo
  variable `DIDI_WATCH` is `1`. Until then TestFlight builds are unchanged.
  With `DIDI_WATCH=1` and signing secrets set, the job stops early if
  `IOS_WATCH_PROVISIONING_PROFILE` is missing.

## What the owner must do before `DIDI_WATCH=1` in ios-ipa

Signing in `ios-ipa.yml` is manual: one distribution certificate plus one
App Store provisioning profile per bundle id. The watch app needs its own.

1. developer.apple.com > Certificates, IDs & Profiles > Identifiers > +
   > App IDs > App.
   - Description: `Did I Watch`
   - Bundle ID (explicit): `com.aaronbryant.didi.watchkitapp`
   - Capabilities: tick **App Groups**. Save.
2. Open the new identifier > App Groups > Configure > tick
   `group.com.aaronbryant.didi` (the group the app and widgets already use).
   Save.
3. Profiles > + > Distribution > **App Store Connect**. App ID
   `com.aaronbryant.didi.watchkitapp`. Pick the same distribution certificate
   as the other profiles (the one in `IOS_DIST_CERT_P12`). Name it
   `Did I Watch App Store`. Download the `.mobileprovision`.
4. Base64 it (PowerShell:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes("Did_I_Watch_App_Store.mobileprovision"))`)
   and save it as the GitHub secret `IOS_WATCH_PROVISIONING_PROFILE`
   (Settings > Secrets and variables > Actions).
5. Run Actions > iOS watch check once and make sure it is green.
6. Set the repo variable `DIDI_WATCH` to `1` (Settings > Secrets and
   variables > Actions > Variables). The next ios-ipa run includes the watch app.
7. Nothing to add in App Store Connect: the watch app rides in the iPhone
   app's record. After the first build with it, App Store Connect asks for
   Apple Watch screenshots on the next version page before release review
   (not for TestFlight).

The main app and widget profiles do not need to be remade for this.

## The plan

1. **Setup (this step).** Empty watch app ("Did I", "Open Did I on your
   iPhone") that compiles in CI and embeds in the iPhone app. Signing steps
   above.
2. **Watch screen and sync.** iPhone sends tonight's cards for the chosen tag
   (the same props the Tonight widget gets from `buildTonightWidgetProps`)
   to the watch with WatchConnectivity `updateApplicationContext` whenever
   Tonight changes. The watch shows one card at a time with Did and Not yet.
   A tap goes back with `transferUserInfo` (queued if the phone is away) and
   the iPhone saves it through the same path a widget tap uses, then sends
   the new cards back. Needs a small native module in the iPhone app for
   `WCSession`.
3. **Complication.** A `watch-widget` target (WidgetKit) showing "1 of 3"
   (answered of tonight's questions) for the circular, rectangular and inline
   faces. Reads the last cards the watch app stored in its own App Group.
4. **TestFlight pass.** Turn on `DIDI_WATCH=1`, ship a build, test on a real
   watch: fresh install, phone locked, phone out of range, tag switch,
   midnight rollover, answer on phone then on watch.

## v1 does not include

- A watch app that works without the iPhone (no sign-in, no network on the
  watch).
- Adding or editing questions, tags, shop, cheers, family or streak screens.
- Notifications built for the watch (it mirrors iPhone notifications as usual).
- Android Wear.
