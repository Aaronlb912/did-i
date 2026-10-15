# Launch checklist

What has to be true before Did I goes live on the App Store and Play Store.
Tick items as they land. Details and history live in `docs/not-yet.md`.

Last updated 2026-09-26. Latest iOS build: **55** (Expo). Next build takes 56.
Over-the-air updates (`expo-updates`) start with build 56. After that, JS-only
fixes go out with `npm run update:prod`; native changes still need a build
(`docs/native-rebuild.md`).

## App Review switch (every submission)

Reviewer sign-in shows on the sign-in screen only while
`public.app_flags.reviewer_signin` is on (`supabase/reviewer-flag.sql`).
Run in the Supabase SQL editor (service role):

- [ ] Before **Submit for Review**: turn it ON.
  `update public.app_flags set on_now = true, updated_at = now() where name = 'reviewer_signin';`
- [ ] After approval: turn it OFF.
  `update public.app_flags set on_now = false, updated_at = now() where name = 'reviewer_signin';`

Check with `select public.reviewer_signin_on();`. The app reads it when the
sign-in screen opens; offline or an error reads as off.

## After launch: Did we

Not part of 1.1.0. Merge the `did-we` branch only after 1.1.0 is live in both
stores. The widget line needs a new native build; the rest ships over the air.
Before merging: a two-account run through `docs/did-we.md`.

## Needs a new build

Batch these, then build both once: `npm run ios:build:store` and GitHub **android-apk**.

**Already in, waiting for build 56**
- [x] iOS widget: buddy inside the border, small widget buttons fit the card
- [x] iPhone push: `.easignore` uploads `GoogleService-Info.plist` to Expo (GitHub iOS still writes it from the `GOOGLE_SERVICES_PLIST` secret)
- [x] Android push: `google-services.json` and the Firebase Gradle plugin are back in `android/` (lost with Capacitor, so GitHub APKs had no push token)
- [x] Android AAB for Play: android-apk uploads `did-i-android-aab` when the signing secrets are set; `versionCode` = run number
- [x] Android widget: every Did / Nope tapped before the app runs is kept, not only the last
- [x] Android widget: the quick tap paint shows the buddy
- [x] Google sign-in: code, OAuth clients (web, iOS, Android debug), Supabase provider on, IDs in `env.client.js`
- [x] iPhone follows the phone light/dark setting (`userInterfaceStyle` automatic), iOS privacy manifest
- [x] Android: overlay and storage permissions removed
- [x] `expo-updates` added (runtime = app version, channels per EAS profile). Build 56 is the first that takes updates

**Still to do**
- [ ] Next build (60+) for invite links on phones: adds `expo-application` (Play install referrer) and first-launch invite pickup
- [x] Privacy policy: invite links (clipboard read on iPhone only when iOS reports a web link, Play install referrer), Apple and Google sign-in, iPhone push, Expo updates. Still needs the lawyer review
- [ ] Shop drops: merge each drop PR and run `npm run update:prod` before its Friday (`docs/shop-drops.md`)
- [ ] Android release signing: download the keystore from Expo and add the four `ANDROID_KEYSTORE_*` / `ANDROID_KEY_*` GitHub secrets (steps in `docs/native-rebuild.md`), before the android-apk run
- [ ] Google sign-in on Android release builds: add a "Did I Android release" OAuth client with the release key SHA-1 (`npx eas-cli credentials -p android`), and one for the Play signing key after the first upload
- [ ] Fixes from testing build 55 (list them here as you find them)
- [ ] People pass (2026-09-26, branch `remove-dit`): Did you alerts, auto-add, Friends and Family cards, Questions select mode, coin look buy fix. JS only, so `npm run update:prod` once merged; no new native module. `supabase/auto-add.sql` is already applied to the live project
- [ ] Decide on family questions and Tonight (see `docs/not-yet.md`): bring a family block back or change the "shows up on their tonight" line

**Test on the new build** (two accounts where it says so)
- [ ] Sign in with email code (lands in inbox, not junk), Sign in with Apple, and Sign in with Google (web, iPhone, release-signed Android)
- [ ] Add a question, Did / Not yet, undo, streaks right
- [ ] Deadlines sit at the end and are not counted in "0 of N"
- [ ] Reopen the app: no flash of the sign-in screen
- [ ] Midnight: the night turns over, unanswered closes as nope
- [ ] Same account on two phones stays in sync; phone-only use survives a restart
- [ ] Android widget: tap Did on two questions fast with the app closed; both keep their answer, buddy stays on the card
- [ ] `npm run update:internal` or `update:prod` with a small copy change reaches the build on the next two opens
- [ ] Widget, small and medium, both phones: every tag shows, Did / Not yet saves with the app closed, Next steps without answering, buddy and look match the app, nothing spills past the edge
- [ ] iPhone widget answer before midnight, app opened next day: answer kept
- [ ] All 12 cheers on iPhone (Shop previews and a real Did); stage 5 looks right; Less motion turns them off
- [ ] Cheer "i" opens the description; Upgrade buys the next stage
- [ ] Gentle mode (Settings): no streak count on the done card, Stats, Your streaks, or a question page; no broken-streak card; off again brings the numbers back; a friend still sees your streak
- [ ] Rate card (1.3.3 build, 7th cleared night): the in-app review sheet opens on iPhone and Android; a dev client without the module opens the store page
- [ ] Invite link: share from Refer, open did-i.app/i/CODE on a phone with no app, install, sign up; the inviter gets the referral
- [ ] Friends: own number required, ask by number and accept, a taken number is refused
- [ ] Family: assign a question, the other sees it; block works
- [ ] Did you, two accounts: a family member's lands on tonight in the open folder with a banner; a friend's waits in the inbox until "Can add to my tonight" is on, then goes straight on; the menu shows the count on every screen
- [ ] Questions: Select, Select all, Stop asking, Delete with confirm, Undo brings them back with their answers
- [ ] Buy a coin look with 30+ coins (it used to fail with "That look is gone")
- [ ] Push nudge arrives on Android and iPhone
- [ ] Coins earn and spend; sandbox gem buy on each store adds base + bonus; cap of 100 holds

## No build needed

**Apple / App Store Connect**
- [x] iPhone push: the push function sends Apple tokens straight to APNs with key `TL92CR5TVF` (secrets APNS_KEY_ID / APNS_TEAM_ID / APNS_PRIVATE_KEY). Firebase is only used for Android
- [ ] Reprice IAPs: `gems_3` $2.99, `gems_10` $9.99, `gems_25` $24.99, `gems_50` $49.99; display names 6 / 14 / 40 / 80 gems
- [ ] `gems_1`: verify price, countries, review screenshot
- [ ] Paid Apps agreement: add a bank account (status is Pending User Info)
- [ ] EU trader status (Business → Complete Compliance Requirements) and the new age rating questions
- [ ] App-Specific Shared Secret → Supabase `APPLE_IAP_SHARED_SECRET`
- [ ] Privacy Policy URL `https://did-i.app/privacy` on App Privacy
- [ ] Version 1.0: screenshots, review contact phone, Save
- [ ] Attach the tested build and all six IAPs to 1.0, submit, manual release

**Google Play Console**
- [ ] Listing: screenshots, description, content rating, data safety form
- [ ] Gem products with the same prices and names
- [ ] Internal testing track, then production

**Backend**
- [x] Deploy `gem-iap` with its secrets (Apple key set; Play service account invited, waiting on Google to take effect)
- [x] `npm run db:audit` returns no rows (2026-09-26, after `auto-add.sql`)

**Website and legal**
- [ ] `did-i.app` DNS on Vercel, env vars set (`docs/site.md`)
- [ ] `VITE_LEGAL_EMAIL` set
- [ ] Lawyer review of the English `legal.*` text in `src/locales/en.js`, including the friend ID text
- [ ] Spot-check new copy in languages other than English and Spanish
