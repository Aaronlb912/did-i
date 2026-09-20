# What Did I is missing

A review of the app as it stands, not a wish list. When one gets built,
delete it from here.

Last worked through 2026-09-20.

## Waiting on an account, not on code

**Mail.** Sign-in codes still go through Supabase's built-in mailer: two
sends an hour for the whole project, and they land in spam. Nothing in
the repo can fix it. Steps are in `docs/running-it.md`.

**Push is live on Android.** Firebase is set up, the function is
deployed and locked behind a JWT, and cron drains the queue every
minute. The only thing untested is a notification landing on a real
phone, which needs a signed-in device. See `docs/push.md`.

**iPhone needs a Mac.** The sending side already speaks to Apple, but
there is no iOS app: no `ios/` folder, and building one needs Xcode and
a paid Apple Developer account. Nothing left to do in this repo.

## Decided, not building

**Kid accounts stay as they are.** A family is people sharing chores,
and the parent and kid roles decide who can assign what. Did I is not a
children's app and does not claim to be one. Blocking covers the case
where somebody is a nuisance.

## Still to build

Nothing in code. Add what turns up.

Legal pages at `/privacy` and `/terms` (and `#/privacy` in the app). Disclosures
at sign-in, gem checkout, and Did I tonight opt-in. Set `VITE_LEGAL_EMAIL`
before launch. Have a lawyer review `scripts/legal-i18n.mjs` for your state.

Ship checklist (your accounts, not the repo):

1. Custom SMTP in Supabase so sign-in codes arrive.
2. Point `did-i.app` DNS at Vercel; import repo and set env vars (see `docs/site.md`).
3. Set `VITE_WEB_APP_URL=https://did-i.app` before building the Android APK.
4. Stripe Payment Links + webhook for gem packs (see `docs/running-it.md`).
5. Install the debug APK on a phone and test push with a second account.

## Ideas parked (not built)

- Pin your row on DIT for a night (skipped on purpose).
- A fourth line slot on DIT (board shows all DID labels now instead).
- Google Play Billing in the Android app (Stripe web checkout works first).

## Done

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
- `npm test`, `npm run bench`, and `supabase/audit.sql`.
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
- Friend cheer with your animation (1 gem), gift a cheer (5 gems), family
  cheer when someone cleared tonight (1 gem).
- Shop: Spark and Flip cheers, Glow and Ember gem looks.
- Save a copy in Settings (full shelf export, share or download).
- Sync miss line on Tonight when signed in and the cloud is unreachable.
- Offline line on Friends, Family, and Inbox.
- Streaks, Later, and Hang copy through `t()` in English and Spanish.
- Handle safety on generated names (client + `supabase/handle-safe.sql`).
- Hang form errors, WeekGrid, and StatsPage copy through `t()` in English
  and Spanish.
- Full locale parity for fr, de, pt, it, zh, ja (1015 keys each). After
  new English keys: add to `scripts/i18n-additions.mjs`, run
  `node scripts/merge-i18n-additions.mjs`, translate gaps, then
  `npm run locales:sync`.
- Marks, achievements toast, Feed, Search, About, Ideas, PingPlate,
  WaitPlate, site pages, AppMap, cadence lines, device labels, and home
  line copy through `t()` in all eight locales.
- Shop cheers and looks (names, lines, buy errors), push channel label,
  StarterPicks default, and people network miss through `t()` / `tMiss()`.
- Ship tooling: `npm run db:apply:all`, `vercel.json` SPA deploy, optional
  `VITE_REPORT_URL`, native gem web fallback via `VITE_WEB_APP_URL`.
- Marketing site at `/` with `/app`, `/privacy`, `/terms` on one build
  (`src/site/`, `docs/site.md`). PWA start URL is `/app`.
