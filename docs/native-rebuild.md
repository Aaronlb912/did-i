# React Native rebuild

The native app lives in `native/`. Business logic stays in `src/lib/*.js`.
Screens are rebuilt in React Native. Capacitor WebView is legacy; Expo is the
native target.

## Run it

```bash
npm run expo
```

Press `a` for Android or `i` for iOS. Env vars from `.env.local` load through
`app.config.js` into `src/lib/env.js` (Supabase, legal email).

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

`npx expo export --platform android` bundles cleanly (1718 modules). Capacitor
`android/` stays for the legacy web APK; store builds use `npx expo prebuild`.

Gem purchases need a dev build on a real device (not Expo Go). See `docs/iap.md`.

## Web app

`npm run dev` and `npm run cap:apk` still use `src/App.jsx`. Drop Capacitor when
you ship Expo builds to the stores.
