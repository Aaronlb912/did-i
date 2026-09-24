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
| Navigation | `native/navigation/hash.js` |
| Routing | `native/screens/ScreenRouter.jsx` |
| Shell + tabs | `native/AppShell.jsx` |
| Gem IAP | `native/iap/gem-store.js` + `supabase/functions/gem-iap` |

Metro aliases `site/hash.js` and `lib/native.js` on iOS/Android.

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
- Family, inbox, sent, everyone (when DIT on)
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
`VITE_LEGAL_EMAIL`, `VITE_WEB_APP_URL`, `VITE_DIT_ENABLED`, `VITE_REPORT_URL`,
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

`npx expo export --platform android` bundles cleanly for smoke tests.
Local: `npm run android:build` after a dev client install.

Gem purchases need a dev build on a real device (not Expo Go). See `docs/iap.md`.

## Web app

`npm run dev` serves the Vite app at `src/App.jsx`. Native uses `index.js` and
`native/`.
