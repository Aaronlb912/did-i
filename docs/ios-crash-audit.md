# iOS TestFlight crash and EAS failure audit

Checked 2026-09-22 after builds **23, 25, 34, 35, 36** all aborted on open (~0.16–0.2s). Same native shape every time: `SIGABRT` from `RCTExceptionsManager reportFatal` on `com.meta.react.turbomodulemanager.queue`. That is an **uncaught JavaScript error** that React Native treats as fatal. The `.ips` file does not include the JS message because Hermes is still building the stack string when `abort()` runs.

The React error boundary (`native/components/Boundary.jsx`) never runs for this. It only catches render errors after the tree mounts. A throw during `import` in `index.js` kills the process first.

## Lead cause (launch)

**`react-native-reanimated` 4.5.1 is imported on the first line of `index.js`, and the app is built with the old architecture (`newArchEnabled: false`).**

Reanimated 4 only lists **Fabric** (new architecture) in `node_modules/react-native-reanimated/compatibility.json`. There is no Reanimated 4 row under `paper`. Its initializer (`src/initializers.ts`) calls `runOnUISync()` from `react-native-worklets` as soon as the module loads. That is a TurboModule call before any screen exists. If the native module is missing or refuses the old runtime, the throw is uncaught and matches every crash log.

Worklets **is** installed (`react-native-worklets` 0.10.4 via the lockfile) but it is **not** a direct dependency in `package.json`, and it is built for the new architecture the same way Reanimated 4 is.

Related, same architecture mismatch (later in launch, after the first frame):

| Package | Needs | What we ship |
|---------|--------|----------------|
| `react-native-reanimated` 4.5.1 | New architecture | `newArchEnabled: false` in `app.json` and `expo-build-properties` |
| `react-native-mmkv` 4.3.2 (Nitro) | New architecture | First `localStorage` read in `firstShelf()` calls `createMMKV` |
| `expo-iap` (Nitro) | New architecture | Lazy, only on Shop |

Turning New Architecture **off** was meant to avoid launch crashes. It conflicts with the libraries that actually run at startup.

## Other launch risks (not the first 200ms, unless something above is fixed)

These were real on earlier builds. Build 36 defers them ~1.2s, so they are **not** the 0.2s abort unless the defer never runs (process already dead).

1. **`expo-notifications`** — `getDevicePushTokenAsync` / `setNotificationHandler` / `getPermissionsAsync` can fatal when permission is already granted and Firebase is not in the binary. `preparePush` no longer fetches a token at launch. Token sync is only after the user turns reminders on.
2. **`expo-widgets`** — `getTimeline` / `updateSnapshot` before the widget is registered, or on an IPA built with `EAS_INCLUDE_WIDGETS=0`. Gated by `nativeWidgetsEnabled()` and `initWidgetsOnLaunch()` (`native/widget-bridge.js`).
3. **`hookErrorReport`** in `native/bootstrap.js` forwards to React Native’s default handler, which calls `reportFatal` and aborts. Any uncaught error becomes this crash. It does not swallow fatals.
4. **Gesture handler** — `import 'react-native-gesture-handler'` must stay first. Missing it crashes on the first gesture, not necessarily at 0.2s.

## What makes an EAS **build** fail (IPA never produced)

These do not match the TestFlight abort. They stop Xcode on the builder.

| Failure | When | Fix |
|---------|------|-----|
| App Groups missing on main profile `DASG69RNFC` | Widgets on (`production`) | Apple: both bundle IDs have `group.com.aaronbryant.didi`. Expo credentials: remove main provisioning profile, then `ios:build:store:first` with `$env:CI=''` |
| Pod resource bundle code signing | Xcode 14+ | `plugins/with-ios-pod-bundles.cjs` (in `app.config.js`) |
| `CI=true` | Cursor agent shell | `$env:CI=''` in your own PowerShell so EAS can refresh profiles |
| Stale Xcode image | Builds 29–30 | `production` uses `sdk-57`, not a pinned Xcode 16.2 image |
| `expo-dev-client` in store | Build 23 | Plugin only for `development` / `preview` profiles |

`GOOGLE_SERVICES_PLIST` is already a production file secret. The plist is gitignored, so a build still succeeds; push tokens fail until that secret is present (it is).

## What we have not proven on a phone

No store build has stayed open. Widget-order and push-token changes cannot be the 0.2s crash if Reanimated throws during `index.js` before React mounts.

## Fix applied

`newArchEnabled` is **true** in `app.json` and in `expo-build-properties` (iOS and Android). `react-native-worklets` **0.10.4** is a direct dependency. Reanimated 3 cannot run on React Native 0.86, so the new architecture is the supported path, not an optional one.

Ship a new production build before judging TestFlight. Builds 23–36 were old-architecture binaries.

## Errors a simulator does not run

TestFlight loads the Hermes production bundle against the store binary. A dev client and `npm test` do not.

1. **`require(mod).default`** — Babel compiles `import X from 'mod'` that way. If `require` returns undefined, or a getter throws, the boundary names whichever component was drawing. `native/shim/pin-module.cjs` wraps the module so a throwing getter becomes `undefined` and `.default` is always present. `scripts/check.mjs` feeds it a getter that throws `Cannot read property 'default' of undefined`.
2. **A native package with no shim** — `npm run lint` (`scripts/lint-store.mjs`) fails if `native/`, `src/`, or `widgets/` import an `expo-*` / `react-native-*` package that `metro.config.cjs` does not redirect. It also fails on a dynamic `require()`, on `createAnimatedComponent(Path)`, and on a lazy host with no `Slot`.
3. **The widget's Swift types** — `npm run typecheck` (`tsconfig.store.json`) checks `widgets/`. `containerBackground` needs the placement argument (`'widget'`). A simulator does not typecheck that call.
4. **The bundle EAS uploads** — `npm run ios:prepare:store` runs check, lint, typecheck, then `expo export --platform ios`. That is the Hermes compile. Build 42 died here on `require(id)` and a simulator never saw it.
