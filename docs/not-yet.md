# What Did I is missing

A review of the app as it stands, not a wish list. When one gets built,
delete it from here.

Last worked through 2026-09-25.

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

**iOS store IPA from Windows.** Default: GitHub **iOS IPA** workflow with signing
secrets (`docs/native-rebuild.md`). EAS fallback (`docs/app-store-connect.md`).
No committed `ios/` folder; GHA runs `expo prebuild` on `macos-latest`. App Store
Connect API upload is wired (key ID **S7K3PW29JF** in GitHub secrets; verified on a
GHA run). `app.json` **`ios.buildNumber` is 55** so the next signed upload can beat
TestFlight **52**; the workflow fails fast if the number is still **1** or ≤ **52**.

**Android test APK.** GitHub Actions builds it. Actions tab, workflow
**android-apk**, **Run workflow**. Download the **did-i-android-apk**
artifact from that run. EAS internal was the previous install (profile
`internal`, builds `66e023ca-4a54-4a7d-b7ba-625acf80aa7e` and
`e20b5348-fc8e-4fcb-aedd-32e9b83612ca`). WorkManager stays pinned to 2.8.1.
The release keystore is still on Expo (credentials `6i4VOCV-74`). Without
the GitHub secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`, the artifact is a release
APK signed with a debug key made for that run. A GitHub-signed or debug APK
may need the EAS APK uninstalled first if the signature differs
(`com.aaronbryant.didi`). A later debug-signed artifact can differ again, so
uninstall Did I if Android says the package conflicts. Install from GHA run **35950788740** (widget fixes); **re-run android-apk** after the shelf-sync fix lands. Still to confirm on a phone: Tonight widget **picker shows 4×2 (or resize)**,
question + look ring + buddy on home screen, menu closes, cheer previews in
Shop, glow look on cards, sync after sign-in on two phones. iPhone TestFlight
is unchanged.

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
- [ ] **Reprice for bonus gems** (24 Sep 2026: $1 a gem, bonus on bigger packs, `docs/iap.md`) — `gems_3` $2.99, `gems_10` $9.99 (was $6.99), `gems_25` $24.99 (was $14.99), `gems_50` $49.99 (was $29.99). Display names: 6 / 14 / 40 / 80 gems for `gems_5` / `_10` / `_25` / `_50`. Same on Play. Then deploy `gem-iap` (the DB gem cap is already 100).
- [x] **Age ratings** — questionnaire saved; **9+** (172 regions), wellness topics yes, medical **None**.
- [x] **App Information** — subtitle **One question at a time.**, category **Lifestyle**, saved.
- [x] **App Privacy** — all six data types configured and **Published** (nutrition labels live).
- [ ] **Privacy Policy URL** on App Privacy page still **–**; set via **Edit** → `https://did-i.app/privacy` (Save stayed disabled in automation; also set on **1.0** if required).
- [ ] **Version 1.0 listing** — metadata saved; **App Review** sign-in (`support@did-i.app` / `email-code`), contact name/email, notes filled in UI; add **phone**, click **Save**. Still **screenshots** and **attach six IAPs** on 1.0. Production build **51** is uploaded and waiting on Apple processing.
- [ ] **TestFlight launch** — **Internal TestFlight 1.0.0 (52)** is installed on the phone. **52** is still the newest build on TestFlight. EAS **53** (`4b2b790d-0c55-432f-a8fc-045ffb7990f4`) hit Apple **90382** (upload limit; wait a day). The first **GHA** upload reached App Store Connect as build **(1)** and will not install over **52** (build number too low). Next **iOS IPA** run needs **`ios.buildNumber` 55+** (set in repo). Ad hoc internal install still fails without widget / Sign in with Apple on the profile. TestFlight: https://appstoreconnect.apple.com/apps/6814688066/testflight/ios
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
7. Phone-first friends (24 Sep 2026): with two real accounts, save a number on each, ask by number, accept. Also try a number already on the other account ("That number is already on another account."). Server rules are proven on the live DB; the full two-account round trip is not. The legal text for phone numbers changed; include it in the lawyer review.

## Native Android vs localhost web

The Expo app in `native/` shares night maths, swipe, cheer recipes, and
`useTonightStack.js` with the browser build. These still differ:

- **Cheer burst fidelity.** All twelve cheers play on the Android emulator
  (25 Sep 2026, Shop previews and a Did swipe). Not yet seen on an iPhone.
  Web CSS animations may still feel snappier on some cheers.
- **iOS widget, untested.** Per-question tag header, Next pill, fit-to-card
  question, and the buddy redrawn from the app SVG are covered by `npm test`
  only. Needs a TestFlight build to confirm the Next button, the triangle
  ears, and the text shrink on a real home screen.
- **Visual diff caps.** `npm run visual` compares web vs native fixtures at
  390px. Jewel is tight (~10%); face/settings are looser until RN-web layout
  matches DOM more closely.
- **Keyboard shortcuts** on Tonight (web only): y/s, j/k, u, n.
- **Print slip** on Tonight (web only).
- **One stored widget tap.** If Did or Did not is tapped twice, for two questions, before JS runs, only the last row is kept. The card can step ahead for both, then the shelf redraw snaps back to the question that is still open. A second tap of the other button for the same lamp and night keeps the first mark.
- **iOS IPA signing on GHA.** With distro cert, profiles, `GOOGLE_SERVICES_PLIST`,
  and App Store Connect API secrets set, `ios-ipa.yml` signs, exports, and uploads
  to TestFlight (`docs/native-rebuild.md`). Without them, the workflow still emits an
  unsigned archive only.
- **Widget card without a snapshot.** A tap paints the next question from the last snapshot before JS. If that snapshot has no next question text, the card waits for the headless redraw. The buddy is on that redraw, not on the tap paint.

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

## Done (2026-09-23 phone pass)

- Mast menu closes on Android/iOS: `did-i-back`, backdrop, cog overlay on the modal.
- Cloud sync: `pushSoon` arms after sign-in; Android boot waits for pull before night close; Tonight shows `tMiss(sync.miss)`.
- Android Tonight widget: provider `exported`, preview layout, picker label **Did I tonight**.
- Cheer shop previews paint above sheets; gem glow gets Android border/elevation.
- Still-open count on finish face uses persisted shelf, not optimistic overlay.
- GHA workflows: `android-apk.yml`, `ios-ipa.yml` (unsigned until signing secrets).

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
- Android Tonight widget clips to the rounded rect. Only the outer frame is
  `match_parent`. Did and Did not register when the bundle loads, not after
  the iOS bridge delay. A tap is committed by `WidgetTapReceiver` before the
  headless task runs. The same lamp and night applied again does not write.
