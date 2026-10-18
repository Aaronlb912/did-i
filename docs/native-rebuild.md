# React Native rebuild

The native app lives in `native/`. Business logic stays in `src/lib/*.js`.
Screens are rebuilt in React Native. Expo is the native target.

## Run it

```bash
npm run expo:dev
```

Use a **development build** on the phone (not Expo Go). iPhone from Windows:
`docs/iphone-preview.md`. Android: `npm run android:build` once, then
`npm run expo:dev`. Supabase client keys ship in `env.client.js` and load
through `app.config.js` into `src/lib/env.js` (override with `.env.local`).

## Architecture

| Layer | Where |
|-------|--------|
| Night maths, purse, board ops, people | `src/lib/` |
| Tonight stack | `src/lib/useTonightStack.js` |
| Shelf + sync | `native/hooks/useAppShelf.js` |
| Navigation | `native/navigation/hash.js` (`goHash` over a native stack) |
| Routing | `native/screens/ScreenRouter.jsx` |
| Shell, stack screens | `native/AppShell.jsx` |
| Gem IAP | `native/iap/gem-store.js` + `supabase/functions/gem-iap` |

Metro aliases `site/hash.js` and `lib/native.js` on iOS/Android.

Every route is its own `@react-navigation/native-stack` screen, named by its
path and pushed over the hall, which holds Tonight and Questions in the
system tab bar (`@react-navigation/bottom-tabs/unstable`: a UITabBar on iOS,
the Material 3 navigation bar on Android). `goHash` stays the one call screens make: a
route already in the stack is popped back to, anything else is pushed. Back
is the platform's own (iOS edge swipe, Android system back with predictive
back on), so there is no custom swipe layer.

Headers are the platform's too (`native/components/AppHeader.jsx`): on iOS
the native-stack navigation bar with a large title that shrinks into it, on
Android a Material 3 medium top app bar drawn in the page. UIKit only tracks
a scroll view a few first subviews down, and Fabric orders subviews by
zIndex, so keep `BoardShell`'s scroll view first and its wrappers unpainted
and without a zIndex, or the large title stops collapsing. Settings pickers
(`native/components/SetChoice.jsx`) are `@expo/ui` menus and sheets.

Android keeps the brand with Material 3 chrome: rows ripple (`native/lib/ripple.js`)
and switches are native M3 switches. Both platforms share one menu list,
`native/components/mast-menu-items.js`.

## Visual parity

Native chrome is kept in step with the web hall:

| Web | Native |
|-----|--------|
| `.di-jewel` | `native/components/Jewel.jsx` |
| `.di-face` | `native/lib/face-card.js` + `SwipeCard` |
| `.di-set` cards/rows | `native/components/SetBits.jsx` |
| `data-heat` / `data-hour` | `native/components/HallAmbient.jsx` |
| Mast back chevron | `native/components/BackChevron.jsx` |
| `--di-*` looks | `native/theme.js` |

Run `npm run theme:sync` after adding a look in `did-i.css`. CI runs it in
`npm run check`.

Fonts: Inter and JetBrains Mono on web (`did-i.css`) and native (`expo-font`
via `native/useAppFonts.js`). `native/theme.js` picks expo font names on device
and CSS family names under react-native-web.

Visual regression at 390px:

```bash
npx playwright install chromium
npm run visual
```

`scripts/visual/compare.mjs` screenshots paired web and native fixtures from
`visual.html` and fails when pixel drift exceeds the cap in
`scripts/visual/targets.mjs`. CI runs this in `.github/workflows/visual.yml`.

## Shipped

Parity with the web app shell:

- Tonight: swipe, meter, tags, pills, finish/rest, holes, wait, pill plate,
  week strip, FamilyTonight, starter picks, undo
- Questions: list, add/edit, lamp detail (notes, duplicate, night strip), search
- Shop: hub, looks, cheers, buddies, gems (IAP framework), collection
- Settings: theme, locale, keeper, PIN, JSON send/load, click sound, hide marks,
  ink note, empty board, leave board, People row, legal links
- Account: sign-in, devices, export, sync
- People: profile, invite, send Did I, friends (cheer, gift, block, report)
- Family, inbox, sent
- About, help, later, marks, ideas, stats, feed, calendar, streaks, tags (me)
- Welcome, enter, first night, pings (permission wired)
- Privacy and Terms in-app
- Cloud sync on launch (`pullAndMerge`)
- Offline banner, clipboard fallback, cheer burst, error boundary
- MMKV storage shim

## Build

**Default: GitHub Actions** (no Mac required for Android).

| Platform | Workflow | Artifact |
|----------|----------|----------|
| Android internal APK | Actions → **Android APK** (`android-apk.yml`) | `assembleRelease` APK |
| iOS store / TestFlight | Actions → **iOS IPA** (`ios-ipa.yml`) on `macos-14` | signed `.ipa` when signing secrets are set; else unsigned `.xcarchive` |

Repo `android/` is committed; the Android workflow runs
`:app:assembleRelease` (arm64-v8a, release). Install the APK from the workflow
artifact.

### CI speed (GitHub Actions)

**check.yml** runs `npm run check` on every push to `master` / `main` and on PRs.
**Android APK** and **iOS IPA** are `workflow_dispatch` only; they still run check
by default, with an optional **Run npm run check** input to skip when you just
pushed and `check` already passed.

Both native workflows use a `concurrency` group so a new run on the same branch
cancels the previous one (90-minute cap on Android, 120 on iOS).

Measured on successful runs before the arm64 / cache pass (Sep 2026):

| Workflow | Step | Wall time |
|----------|------|-----------|
| Android APK | `:app:assembleRelease` | ~53 min of ~54 min total |
| Android APK | `npm run check` | ~3 s |
| iOS IPA | `xcodebuild archive` (signed) | ~14 min of ~19 min total |
| iOS IPA | TestFlight upload | ~1.5 min |
| iOS IPA | `pod install` | ~1 min |

**Expected after optimizations** (first run after a native bump is still slow;
second run on the same lockfile / sources is the warm case):

| Workflow | Before (typical) | After (warm cache) | After (cold) |
|----------|------------------|--------------------|--------------|
| Android APK | ~54 min | ~12–18 min | ~25–35 min |
| iOS IPA | ~15–19 min | ~8–12 min | ~15–19 min |

Changes that drive most of the Android win:

- CI builds **arm64-v8a only** (`-PreactNativeArchitectures=arm64-v8a`). Real
  phones since ~2019; not for x86 emulators. Widget code is unchanged.
- `:app:assembleRelease --build-cache` (no `clean`), plus caches for
  `android/.gradle`, `android/app/.cxx`, and `~/.gradle/caches/build-cache-1`.
- `setup-java` still caches dependency jars under `~/.gradle/caches`.

iOS:

- Runner pinned to **macos-14** (Apple Silicon) instead of a moving `macos-latest`.
- **DerivedData** cache keyed after `prebuild` + `Podfile.lock`.
- Pods cache key includes `ios/Podfile.lock`; `pod install --deployment` when
  the restored `Pods` tree matches the lockfile.
- `.expo-export-ios` still skips `expo export` on cache hit.

Gradle on CI does **not** use configuration-cache (React Native / Expo remain
too brittle). No remote Gradle Enterprise cache. Widget prebuild stays on
(`EAS_INCLUDE_WIDGETS=1` on iOS; committed `android/` includes the widget).

**Larger runners:** GitHub-hosted `macos-14` / `ubuntu-latest` are included in
the free tier minutes pool; **larger** runners (more CPU/RAM) are billed per
minute and rarely worth it until caches are warm. **macos-15** / `macos-latest`
can be faster when GitHub moves the label, but pinning `macos-14` avoids surprise
image changes.

If a workflow looks wrong after a native or dependency bump, re-run once. If it
still fails, bump the cache by changing the `key` suffix in the workflow (e.g.
`-v2`) or clear caches under **Actions → Caches**. Stale `.expo-export-ios`,
`Pods`, or DerivedData usually show up as missing modules or pod resolution
errors, not silent bad binaries.

### GitHub Actions → TestFlight (iOS)

Workflow: **Actions → iOS IPA → Run workflow** (`workflow_dispatch`). By default
it runs `npm run check`, `expo export` (skipped when export cache hits), `expo
prebuild` (widgets on), `pod install`, then archives **DidI**. It does **not**
submit for App Store review. When App Store Connect API secrets are set, it
uploads the IPA for TestFlight processing only.

**Where to add secrets:** GitHub repo → **Settings → Secrets and variables →
Actions → New repository secret**. Names only (never commit values):

| Secret | What it is |
|--------|------------|
| `IOS_DIST_CERT_P12` | Base64 of the **Apple Distribution** `.p12` (Distribution cert + private key). |
| `IOS_DIST_CERT_PASSWORD` | Password you set when exporting the `.p12`. |
| `IOS_PROVISIONING_PROFILE` | Base64 of the **App Store** profile for `com.aaronbryant.didi` with **App Groups** (`group.com.aaronbryant.didi`), Sign in with Apple, push if used. |
| `IOS_WIDGET_PROVISIONING_PROFILE` | Base64 of the App Store profile for `com.aaronbryant.didi.widgets` (same App Group). Required for widget builds; see `docs/widgets.md`. |
| `GOOGLE_SERVICES_PLIST` | Base64 of repo-root `GoogleService-Info.plist` (gitignored; push/Firebase). Written before prebuild. |
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID from [App Store Connect → Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api). |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID on the same page. |
| `APP_STORE_CONNECT_API_KEY_P8` | Base64 of the downloaded `AuthKey_XXXXXX.p8` (Admin or App Manager role). |

Optional overrides (usually unnecessary; defaults live in `env.client.js` via
`app.config.js`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_LEGAL_EMAIL`, `VITE_WEB_APP_URL`, `VITE_REPORT_URL`,
`VITE_APPLE_AUTH` — same names as `.env.example`.

**Export credentials from EAS into GitHub (no secrets in the repo):**

1. [Expo credentials](https://expo.dev/accounts/abryant/projects/did-i/credentials) → **com.aaronbryant.didi** → **Distribution Certificate** → download `.p12` (or export from Keychain on a Mac that has it). On your machine: `base64 -i YourCert.p12 | pbcopy` (Windows: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('cert.p12'))` in PowerShell) → paste into `IOS_DIST_CERT_P12`.
2. Same page → **Provisioning Profile** → download `.mobileprovision` for the main app → base64 → `IOS_PROVISIONING_PROFILE`.
3. Open **com.aaronbryant.didi.widgets** on Expo credentials (or [Apple Identifiers](https://developer.apple.com/account/resources/profiles/list)) → download the widget App Store profile → base64 → `IOS_WIDGET_PROVISIONING_PROFILE`.
4. If profiles lack App Groups, fix identifiers first (`docs/widgets.md`), regenerate profiles on Apple, then refresh on Expo or download fresh `.mobileprovision` files.
5. Create an App Store Connect API key (Integrations → **Generate**), download the `.p8` once, base64 → `APP_STORE_CONNECT_API_KEY_P8`, plus Key ID and Issuer ID.

Without the three signing secrets (`IOS_DIST_CERT_*` + `IOS_PROVISIONING_PROFILE`),
the workflow still produces an **unsigned** archive artifact for smoke tests.
EAS remains a fallback (`docs/app-store-connect.md`).

### GitHub Actions → Android release signing and Play bundle

The release keystore lives on Expo (credentials `6i4VOCV-74`). Until GitHub
has a copy, **android-apk** signs with a throwaway debug key and skips the Play
bundle.

1. In the repo folder: `npx eas-cli credentials -p android` → pick
   **production** → **Keystore** → **Download existing keystore**. It saves a
   `.jks` file and prints the keystore password, key alias, and key password.
   Move the `.jks` into `C:\Users\aaron\Documents\did-i-secrets\`, never the repo.
2. Base64 it in PowerShell:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\Users\aaron\Documents\did-i-secrets\did-i.jks')) | Set-Clipboard`
3. GitHub repo → **Settings → Secrets and variables → Actions → New repository
   secret**, four times:

| Secret | Value |
|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | The clipboard from step 2 |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password from step 1 |
| `ANDROID_KEY_ALIAS` | Key alias from step 1 |
| `ANDROID_KEY_PASSWORD` | Key password from step 1 |

With all four set, a run makes **did-i-android-aab** (32- and 64-bit ARM, for
Play Console). Tick the **apk** input to also get **did-i-android-apk**
(arm64, for installing on a phone); it adds about 15 minutes, so store builds
skip it (2026-10-02). The first AAB you upload to Play sets this key as the upload key.
`versionCode` is the workflow run number, so each upload is higher than the
last. An APK signed this way installs over the old EAS internal builds, which
used the same key. It will not install over a debug-signed GitHub APK; remove
that one first.

## Dev app on an iPhone (no Mac)

"Did I Dev" (com.aaronbryant.didi.dev) is a dev client that installs next to the store app.

1. Actions, iOS IPA, run with **dev_app** checked. It builds Debug and uploads to the "Did I Dev" app in TestFlight.
   Signing profile secret: IOS_DEV_PROVISIONING_PROFILE.
2. Install it from TestFlight. Rebuild only when native code, packages or app config change.
3. On the PC: npm run expo:dev, then open Did I Dev and scan the QR code. Saves reload on the phone.

Not in the dev app: widgets, Apple and Google sign-in, Firebase, gem purchases. Test those on the store build.

## Dev build for the Android emulator

A debug APK with the dev client. It loads JS from Metro on the PC, so unmerged changes run on the emulator (AVD `did-i-play`, x86_64).

1. Actions, android-apk, run with **dev_client** checked (uncheck run_check to save time). It builds only `:app:assembleDebug` for x86_64 and arm64-v8a. No release APK, no AAB, no keystore.
2. `gh run download <run-id> -n did-i-android-dev`
3. It keeps the store id `com.aaronbryant.didi` (google-services.json has no `.dev` client, so a suffix breaks the build). It will not install over the Play build. Uninstall first:
   `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" uninstall com.aaronbryant.didi`
   then `"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" install -r app-debug.apk`
4. `npx expo start --dev-client --port 8081`
5. Open Did I on the emulator. Enter `http://10.0.2.2:8081` (the emulator's name for the PC). Or run `adb reverse tcp:8081 tcp:8081` and use `localhost:8081`.

Reinstall from Play to get the store build back. Play sign-in and gem purchases need the Play-signed build.

If Windows runs out of memory (exit code 3221225794), stop the emulator before heavy Metro or expo commands, then start it again.

## Update prompt (app_versions)

`supabase/app-version.sql` holds one row per platform: `latest` and `minimum`.
After a store release is approved and live, set that platform's `latest` to
the new version in the Supabase table editor. Phones on an older version see
"A new version of Did I is out" on Tonight (Not now hides it for a day).
Raise `minimum` only when an old version is really broken: phones below it
get a full screen with just the Update button. Only builds from 1.2.0 on
have the prompt.

## Over-the-air updates (expo-updates)

JS-only changes (screens, copy, `src/lib` logic, locales) can go out without a
store build:

```powershell
npm run update:prod
```

That publishes to the **production** channel. `npm run update:internal` goes to
EAS `internal` builds only. GitHub builds (APK and IPA) are not EAS builds, so
`app.config.js` asks for the production channel by default, and the Android
manifest does the same.

**Native changes still need a build.** Anything under `android/` or `modules/`, a new or
bumped native package, `app.config.js` plugins, entitlements, or the widget
extension. When you ship one, bump `version` in `app.json`, `versionName` in
`android/app/build.gradle`, and `expo_runtime_version` in
`android/app/src/main/res/values/strings.xml` to the same value
(`npm test` fails if they differ),
because `runtimeVersion` is the app version. An update only reaches
builds with the same version, so an old binary never gets JS it cannot run.

Why the app version and not a fingerprint: updates are published from Windows and the
builds run on Linux and macOS runners. A fingerprint hashes native files, and
line endings and machine differences can make the two disagree, so updates
would quietly never apply. The version is a plain string, the same everywhere.
Expo also refuses runtime policies in a project with a committed `android/`.
The cost is remembering the bump above.

1.3.1 (2026-10-06) adds `expo-battery` so card frames pause in low power mode, plus the light/dark splash. It goes
through `native/shim/battery-safe.cjs`, so a binary without the module (an
old dev client, say) never crashes; it just never pauses for low power.

The first build made after this change is the one that can take updates.
Builds 55 and older ignore them.

`npx expo export --platform android` bundles cleanly for smoke tests.
Local: `npm run android:build` after a dev client install.

Gem purchases need a dev build on a real device (not Expo Go). See `docs/iap.md`.

### Signed updates

A build with a certificate only runs updates signed with its private key, so a
stolen Expo login or `EXPO_TOKEN` cannot push code to phones. Turn it on once,
before a store build:

1. `npx expo-updates codesigning:generate --key-output-directory keys --certificate-output-directory certs --certificate-validity-duration-years 10 --certificate-common-name "Did I"`
2. `node scripts/updates-signing.mjs` (writes the certificate into the Android manifest; iOS reads it from `app.config.js` at prebuild).
3. Commit `certs/certificate.pem` and the manifest. `keys/` is ignored: never commit it.
4. GitHub > Settings > Secrets > Actions: `EXPO_UPDATES_PRIVATE_KEY` = the whole of `keys/private-key.pem`. Keep a copy somewhere safe; a lost key means a store build with a new certificate.
5. Bump `version` in app.json and build both apps.

From then on the ota-update workflow and `npm run update:prod` sign every
update and refuse to publish without the key. Phones on builds from before step
5 ignore the signature and keep taking updates.

## Web app

`npm run dev` serves the Vite app at `src/App.jsx`. Native uses `index.js` and
`native/`.
