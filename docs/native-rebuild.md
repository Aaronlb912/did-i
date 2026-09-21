# React Native rebuild

The native app lives in `native/`. Business logic stays in `src/lib/*.js`.
Screens are rebuilt in React Native. Expo is the native target.

## Run it

```bash
npm run expo:dev
```

Use a **development build** on the phone (not Expo Go). iPhone from Windows:
`docs/iphone-preview.md`. Android: `npm run android:build` once, then
`npm run expo:dev`. Env vars from `.env.local` load through `app.config.js`
into `src/lib/env.js` (Supabase, legal email).

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

`npx expo export --platform android` bundles cleanly. Store builds use
`npx expo prebuild` then `expo run:android` or EAS.

Gem purchases need a dev build on a real device (not Expo Go). See `docs/iap.md`.

## Web app

`npm run dev` serves the Vite app at `src/App.jsx`. Native uses `index.js` and
`native/`.
