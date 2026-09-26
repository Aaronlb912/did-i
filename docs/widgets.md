# Home screen widgets

Did I ships a **Tonight** widget on iOS (WidgetKit via `expo-widgets`) and
Android (`react-native-android-widget`). Both read the same snapshot as the
app shelf: tonight's questions from every tag.

## Sizes

- **iOS:** small, medium, large, plus lock accessories (circle, rectangle, inline).
- **Android:** default **4×2** on the grid (same wide row as iOS medium), resizable down to **2×2** small or up wider. `minHeight` is two rows so the question and Did / Did not fit.

Home-screen sizes show **one question**, centered, on a dark card with the
look color as a ring. The name of the tag the showing question belongs to sits at the top in that color. A worn
buddy sits in the top right. **Did not** then **Did** sit in a row under the
question and mark tonight from the widget. Did not is the skip gray. Did is
the look color, with dark type, same as the Did button in the app.
The card stays inside the widget's rounded rect: only the outer stack uses
the widget frame, and that stack is clipped.
A glow look uses its own ring color. Tap the question to open Tonight with that
question focused. The link uses `didi://tonight?face=…` and does not change the
Tonight tag filter in the app.

## Pre-build sweep

From repo root:

```sh
npm run sweep
```

Runs `check`, web `build`, and Metro export for iOS and Android. Repeat
until it prints **Sweep clean** with no failures.

## Builds

Widgets are not in Expo Go. You need a **new dev or store build** after
changing widget code or `app.config.js` plugin settings.

**Store (TestFlight / App Store):**

```powershell
npm run ios:prepare:store
# Remove main provisioning profile on Expo credentials, then:
$env:CI=''
npm run ios:build:store:first
```

Fallback without the widget extension: `npm run ios:build:safe:first` (`docs/app-store-connect.md`).

**Dev client:**

```sh
eas build --profile development --platform ios
eas build --profile development --platform android
```

iOS requires **17.0+**. Did and Did not on the widget write the answer. The
phone picks that up when it is open, and again the next time it opens.

### iOS App Groups + provisioning

The main app and `com.aaronbryant.didi.widgets` both need **App Groups**
(`group.com.aaronbryant.didi`) on the Apple App ID **and** on the **App Store
provisioning profile**. A profile created before the group was enabled will
build on EAS but fail in Xcode with “doesn't include the App Groups capability”.

1. [Identifiers](https://developer.apple.com/account/resources/identifiers/list):
   both bundle IDs → **App Groups** → **Configure** → check **Did I shared**
   (`group.com.aaronbryant.didi`) → **Continue** → **Save**. Confirm each App
   ID shows **Enabled App Groups (1)** (not just the capability checkbox).
2. Regenerate App Store profiles **after** step 1. EAS-created profiles often
   still lack the group until identifiers are linked; deleting the old profile
   on Apple and re-running `npm run ios:build:store` forces new ones. If Xcode
   still complains, run **`npm run ios:build:store:first`** once in your
   terminal so EAS syncs capabilities for the **main** bundle too, or create
   profiles in the Apple portal and **Generate** in
   [Expo credentials](https://expo.dev/accounts/abryant/projects/did-i/credentials).
3. `npm run ios:build:store` again.

If the **main** app profile still lacks App Groups (widget builds fail, widget target syncs but `DidI` does not):

1. [Expo credentials](https://expo.dev/accounts/abryant/projects/did-i/credentials) → **com.aaronbryant.didi** → **Provisioning Profile** → **Remove**.
2. In PowerShell (not with `CI=true`): `npm run ios:build:store:first` and let EAS recreate the profile with App Groups.

Cursor/agent shells set `CI=true`, which freezes credentials. Run store builds from your own terminal when refreshing Apple capabilities.

`app.config.js` sets `com.apple.security.application-groups` on the main app so
EAS capability sync matches the widget plugin.

## iOS launch order (main app)

Expo expects this sequence; Did I follows it in `native/widget-bridge.js`:

1. UI is up (`launchReady`).
2. After ~1.2s, load `DidITonightWidget` (`createWidget` registers the extension).
3. `installWidgetSetup()` → `addUserInteractionListener` for Did / Did not taps.
4. `updateSnapshot(props)` from tonight shelf data (not `getTimeline` on cold start).
5. `getTimeline` only after that, or when the app returns to foreground, to merge widget answers into the shelf.

Never call WidgetKit from JS before step 2. Builds without the widget extension (`EAS_INCLUDE_WIDGETS=0`) skip all of the above (`nativeWidgetsEnabled()`).

### Android

`index.js` registers the Did I tonight task while the bundle evaluates, before the iOS bridge delay. Did and Did not are a broadcast. The widget library addresses that click at `DidITonight`, which hands it to `WidgetTapReceiver` before returning. The receiver writes the lamp id, Did or Did not (`did` / `nope`), and the night, calls `commit()` on that row, advances the card to the next question already in the last snapshot, then starts the same headless task. The task, and the next time the app opens, read the row, write it with the shelf answer path, and clear it. The same lamp and night a second time does not write again. If that snapshot has no next question, the card waits for the task. The task redraws the bitmap, including the buddy. The first snapshot from the open app still waits until the UI is up. The receiver waits about 0.7 s before painting its own plainer native layout, and skips it if JS has already saved a newer card, so a warm tap goes straight to the full card with no flash. A saved card never brings back a question the shelf has answered. The card clips to the rounded rect: only the outer frame is `match_parent`, and that frame sets `overflow: 'hidden'`.

The card lists tonight's questions from every tag: ready ones first, then ones still waiting on their ask time (the app lets you answer those early too). With two or more open (or, once none are open, two or more did-nots), a Next pill in the top-left corner (opposite the buddy) shows the next one (`PEEK` click, `peekNextTonightCard`). Next only moves the card; it never answers, and it does not go through `WidgetTapReceiver`. The question text is sized to fit the card (`fitQuestion`), so it does not cut off mid-line. Answers land on the tag that holds the question (`findBookHoldingLamp`). The buddy is drawn from the same SVG as the app (`SvgWidget`).

### iOS

The iOS card matches Android. The look-color ring is a `ContainerRelativeShape` stroke, so its corner follows the system widget radius for each size instead of a fixed radius. The tag name at the top follows the question showing (`items[].tag`), and after a Did or Did not it moves to the next question's tag. Its type size follows the widget family (small, medium, large), and on the small widget it sits in the row with Next and shrinks to fit. With two or more open questions (or did-nots once none are open), a **Next** pill sits top-left. It is an interactive button (`next:<lampId>`), like Did and Did not, and it only moves the card inside the widget. The app's interaction listener ignores it. WidgetKit does not scroll, so the question wraps and shrinks (`lineLimit` + `minimumScaleFactor`) instead of running as a marquee. SwiftUI in the widget cannot draw SVG, so the buddy is redrawn from the app SVG's own coordinates: ellipses, whisker lines, and triangles clipped from turned squares. The layout is exact; the curved dog mouth is a small triangle. None of this has run on an iPhone yet.

Dev client only: tapping the widget right after a force-stop can start the widget task before the dev launcher loads the app ("App react context shouldn't be created before"). Open the app first. Release builds have no dev launcher. On the emulator, a force-stop makes Android send `PACKAGE_UNSTOPPED` on the next launch, which wakes the widget worker first and trips this every time. Use `adb shell am kill com.aaronbryant.didi` from the home screen instead of `am force-stop`, then open the app.

## Code map

- `src/lib/widget-tonight.js` — snapshot + merge answers from the widget
- `widgets/DidITonightWidget.tsx` — iOS layout
- `widgets/android/DidITonightAndroidWidget.jsx` — Android layout
- `native/widget-bridge.js` — init, snapshot, timeline refresh
- `native/widget-sync.js` — push snapshot after shelf writes
- `native/widget-setup.ios.js` / `.android.js` — interaction handlers
- `android/.../widget/WidgetTapReceiver.java` — Android tap, stored before JS
- `android/.../widget/WidgetCardStore.java` — next question from the last snapshot, at tap time
- `native/deep-link.js` — `didi://tonight` → `/tonight`

## Settings (in app)

**Settings → Widget** (`did-i-prefs`):

- **Look** — match the tag’s shop look, or pick any look you own on any tag.
- **Open questions only** — drop answered rows from the widget list.

Changing settings refreshes the widget snapshot on the phone.
- Answers from the widget use the same `putAnswer` path as tonight in the app.
- Signed-in accounts: answers push to Supabase right after a widget tap when the
  app or Android widget task can run JS. If iOS answered with the app fully quit,
  the next time Did I opens it merges the widget timeline into the shelf and
  uploads before pull/merge. Other phones still need to open the app (or return
  to foreground) to pull.
