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
- Complication: `targets/watch-widget/` (WidgetKit, type `watch-widget`,
  product `DidIWatchWidget`, bundle id
  `com.aaronbryant.didi.watchkitapp.widget`, embedded in the watch app).
  Its `Info.plist` version must match `app.json` too.
- The App Group on the watch is shared by the watch app and the complication.
  It does not move data between iPhone and watch: they are separate devices.
  Data crosses with WatchConnectivity.
- Sync: `modules/didi-watch` (iOS only Expo module) activates `WCSession`.
  `native/widget-sync.js` sends the Tonight widget props through
  `native/watch-sync.js` (`updateApplicationContext`). A watch tap comes
  back with `sendMessage` when the phone is in reach (this wakes the iPhone
  app, so it saves at once), else `transferUserInfo`, which only arrives when
  the iPhone app next runs. `native/NativeApp.jsx` saves it with
  `applyWidgetTapOnce` (same as a widget tap) and sends the cards again.
  Did we cards stay off the watch.
- Watch strings: every word on the watch and the complication comes from the
  phone in its language (`widget.tonight.*` and `watch.*` keys, sent with the
  cards; the watch fills `{n}`, `{a}`, `{b}`). Before the first cards arrive
  the watch shows English fallbacks (`String(localized:)`).
- Look, buddy, streak: with the cards the phone also sends `colors` (the
  look's dark colours: accent, ink, soft, card, card2, line, bg), `buddy`
  (`parts` from `src/lib/buddy-parts.js` plus worn `behind`/`front` from
  `wornShapes`, the widget part format), `streak` (`shelfStreak`, 0 in gentle
  mode), `streakLabel`/`streakOneLabel` and `cheer` (look tones for the burst).
  All optional: cards from an older phone build draw in the lime palette with
  no buddy. `buddy-parts.js` is a copy of the widget's `BUDDY` table;
  `npm test` checks they match.
- Screens: a ring just inside the screen edge fills as questions are
  answered; buddy, folder and "a of b", the question, then Not yet and Did.
  Done: buddy over a moon with the streak. The answer that finishes the
  night plays a success haptic and a short burst (no burst with Reduce Motion).

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
  `IOS_WATCH_PROVISIONING_PROFILE` or `IOS_WATCH_WIDGET_PROVISIONING_PROFILE`
  is missing. The check also builds the complication and checks it sits in
  `DidIWatch.app/PlugIns`.

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
5. Same again for the complication: App ID `Did I Watch Complication`,
   bundle id `com.aaronbryant.didi.watchkitapp.widget`, App Groups on
   with `group.com.aaronbryant.didi`; App Store profile `Did I Watch
   Complication App Store` with the same certificate; base64 it into the
   secret `IOS_WATCH_WIDGET_PROVISIONING_PROFILE`.
6. Run Actions > iOS watch check once and make sure it is green.
7. Set the repo variable `DIDI_WATCH` to `1` (Settings > Secrets and
   variables > Actions > Variables). The next ios-ipa run includes the watch app.
8. Nothing to add in App Store Connect: the watch app rides in the iPhone
   app's record. After the first build with it, App Store Connect asks for
   Apple Watch screenshots on the next version page before release review
   (not for TestFlight).

The main app and widget profiles do not need to be remade for this.

## The plan

1. **Setup (this step).** Empty watch app ("Did I", "Open Did I on your
   iPhone") that compiles in CI and embeds in the iPhone app. Signing steps
   above.
2. **Watch screen and sync (built, not yet tested on a real watch).** iPhone sends tonight's cards for the chosen tag
   (the same props the Tonight widget gets from `buildTonightWidgetProps`)
   to the watch with WatchConnectivity `updateApplicationContext` whenever
   Tonight changes. The watch shows one card at a time with Did and Not yet.
   A tap goes back with `transferUserInfo` (queued if the phone is away) and
   the iPhone saves it through the same path a widget tap uses, then sends
   the new cards back. Needs a small native module in the iPhone app for
   `WCSession`.
3. **Complication (built, not yet tested on a real watch).** A `watch-widget` target (WidgetKit) showing "1 of 3"
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

# Wear OS app

Same screens as the Apple Watch app, for Android watches. Built, not yet
run on a real watch or a Wear emulator.

## How it is built

- Module: `android/wear`, its own Gradle build (not in `android/settings.gradle`,
  so the React Native build is untouched). Kotlin, Compose for Wear OS,
  minSdk 30, AGP and Kotlin pinned to the phone build's versions.
  Build: `android/gradlew -p android/wear assembleDebug` (Windows:
  `cd android; .\gradlew.bat -p wear assembleDebug`).
- Package `com.aaronbryant.didi`, the same as the phone app, so Play pairs
  them in one listing. Manifest: `android.hardware.type.watch` and
  `com.google.android.wearable.standalone=false` (needs the phone).
  `versionCode` is 1,000,000,000 + the run number so it never clashes with
  the phone bundle in the same release.
- Sync uses the Wearable Data Layer (`play-services-wearable` on both sides):
  - Phone to watch: `native/widget-sync.js` sends the Tonight widget props
    through `native/watch-sync.js` (same `watchCardsFromProps` as iOS; on
    Android `openPhoneLabel` is `watch.openPhoneAndroid`). `WatchModule`
    (`android/app/.../watch/`, React module `DidIWatch`) puts the JSON in a
    data item at `/didi/cards` (urgent). The item stays, so a watch that
    connects later still gets it. The watch's `CardsListenerService` stores it
    (also when the watch app is closed) and the app re-reads it on resume.
  - Watch to phone: a message at `/didi/tap` when the phone is connected,
    else a data item under `/didi/tap/`, which the Data Layer delivers when
    the phone is back. The phone's `WatchTapService` saves either one with
    `WidgetTapStore.commit` and `WidgetCardStore.advance`, the same as a home
    screen widget tap, before any JS runs. Then: if the app is running it
    emits `onWatchTap` and `NativeApp.jsx` takes the queue
    (`applyPendingAndroidWidgetTap`); otherwise the widget headless task, or
    the next app open, takes it. The cards go back to the watch afterwards.
  - The watch keeps its own taps for 10 minutes and shows them answered over
    any cards that still show them open, so a tap does not flicker back while
    the phone catches up. A tap the phone refused shows open again after that.
- Screens (`MainActivity.kt`, mirrors `DidIWatchApp.swift`): ring at the edge
  (an arc on round screens, a rounded square on square ones), buddy from shape
  parts (`drawPart`, same math as `BuddyPartView`), "folder · a of b", the
  question, Not yet (small, clock) and Did (large, check). Done: buddy over a
  moon with the streak or "N not yet". The answer that finishes the night
  plays a confirm haptic and the burst in cheer colours; animations off
  (animator duration scale 0) means no burst and no ring animation.
- Tile (`DidITileService.kt`): "N left tonight" or "All done" with a ring;
  tap opens the app. Updated when cards arrive or a tap is made.
- Strings: from the phone like the Apple Watch. Before the first cards the
  watch shows English fallbacks from `android/wear/src/main/res/values/strings.xml`.

## CI

- `.github/workflows/wear-check.yml`: builds the wear debug APK on pull
  requests that touch `android/wear/**`, no secrets.
- `.github/workflows/android-apk.yml`: with the release keystore secrets set,
  also builds `did-i-wear-aab` (signed with the same upload key).

## Play Console steps before the first Wear release

1. Play Console > the Did I app > Test and release > Advanced settings >
   Form factors > add **Wear OS**, and opt in.
2. Store listing > Wear OS: at least one Wear screenshot (square, 384x384 or
   larger, no device frame), and the Wear OS listing text if asked.
3. Upload `did-i-wear-aab` in the same release as the phone AAB (Internal
   testing first). The Wear OS track may need its own release on newer
   consoles: pick the Wear OS form factor in the track dropdown.
4. Wear OS app review runs separately from the phone review; the first one
   checks the quality guidelines (round screens, black background, no cut-off text).

## Not yet on Wear OS

- Not run on a watch or Wear emulator yet (no Wear system image installed).
- No complication (only the tile).
- No Wear screenshots.
