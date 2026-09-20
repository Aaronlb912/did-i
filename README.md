# Did I

For the question you keep asking tonight. Did I take the evening pills.
Did I lock the back door. Tap DID. Nope if it is not that night.

No account required to start. This phone keeps the list. Add an account
when you want friends, family, and sync.

https://github.com/Aaronlb912/did-i

## What you get

- Tags hold the questions. Extra tags do not cost coins.
- Tonight is the tap. Home says what is left.
- Shop: coin looks, gem cheers, streak, marks.
- People: friends, families, Did I sends, inbox.
- Did I tonight: opt-in public list, three lines a night.
- Eight languages in Settings.
- PWA: install from Chrome or Settings. Works offline on the web.
- Android app: same UI, local reminders, push when signed in.

## Run locally

```
npm install
npm start
```

Vite serves on port 48741: http://127.0.0.1:48741/

```
npm run check
```

Runs tests and the night-math bench (must stay under 6 ms).

## Accounts and the cloud

Copy `.env.example` to `.env.local` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Without those, the app is local-only. With them, Account in Settings
offers email sign-in, sync, friends, and family.

To apply the database from the terminal (needs `SUPABASE_ACCESS_TOKEN` in
`.env.local`):

```
npm run db:apply:all
```

Then run `supabase/audit.sql` in the SQL editor. It must return no rows.
Full steps: `docs/running-it.md`.

## Web hosting (Vercel)

Import the repo at [vercel.com/new](https://vercel.com/new). Build:
`npm run build`. Output: `dist`. Add env vars from `.env.example` in the
Vercel project settings (never commit `.env.local`). Point `did-i.app` at
Vercel DNS. Full steps: `docs/site.md`.

## Native app (Expo)

App id `com.aaronbryant.didi`. The native rebuild lives in `native/`.
Shared logic stays in `src/lib/`.

```
npm install
cp .env.example .env.local
```

Ask Aaron for `.env.local` values (`VITE_SUPABASE_*` at minimum). Without
them the app runs local-only; account, friends, and sync need the keys.

**Quick look (simulator or Expo Go):**

```
npm run expo
```

Press `i` for iOS Simulator (Mac + Xcode) or `a` for Android emulator.
Expo Go is fine for Tonight, questions, and settings. IAP and some native
pieces need a dev build.

**Full native dev build (recommended for testers):**

```
npx expo prebuild
npx expo run:ios      # Mac + Xcode
npx expo run:android  # JDK 21 + Android SDK 36
```

More detail: `docs/native-rebuild.md`.

Push needs Firebase (`android/app/google-services.json`) and a signed-in
account. See `docs/push.md`.

## Android (legacy Capacitor web APK)

Still builds the web app in a WebView:

```
npm run cap:apk
```

Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Gem purchases

Native builds use in-app purchases (`expo-iap`). Pack ids, the edge function,
and setup steps are in `docs/iap.md`. Requires a dev build on a real device;
Expo Go cannot bill.

## Drop into a React app

Copy `src/lib/` into your `src/`. Site pages stay in `src/site/`.

```
import { Tonight, sampleBoard, emptyBoard } from './lib'

<Tonight value={book} onChange={setBook} />
```

`Tonight` does not write localStorage. Persist in the host.

## Sample

Hayes Street, apt 3. Settings can load it, or add test tags from
Settings for shop and streak practice.

## Website (did-i.app)

| URL | Page |
|-----|------|
| `/` | Landing |
| `/app` | The app |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |

Local dev: http://127.0.0.1:48741/ for the site, `/app` for the app.

Deploy needs SPA fallback (`public/_redirects` is included for Netlify-style
hosts). Point `did-i.app` at the built `dist/` folder.

## Legal

Privacy and Terms are on the site at `/privacy` and `/terms`, and inside
the app under Settings, Legal.

Set `VITE_LEGAL_EMAIL` in `.env.local` before other people sign up. See
`docs/legal.md`. Have a lawyer review the text for your jurisdiction.

## Unfinished (needs your accounts, not code)

See `docs/not-yet.md`. Short list: confirm sign-in mail lands in the inbox
(`npm run smtp:setup`), push on a real signed-in phone, store IAP when you
want paid gems (`docs/iap.md`), Play/App Store release signing.
