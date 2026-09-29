# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Did I — a nightly habit app. One question at a time, tap Did or Nope,
streaks, tags, family, shop (coins/gems), cheers, home-screen widgets. Two
programs share one repo:

- **Phone app** (React Native / Expo SDK 57): `native/`, `widgets/`, `android/`, `index.js`. Bundle id `com.aaronbryant.didi`.
- **Website** (Vite): `src/` + `src/site/`. Serves `did-i.app` — `/` landing, `/app` the web app, `/privacy`, `/terms`.

They are not interchangeable. When asked to "fix the phone," change `native/`,
`widgets/`, or `android/` — a change verified only in the browser (port 48741)
does not prove the phone works. See `.cursor/rules/app-checks.mdc`.

Shared logic (night math, shelf/recurrence, cloud sync, i18n, widget props,
theme) lives in `src/lib/` and is imported by both the website and the native
shell.

## Commands

Note: `package.json` has `"type": "module"`, so Node scripts run directly
(e.g. `.claude/hooks/*`) must use `.cjs` if they use `require()`, or use ESM
`import` syntax if they stay `.js`.

```
npm start                    # website dev server, http://127.0.0.1:48741/
npm run check                # scripts/check.mjs (tests) + scripts/bench-night.mjs (perf, must stay < 6ms)
npm test                     # scripts/check.mjs only
npm run bench                # night-math perf bench only
npm run lint                 # scripts/lint-store.mjs
npm run typecheck            # tsc -p tsconfig.store.json --noEmit
npm run ios:prepare:store    # check + lint + typecheck + iOS bundle export — this is what "run checks" means for the phone app
```

Native/dev:
```
npm run expo:dev             # dev client + tunnel (preferred way to run the phone app)
npm run expo:android         # dev client, Android
npm run expo:ios             # dev client, iOS (needs a Mac)
```

On Android dev-client builds, Expo's floating Tools button sits over the header
menu (grid) button and takes centre taps, opening the Expo dev menu instead of
the app menu. Drag the bubble away, tap the button off-centre, or test with a
release build (`npx expo run:android --variant release`).

Locales (9 files in `src/locales/`, English is the fallback):
```
npm run locales:refresh      # merge additions + sync
npm run locales:report       # coverage report
npm run locales:missing      # list missing keys
```
The checked-in `src/locales/*.js` files are the source of truth for existing
translations, not `scripts/i18n-additions.mjs` / `legal-i18n.mjs` /
`web-marketing.mjs` / `web-marketing-locales.mjs` / `scripts/locale-gaps/*.json`
(those feed the refresh but must themselves match the checked-in files, or a
refresh will silently rewrite translations back to stale/English copy). A
`scripts/check.mjs` test runs the refresh and fails if it would change
`src/locales`; if it does, fix the source/data files above, not the checked-in
locale files.

Supabase:
```
npm run db:apply:all         # apply schema from supabase/*.sql
npm run db:audit             # scripts/audit-sql.mjs — must return no rows before calling backend work done
npm run db:test <file>       # scripts/test-sql.mjs — rolled-back SQL checks, e.g. supabase/tests/auto-add.test.sql
```

There is no single-test runner; `scripts/check.mjs` runs the full suite.

## Builds

Default path is **GitHub Actions**, not EAS (Aaron is on Windows, no Mac; EAS
is fallback only — do not start an EAS build unless asked).

- **Android APK**: `.github/workflows/android-apk.yml`, run manually from
  Actions → android-apk. Artifact `did-i-android-apk`. arm64-only, Gradle
  cached. Without keystore secrets it's debug-signed — may need to uninstall
  the existing `com.aaronbryant.didi` before installing a new build.
- **iOS TestFlight/IPA**: `.github/workflows/ios-ipa.yml` or `npm run
  ios:build:store` (Expo). Both run `scripts/ios-bump-build.mjs`, which takes
  and pushes the next `ios.buildNumber` in `app.json` before building.
- **OTA**: `npm run update:prod` for JS-only changes (`expo-updates`). Native
  changes need a build; bump `version` in `app.json` when native code changes.

Full details, signing secret names, and timings: `docs/native-rebuild.md`.

## Architecture

- **`src/lib/`** — the shared core: screens/components used by both web and
  native (e.g. `Home.jsx`, `Tonight`-related files, `FamilyTonight.jsx`,
  `GemShop.jsx`, `CheerBurst.jsx`), plus non-UI logic: `prefs.js` (theme +
  locale, key `did-i-prefs`), `i18n.js`, `people.js` (social/family queries),
  recurrence/night-math (`recurrence.js`), cloud sync, and widget prop
  builders. Copy IAP redirects to `native/iap/`.
- **`native/AppShell.jsx`** — the native shell: screens, the main menu
  (rendered as a `Modal` while open — do not change that to a different
  pattern), cheer burst, and a native-stack screen per route (back is the
  platform's; see `docs/native-rebuild.md`).
- **`widgets/DidITonightWidget.tsx`** — iOS widget (WidgetKit). Content must
  stay clipped inside the rounded rect; its stack state has to stay in sync
  with Tonight (nope vs. "all clear").
- **`widgets/android/`** — Android widget (`DidITonightAndroidWidget.jsx` +
  Java: `WidgetTapReceiver`, `WidgetCardStore`, the `DidITonight` provider).
  A tap is saved natively *before* JS runs; the headless task then rebuilds
  the widget from the shelf (`buildTonightWidgetProps`) rather than reading a
  possibly-stale MMKV snapshot.
- **`supabase/`** — `schema.sql`, then `people.sql`, then `hardening.sql`, in
  that order, are canonical. RLS is mandatory on every table (see
  `.cursor/rules/scale-and-safety.mdc` for the full policy: `(select
  auth.uid())` not bare `auth.uid()`, indexed FKs, `security definer
  stable` helper functions with pinned `search_path` for anything
  correlated, size/length checks in `hardening.sql`, caps on repeatable
  writes via triggers, no per-row queries in loops — fetch with `in (...)`
  and match in JS).
- **Night math** — `answerFor` is a `WeakMap`-indexed lookup; never replace
  with `.find`. `wallClock` keeps one `Intl.DateTimeFormat` per zone, never
  built in a loop. Multi-night walks (streaks, calendar, shelf heat) are
  memoized on `[shelf, dateIso, tagId]` (+ a minute key when time-of-day
  matters) — `Tonight` is the shape to copy.

## Conventions

- **Theme**: Dark / Light / Phone, stored in `src/lib/prefs.js`
  (`did-i-prefs`). Applied via `data-theme`. New colors go on `--di-*` custom
  properties in `src/lib/did-i.css` — no hardcoded hex on new screens. Shop
  cosmetic "looks" (`data-look`) are a separate concern from theme.
- **i18n**: `t('key')` from `src/lib/i18n.js`; every key in all 9
  `src/locales/*.js` files (the check test requires identical keys). English
  is the fallback.
- **Product vocabulary** (user-facing copy only): folder, folders, add,
  question, tonight, Did I, coins, gems, shop, cheer, streak, nope. Do **not**
  use tag (renamed to folder 2026-09-26; code and keys still say tag), board,
  hall, hang, heat, or skip (skip especially — the tap button is "nope").
  See `.cursor/rules/copy.mdc`.
- **Reduced motion**: `useReduceMotion` / `prefers-reduced-motion`.
- **Shop buy confirmation** uses `SheetHost`, not `Modal` — `scripts/check.mjs`
  asserts this; don't change it.
- **Fonts**: `fonts.ui` is a fixed Medium face (`native/fonts.js`) — iOS renders
  the exact face a `fontFamily` names regardless of `fontWeight`, so pairing
  `fonts.ui` with `fontWeight` 600+ silently renders as Medium. Use
  `fonts.uiSemi` / `fonts.uiBold` instead, with no `fontWeight`.
  `npm run lint` (`scripts/lint-store.mjs`) fails on the `fonts.ui` + 600+
  pairing.
- Whole-feature rules: `.cursor/rules/whole-feature.mdc`. New routes go in
  `ROUTES`. Keep `docs/not-yet.md` and `docs/launch-checklist.md` current.

## Docs to read first (task-dependent)

- `docs/not-yet.md` — current source of truth for what's missing/unfinished.
- `docs/native-rebuild.md` — CI build workflows, secrets, timings.
- `docs/widgets.md` — widget behavior in detail.
- `docs/build-prompt.md` — session/continuation log (routes, ports, prompt
  file locations); only relevant when continuing a multi-session build.
- `.cursor/rules/*.mdc` — theme/i18n, scale-and-safety, whole-feature, copy,
  cheers, app-checks. These are enforced conventions, not suggestions.

General working rules (smallest diff, commit only when asked, no AI
attribution) are in Aaron's global CLAUDE.md. PowerShell here: no `&&`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
