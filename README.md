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

Set `VITE_WEB_APP_URL=https://did-i.app` so the Android app can open gem
checkout in the browser.

## Android

App id `com.aaronbryant.didi`. Needs JDK 21 and Android SDK (platform 36).

```
npm run cap:apk
```

Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

Install on a connected phone:

```
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Push needs Firebase (`android/app/google-services.json`) and a signed-in
account. See `docs/push.md`.

## Gem purchases

Web checkout uses Stripe Payment Links (`VITE_STRIPE_PACK_*` in
`.env.local`). Deploy the webhook per `docs/running-it.md`. On Android,
gem packs open the web shop until Play Billing ships.

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

- **Mail.** Sign-in codes need custom SMTP in Supabase. Built-in mail
  is two sends an hour and lands in spam. Steps in `docs/running-it.md`.
- **Push on a real phone.** Server side is live; needs a signed-in device
  to prove end to end. See `docs/push.md`.
- **iOS.** Needs a Mac, Xcode, and Apple Developer account. No `ios/`
  folder on this Windows machine.
- **Play Store release.** Debug APK builds here. Release signing and Play
  Billing are separate steps in `docs/running-it.md`.
