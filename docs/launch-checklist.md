# Launch checklist

What has to be true before Did I goes live on the App Store and Play Store.
Tick items as they land. Details and history live in `docs/not-yet.md`.

Last updated 2026-09-25. Latest iOS build: **55** (Expo). Next build takes 56.

## 1. Next build (batch these, then build once)

- [x] iOS widget: buddy inside the border, small widget buttons fit (pushed, not yet built)
- [ ] Anything else found while testing build 55 below
- [ ] One build for both: `npm run ios:build:store` and GitHub **android-apk**

## 2. Test on real phones

Use two accounts where it says so. iPhone = TestFlight build, Android = GHA APK.

**Core**
- [ ] Sign in with email code: the code lands in the inbox, not junk
- [ ] Sign in with Apple (iPhone)
- [ ] Add a question, answer Did and Did not, undo, streak counts right
- [ ] Deadline questions sit at the end and are not counted in "0 of N"
- [ ] App closed and reopened: no flash of the sign-in screen
- [ ] Night turns over at midnight; an unanswered night closes as nope

**Sync**
- [ ] Same account on two phones: an answer on one shows on the other
- [ ] Phone-only use (no account) keeps its questions after a restart

**Widget** (both phones, small and medium)
- [ ] Shows tonight's questions from every tag, tag name above each
- [ ] Did / Did not from the widget, app closed: answer is saved
- [ ] Widget answer before midnight, app opened next day: answer kept (iPhone fix)
- [ ] Next pill steps through questions without answering
- [ ] Buddy matches the app and sits inside the border
- [ ] Nothing spills past the widget edge; long questions shrink to fit
- [ ] Look (colors) matches the app

**Cheers**
- [ ] All 12 play in Shop previews on iPhone (only seen on Android so far)
- [ ] A cheer plays after a real Did swipe
- [ ] Higher stages look bigger, not broken (stage 5 Rain = storm of clouds)
- [ ] Less motion setting turns them off
- [ ] Info "i" opens the description; Upgrade buys the next stage

**Friends and family** (two accounts)
- [ ] Friends needs your own phone number first
- [ ] Ask by number, the other accepts
- [ ] A number already on another account is refused
- [ ] Family: assign a question, the other sees it; block works

**Push**
- [ ] Android nudge arrives
- [ ] iPhone nudge arrives (needs the Firebase APNs upload below)

**Coins and gems**
- [ ] Coins earn and spend (looks, cheer stages)
- [ ] Sandbox gem purchase on each store adds the right gems (base + bonus)
- [ ] Gem cap of 100 holds

## 3. Accounts and stores (not code)

**Apple / App Store Connect**
- [ ] Firebase → Cloud Messaging → upload APNs key `TL92CR5TVF`
- [ ] Reprice IAPs for bonus gems: `gems_3` $2.99, `gems_10` $9.99, `gems_25` $24.99, `gems_50` $49.99; display names 6 / 14 / 40 / 80 gems
- [ ] `gems_1`: verify price, countries, review screenshot
- [ ] Paid Apps agreement signed
- [ ] App-Specific Shared Secret → Supabase `APPLE_IAP_SHARED_SECRET`
- [ ] Privacy Policy URL `https://did-i.app/privacy` on App Privacy
- [ ] Version 1.0: screenshots, review contact phone, Save
- [ ] Attach build and all six IAPs to 1.0, submit for review, manual release

**Google Play**
- [ ] Release keystore secrets on GitHub (`ANDROID_KEYSTORE_*`) so APKs stop being debug-signed
- [ ] Build an AAB for Play (the workflow makes an APK today)
- [ ] Play Console listing: screenshots, description, content rating, data safety form
- [ ] Gem products created with the same prices and names
- [ ] Internal testing track, then production

**Backend**
- [ ] Deploy `gem-iap` with its secrets
- [ ] `npm run db:audit` returns no rows

**Website and legal**
- [ ] `did-i.app` DNS on Vercel, env vars set (`docs/site.md`)
- [ ] `VITE_LEGAL_EMAIL` set
- [ ] Lawyer review of `scripts/legal-i18n.mjs`, including the phone number text

## 4. Known gaps to decide on (ship with or fix first)

- [ ] Two widget taps before the app runs keep only the last one (Android)
- [ ] Widget card without a snapshot waits for the redraw to show the buddy
- [ ] Languages other than English and Spanish: spot-check the new copy
