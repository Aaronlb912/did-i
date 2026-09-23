# What Did I is missing

A review of the app as it stands, not a wish list. When one gets built,
delete it from here.

Last worked through 2026-09-22.

## Waiting on an account, not on code

**Sign in with Apple.** Portal + Supabase configured (`npm run
apple:auth:setup` done). Use a **launch-clean** store build on iOS 1.0 (not
**23**; see iOS build below).

**Mail delivery test.** Custom SMTP is on (Resend, `support@did-i.app`,
`npm run smtp:setup`). Send yourself a sign-in code and confirm it hits
the inbox, not junk. If it does not, check SPF/DKIM on `did-i.app` in
Resend and the Auth rate limits in the Supabase dashboard.

**Push on a real phone.** Android path is live; **iOS** has
`GoogleService-Info.plist` at repo root (gitignored) and APNs key **Did I
Firebase Push** (`TL92CR5TVF`). Finish **Firebase → Cloud Messaging →
production APNs auth key → Upload** (Browse → `AuthKey_TL92CR5TVF.p8`, Key ID
`TL92CR5TVF`, Team ID `2ZUKFKSSV8`). Then install a **new store build** with the plist baked in (`docs/push-ios.md`).
End-to-end nudge still unconfirmed.

**iOS store IPA from Windows.** EAS (`docs/app-store-connect.md`). No local
`ios/` folder; Xcode on a Mac is only if you prebuild locally.

**Gem packs in the stores.** Code is in (`docs/iap.md`). Play products,
`gem-iap` deploy + secrets, Paid Apps agreement, and a sandbox buy on a
real phone are still open on both stores.

**App Store Connect — Did I???** (`6814688066`, `docs/app-store-connect.md`):

- [x] **IAP `gems_5`** — $4.99, all countries, EN (U.S.) localization.
- [x] **IAP `gems_3`** — `6814690359`; reference name **3 gems**, all countries, price schedule, EN (U.S.).
- [x] **IAP `gems_10`** — $6.99, all countries, EN (U.S.).
- [x] **IAP `gems_25`** — created (`6814694264`); $14.99, all countries, EN (U.S.).
- [x] **IAP `gems_50`** — `6814694882`, $29.99, all countries, EN (U.S.).
- [ ] **`gems_1` verify** — quick pass $0.99, countries, EN; IAP review screenshot (Shop → gems, e.g. `screen.png`) on one IAP.
- [x] **Age ratings** — questionnaire saved; **9+** (172 regions), wellness topics yes, medical **None**.
- [x] **App Information** — subtitle **One question at a time.**, category **Lifestyle**, saved.
- [x] **App Privacy** — all six data types configured and **Published** (nutrition labels live).
- [ ] **Privacy Policy URL** on App Privacy page still **–**; set via **Edit** → `https://did-i.app/privacy` (Save stayed disabled in automation; also set on **1.0** if required).
- [ ] **Version 1.0 listing** — metadata saved; **App Review** sign-in (`support@did-i.app` / `email-code`), contact name/email, notes filled in UI; add **phone**, click **Save**. Still **screenshots** and **attach six IAPs** on 1.0. Production build **51** is uploaded and waiting on Apple processing.
- [ ] **TestFlight launch** — **53** is built (`4b2b790d-0c55-432f-a8fc-045ffb7990f4`) and not on the phone. It has the menu in its own layer and the faster widget handoff. Apple rejected the upload: error **90382**, upload limit reached, wait one day. **52** is the newest build that made it to TestFlight. An internal install failed because the ad hoc profile has no widget or Sign in with Apple entitlement. TestFlight: https://appstoreconnect.apple.com/apps/6814688066/testflight/ios
- [ ] **iOS 1.0** — attach launch-clean build; screenshots; review **phone** + **Save**; attach IAPs; **manual release**. Test Tonight widget on device.
- [ ] **After IAPs ship** — App-Specific Shared Secret → Supabase `APPLE_IAP_SHARED_SECRET` for `gem-iap`. Checked 23 Sep 2026 while signed in: Manage still shows **Generate**, so no secret exists. That name is not on the project, and `gem-iap` is not deployed (only `push` is). The six packs exist and are all **Prepare for Submission**. Version 1.0 has no In-App Purchases section and no build attached. `gems_1` still says the first consumable must go out with a new app version, and its review screenshot is empty.

## Decided, not building

**Kid accounts stay as they are.** A family is people sharing chores,
and the parent and kid roles decide who can assign what. Did I is not a
children's app and does not claim to be one. Blocking covers the case
where somebody is a nuisance.

## Before launch (your accounts, not the repo)

1. Confirm sign-in codes arrive in the inbox (SMTP is configured; see above).
2. Point `did-i.app` DNS at Vercel; import repo and set env vars (see `docs/site.md`).
3. Set `VITE_LEGAL_EMAIL` and have a lawyer review `scripts/legal-i18n.mjs`.
4. Privacy and terms at `/privacy` and `/terms` (and in the app). Disclosures
   at sign-in, gem checkout, and Did I tonight opt-in are already in copy.
5. When you are ready for paid gems: store products + `gem-iap` secrets per `docs/iap.md`.
6. `npx expo prebuild` and install on a phone; walk social, settings, and push with a second account.

## Native Android vs localhost web

The Expo app in `native/` shares night maths, swipe, cheer recipes, and
`useTonightStack.js` with the browser build. These still differ:

- **Cheer burst fidelity.** Native has dancers, puddles, and stars now.
  Web CSS animations may still feel snappier on some cheers.
- **Visual diff caps.** `npm run visual` compares web vs native fixtures at
  390px. Jewel is tight (~10%); face/settings are looser until RN-web layout
  matches DOM more closely.
- **Keyboard shortcuts** on Tonight (web only): y/s, j/k, u, n.
- **Print slip** on Tonight (web only).

Tonight parity landed 2026-09-20: wait/hole plates, sync miss line,
title edit, idle face, night-strip history gate, meter/purse pop,
cheer skip under reduce-motion.

## Ideas parked (not built)

- **More coin sinks** from the brainstorm (buddy accessories, undo token, preview gem looks, extra tag slot, streak stamps, tag badges) are still open. Signed-in **coin earns and spends** for looks and cheer stages go through `wallet.sql`; run `db:apply:all` after SQL edits.
- **Did I tonight (DIT)** is off in the main app (`VITE_DIT_ENABLED` unset).
  Code stays in repo for a future split. Friends, family, and account sync
  still work; the public wall tab and opt-in are hidden.
- Pin your row on DIT for a night (skipped on purpose).
- A fourth line slot on DIT (board shows all DID labels now instead).

## Done

- Native app shell (Expo in `native/`): social, settings, account,
  search, lamp detail, FamilyTonight, offline banner, clipboard fallback,
  pings permission, cheer burst, error boundary, and routes through
  `  ScreenRouter`. Visual parity pass 2026-09-20: jewels, face cards,
  settings cards, mast chrome, shop hub purse, hall ambient, theme sync.
- In-app purchase framework: `expo-iap`, `gem-iap` function, claim on sync
  (`docs/iap.md`). No Stripe in the app.
- Answers sync on their own instead of riding in the whole shelf
  document. The document is structure only now.
- Block and report, with the friendship and any waiting nudge torn down,
  and a way to undo it.
- An error boundary, and the last break shown in Settings.
- Codes can be shared or copied instead of retyped.
- What you sent, whether it was kept or passed, and taking one back.
- The family's last seven nights, per person.
- Editing a family question, and changing a family tap after the fact.
- Later tonight: a question steps aside for two hours without counting
  as an answer and without touching a streak.
- Loading back a copy you downloaded.
- A line on the People screens when there is no signal.
- `npm test`, `npm run bench`, and `npm run db:audit` (`supabase/audit.sql`).
- A way back: a chevron in the mast, a swipe in from the left edge, and
  the Android key, all on one stack.
- Did I tonight, the public list of who showed up. Opt in, off by
  default, three lines a night, a cheer for a gem.
- A line on the public list comes down when two different people report
  it, without waiting for anyone to read the reports table. The report
  rows outlive the line for review.
- A cheer on the public list reaches the phone instead of only counting.
- The safe area on the left and right, so a cutout or a rounded corner
  stops eating the mast title.
- One gem a week when you clear a night, not one per night.
- DIT as a board: opt in, every DID label syncs up, no picking lines.
- Friend and family cheers spend the same stored balance. One gem buys
  five. Gift a cheer stays its own price.
- Shop: Spark and Flip cheers, Glow and Ember gem looks.
- Save a copy in Settings (full shelf export, share or download).
- Sync miss line on Tonight when signed in and the cloud is unreachable.
- Offline line on Friends, Family, and Inbox.
- Streaks, Later, and Hang copy through `t()` in English and Spanish.
- Handle safety on generated names (client + `supabase/handle-safe.sql`).
- Hang form errors, WeekGrid, and StatsPage copy through `t()` in English
  and Spanish.
- Partial locale parity (fr, de, pt, it, zh, ja, ko). Workflow:
  `docs/locales.md`. Ship quality is `en` + `es`; `npm test` guards Spanish.
- Marks, achievements toast, Feed, Search, About, Ideas, PingPlate,
  WaitPlate, site pages, AppMap, cadence lines, device labels, and home
  line copy through `t()` in all eight locales.
- Shop cheers and looks (names, lines, buy errors), push channel label,
  StarterPicks default, and people network miss through `t()` / `tMiss()`.
- Ship tooling: `npm run db:apply:all`, `vercel.json` SPA deploy, optional
  `VITE_REPORT_URL`.
- Marketing site at `/` with `/privacy`, `/terms`, `/download` on one build
  (`src/site/`, `docs/site.md`). Web app at `/app` is off in production unless
  `VITE_WEB_APP_PUBLIC=true`.
- Shared-device shelf isolation: sign-out wipes local shelf and auth skip;
  `pullAndMerge` drops stale local data when the signed-in user changes.
