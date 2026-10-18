# Handoff: security pass, UX passes and 1.3.7 (from the cloud session, 2026-10-17 to 10-18)

For the agent on Aaron's computer. Everything below is on branch
`claude/friendly-turing-1ryjpc` (29 commits on top of master), not merged.
Step 0 is a live bug: do it first.
Work through it in order; each step says how to check it. Ask Aaron before
anything that costs money or can't be undone (a store submit, deleting data).

## Already live (nothing to do)

- Master through #310: name prompt on friend accept, keyboard fix, frames on
  every Tonight card, `abuse-caps.sql` and `iap-tries.sql` applied by Aaron,
  `gem-iap` deployed.

## On the branch, not live

| What | Files |
|---|---|
| Refunds take gems back | `supabase/refunds.sql`, `supabase/functions/apple-notify`, `supabase/functions/play-voided`, `supabase/functions/_shared/store-auth.ts` |
| Shelf backfill that minted balances on every re-apply, removed | `supabase/wallet.sql` |
| Sign-in session in an encrypted MMKV file, key in Keychain/Keystore | `native/lib/auth-store.js`, `native/shim/{secure-store,crypto}-safe.cjs`, `native/bootstrap.js`, `src/lib/cloud.js` |
| Signed OTA updates, wired, off until a certificate exists | `app.config.js`, `scripts/updates-signing.mjs`, `scripts/update-prod.mjs`, `.github/workflows/ota-update.yml` |
| shell-quote and source-map-js pinned (npm `overrides`) | `package.json`, `package-lock.json` |
| Watch "1 of N" and ring count every question tonight, not just the cards left | `src/lib/watch-count.js`, `native/watch-sync.js`, `targets/watch/DidIWatchApp.swift`, `android/wear/src/main/java/com/aaronbryant/didi/wear/{Cards,MainActivity}.kt` |
| Cleanup: 9 unused files, the unused Android DynamicColor module (Match wallpaper was already gone), 20 unused strings in all 9 locales | `git show` the cleanup commit; Android needs the 1.3.7 build for the module removal |
| Bug passes: sign-out mid-sync, Did we refresh races, Did/Not yet coin flip (also across two phones: `paid` survives a pull and a merge), recorded gem buy at the cap, every missed day is closed (`src/lib/daily.js` missedRows), family edit error clears on close | `src/lib/{answer-log,cloud-sync,we-nights,did-we,board-ops,purse,board-json,daily,shelf-merge}.js`, `native/screens/FamilyDetail.jsx`, `supabase/refunds.sql` |
| A day that is over without a Did reads Missed (not Not yet) everywhere; gentle mode keeps Not yet | `native/components/{CalendarGrid,LampMonth,NightNotes}.jsx`, `native/screens/{more,questions}.jsx`, `src/lib/{Feed,Calendar,StatsPage}.jsx` |
| Security round 2: refund debt comes off any gem gained (`pay_gem_debt` trigger), apple-notify checks a buy once per 15 min (`store_checked_at`), a sign-out while the Keychain is locked lands once it unlocks | `supabase/refunds.sql`, `supabase/functions/apple-notify`, `native/lib/auth-store.js` |
| QoL: Enter submits forms, code fields take the number pad and email autofill, limits match the server (names 40, folders/families 60, family questions 200, Did you note 280, invite code 16), Use code busy state, 44pt taps on 40pt buttons | `native/screens/{SignInScreen,social,more,questions,we,shop}.jsx`, `native/components/{AuthEmailCard,InviteCodeSection,NameFirstSheet,SendDidYou,NightNotes,TagFilter,ui}.jsx`, `src/lib/useReferralCode.js`, `native/screens/FamilyDetail.jsx` |
| Accessibility: VoiceOver hears toasts, sheets hold focus (and on Android hide the screens behind from TalkBack), week strip days read their state, the card reads its folder, answer buttons shrink to fit | `native/components/{ToastHost,SheetHost,WeekStrip,SwipeCard,CalendarGrid}.jsx`, `native/AppShell.jsx` |
| Wording: day not night in the privacy policy (date now October 18, 2026), help, site and family / cheer pushes; no "did not" in English copy | `src/locales/*.js`, `supabase/push.sql` (server push text: lands with step 0's full run) |
| Cleanup round 2: 126 more unused strings, 3 unused files (`src/site/link.js`, `scripts/build-pages.mjs`, `scripts/eas-patch-podfile.mjs`), old walkthroughs moved to `docs/archive/`; `npm run db:apply <file>` refuses an older file on its own | `src/locales/*.js`, `scripts/sql-order.mjs`, `scripts/apply-sql.mjs` |
| Referrals made easy: Send invite on People and Connect (one tap, link-first message), grouped code with Paste and "Aaron's code ✓", invite QR on Refer (the in-app scanner reads it), code box on Connect, a new account asked once on Today, "You joined with Aaron's invite" after a link | `native/components/{InviteCard,InviteCodeSection,InviteAskHost}.jsx`, `native/lib/share-invite.js`, `native/screens/{social,ScanScreen}.jsx`, `src/lib/{invite-link,people,useReferralCode}.js`, `supabase/invite-owner.sql` (new, in the apply-all order before drop-tonight; until it is live the name check just stays quiet) |
| Open screens update live: friend requests (new, yes, removed), cheer gifts, Did we invites/joins/leaves, family joins/leaves/renames/questions, a Did you edited/taken back/answered. Inbox, Sent, Friend, Families and Family detail read again on the ping. New kinds (weMembers, familyInfo, sendMoved) so no extra silent pushes | `supabase/live-more.sql` (new, in the apply-all order), `native/hooks/useLiveReload.js`, `native/screens/{social,FamilyDetail}.jsx`, `src/lib/{people,did-we,Inbox}.js*` |
| Matches: the watch-face complication counts like the watch app and Today (Did only); the Wear tile says "1 not yet" instead of "All done" and its ring uses Today's count; a friend's card shows their buddy; web calendar says "Did"/"Not yet" | `targets/watch-widget/DidIWatchWidget.swift`, `android/wear/.../DidITileService.kt` (both need the 1.3.7 build), `native/components/frames/FramePreview.jsx`, `src/lib/Calendar.jsx` |
| Fewer steps: Add a friend from zero friends (People), Paste on friend ID and family code, one tap buys cheers and sends the cheer, cheer/gift/Use show a toast, Did we with no friends goes to Add a friend, Notifications lists each question's time (tap to change), sign-in card's Later snoozes a week, answer undo 8s, Add moved to the top of the menu, Settings "Look" is "Appearance", the Did we offer after adding a friend says "Not now" and "you're friends either way" | `native/screens/{social,shop,we,more}.jsx`, `native/components/mast-menu-items.js`, `src/lib/{first-run,undo-times}.js`, `src/locales/*.js` |
| Smoother: screen files load in the background after launch (no hitch on a first open), the shelf is parsed once per change instead of on every read, Shop/Collection chips and Frames tiles do not redraw on every tap, Streaks/Week grid/Feed search memoized, People and Family detail load in one round trip, Gift keeps the person, the Android switch animates on the UI thread; Did we keeps its week totals and early card (no rows jumping in), Feed and Notes draw 40 rows with Show more, the cheer tick and the "Did I" letter wave run on the UI thread | `native/screens/{ScreenRouter,more,frames,shop,social,FamilyDetail}.jsx`, `native/AppShell.jsx`, `native/components/{Cosmetic,SetBits,CheerBurst,DidLead}.jsx`, `native/screens/we.jsx`, `native/shim/reanimated-safe.cjs`, `src/lib/board-shelf.js` |
| Every screen wears the look: a glow of the look's colour behind the top of the page and a short bar of it above the first card | `native/components/{LookGlow,BoardShell}.jsx` |
| Version 1.3.7 (native deps added) | `app.json`, `android/app/build.gradle`, `android/wear/build.gradle`, `strings.xml`, `targets/*/Info.plist` |

Checked in the cloud: `npm test` 349/349, lint, typecheck, `expo export`
Android and iOS, `vite build`, and every SQL test on a local Postgres 16 stand-in
(readthrough-12 and social-live fail there on master too: stand-in gaps).
Nothing has run on a phone or the live database.

## Progress (2026-10-18, local agent)

Done: steps 0 to 3 (full SQL re-apply live, tests and db:audit clean; merged as #311; play-voided, apple-notify and push deployed). Step 4: Apple server notification URLs set (production and sandbox). Left for Aaron: Play service account View financial data, Android key restriction in Google Cloud. Steps 5 and 7 wait for Actions budget; step 6 runs on the 1.3.7 build.

## Steps

0. **First: friends lost their pictures and equipped styles (live bug,
   found 2026-10-17).** Aaron sees no profile pictures, looks or frames on
   his friends. `known_people()` returns them, and only its last definition
   (`supabase/readthrough-12.sql`, also `social-gentle.sql`) includes
   `avatar_url`, `look_on` and `frame_on`; the copies in `hardening.sql` and
   `blocks.sql` return none of them. Most likely one of those (or a
   `db:apply:all` that stopped partway) re-ran on the live database without
   the files after it. Nothing in the profile rows is lost.
   - Before anything else, look at the local working tree: it has
     uncommitted changes in `docs/posts.md` and `src/lib/people.js`, and
     untracked `.github/workflows/ios-watch-check.yml` and `docs/watch.md`.
     Do not stash, discard or overwrite them; ask Aaron what they are. If
     `people.js` changed how friends load, that may be part of this bug.
   - Confirm (read-only, SQL Editor):
     `select pg_get_function_result('public.known_people'::regproc);`.
     No `avatar_url` / `look_on` in it confirms the cause. Also check one
     friend's row still has a picture:
     `select handle, display_name, avatar_url, look_on, frame_on from public.profiles where handle ilike '%cobaltlily%' or display_name ilike '%cobaltlily%';`
   - Fix: re-apply everything in order from this branch (master's
     `wallet.sql` still has the balance backfill this branch removes), in a
     second worktree so the local changes stay put:
     `git worktree add ..\did-i-fix origin/claude/friendly-turing-1ryjpc`,
     `Copy-Item .env.local ..\did-i-fix\`, `cd ..\did-i-fix`,
     `node scripts/apply-all-sql.mjs`. Every file is safe to run again. If
     it stops on an error, fix that file and run it again until it reaches
     the end; a partial run is what causes this. It also applies
     `refunds.sql` (step 2 is then done; its hourly cron gets a 404 until
     `play-voided` is deployed, which is harmless) and the day wording in
     `push.sql` (family summary "3 of 4 done today", "cheered you on today"),
     plus two new files: `invite-owner.sql` ("Aaron's code ✓" on the invite
     code box) and `live-more.sql` (live updates for friend requests, gifts,
     Did we members, family changes, Did yous edited/taken back/answered).
   - Check: the query above now lists `avatar_url`, `look_on`, `frame_on`;
     on Aaron's phone the Friends list shows pictures again and a friend's
     page shows their look and frame. Then `npm run db:audit` (no rows) and
     `git worktree remove ..\did-i-fix --force`.
   - Also check the two new files (from the worktree, before removing it):
     `npm run db:test supabase/tests/invite-owner.test.sql` and
     `npm run db:test supabase/tests/live-more.test.sql`, each ending
     "SQL TESTS PASSED". Without them the app still works: no owner name
     on a code, and screens update on the 5 minute check instead of live.
   - Find out what re-ran the old file (shell history, Supabase SQL Editor
     history) and add the lesson to docs/lessons.md. The check is already
     on the branch: `npm run db:apply <file>` now refuses a file whose
     functions a later file redefines (`scripts/sql-order.mjs`, test in
     scripts/check.mjs), and AGENTS.md says the same for the SQL Editor.

1. **Merge.** `git fetch origin`, open a PR from `claude/friendly-turing-1ryjpc`
   to master, wait for CI, merge. The ota-update workflow skips it (native
   files changed), so phones get nothing yet.

2. **Refund SQL.** Applied by step 0's full run. Check it with
   `npm run db:test supabase/tests/refunds.test.sql` (ends "SQL TESTS PASSED").

3. **Refund functions.** `supabase functions deploy play-voided`, then
   `supabase functions deploy apple-notify --no-verify-jwt` (Apple sends no
   Supabase key; the function asks Apple before acting). Check: in the
   dashboard, `play-voided` logs show `{"seen":..,"taken":..}` after the next
   :17 past the hour, or 503 "play is not set up yet" if the Play secret is
   missing.

4. **Store settings (Aaron clicks these; walk him through):**
   - App Store Connect > the app > App Information > App Store Server
     Notifications: Version 2, Production and Sandbox URL
     `https://<project>.supabase.co/functions/v1/apple-notify`.
   - Play Console > Users and permissions: the service account in
     `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` has View financial data.
   - Google Cloud Console > APIs & Services > Credentials: restrict the
     Android key in `android/app/google-services.json` to package
     `com.aaronbryant.didi` plus the release SHA-1, and to Firebase APIs.

5. **Signed updates, before the build.** docs/native-rebuild.md, "Signed
   updates": generate the key pair, `node scripts/updates-signing.mjs`, commit
   `certs/certificate.pem` and the manifest (never `keys/`), add the
   `EXPO_UPDATES_PRIVATE_KEY` secret on GitHub. Back up `keys/private-key.pem`
   somewhere safe with Aaron; losing it means another store build. Skip this
   step if Aaron would rather not; the build works without it.

6. **Phone pass on the emulator dev build** (docs/phone-pass.md,
   docs/native-rebuild.md dev_client). Release builds show the Expo menu
   bubble problem less; see AGENTS.md.
   - Sign in, kill the app, reopen: still signed in. Sign out works.
   - An account that was signed in on 1.3.6 stays signed in after the update
     (the session moves from plain MMKV into the encrypted file).
   - Widget tap with the app closed still saves.
   - Add: Details note several lines, new folder name, tap between boxes with
     the keyboard up; the box stays above the keyboard.
   - A worn frame on the grace card, a Did we card, a missed-day card and a
     not-yet card.
   - Saying yes to a friend request with no name asks for the name first.
   - Forms: Enter sends the sign-in email, signs in from the code and from the
     reviewer password; the code field opens the number pad and offers the
     emailed code. Enter also submits invite code, family join code, friend
     ID (Android), new family, rename family, family question edit, new and
     renamed folder, first-run name/folder, PIN (Android). Long names stop at
     the limit instead of failing after the tap.
   - Sign out, restart the phone, open the app before unlocking (or from a
     widget), then unlock: still signed out.
   - Referrals: People → Send invite opens the share sheet with the link.
     Refer: Copy copies the link, Show QR shows a code the camera opens.
     A brand-new account sees "Did someone invite you?" once on Today; Paste
     fills a copied link or code; a whole code shows the owner's name. A
     fresh install from an invite link says whose invite it joined with.
   - Two phones, A and B, friends and in one family: with B's screen open,
     A sends a friend request (People), a Did you (Inbox), a cheer gift,
     renames the family and adds a family question (Family): each shows on
     B within a couple of seconds. B answers the Did you: A's Sent updates.
   - Watch: Not yet on one of three questions; the complication, the watch
     app and Today all say 0 of 3 (Did only). Wear tile says "1 not yet".
   - Fewer steps: with no friends, People → Add a friend opens the sheet;
     copy a friend ID or did-i.app/f link, Paste finds them. Cheer with 0
     cheers left: one confirm buys and cheers. Shop → Use a look: "Wearing …".
     Settings → Notifications lists each question's time; a tap edits it.
     Accept a friend: the Did we offer's way out reads "Not now".
   - Smoothness, on a release build (dev builds are always slower): wait 5s
     after launch, then open Shop, Friends and family, Settings, Calendar
     and Frames for the first time: each slides in with no hitch. Scroll
     Shop Looks and Frames; tap a tile and close it: no stutter. Toggle a
     switch in Settings on Android: same motion as before. Did we: open a
     card that tracks an amount twice; the second time nothing moves in.
     Cheer a friend: the tick draws smoothly. Feed with lots of history:
     opens at once, Show more at the bottom.
   - Looks: switch between three looks (one gem look) and open Settings,
     People, Shop and a question: each shows the look's glow and bar, in
     dark and light. Nothing covers the iOS large title.
   - Coins, two phones on one account: Did on A (2 coins), Not yet on B, let
     A sync, Did again on A: no second 2 coins.
   - VoiceOver (iPhone) and TalkBack: answering a card announces the undo
     toast; a sheet (shop buy, name prompt) takes focus on its title and
     VoiceOver cannot swipe onto the card behind it; the Home week strip
     reads each day ("October 3, Cleared"); the card reads its folder first.
     Android TalkBack: with a sheet open, swiping never reaches the screen
     behind it, and after closing it the screen is readable again. Also check
     nothing moved on screen (iPhone large titles, Android pages).
   - A day that is over with no Did reads Missed (red) everywhere: calendar,
     a question's month and Earlier nights, Your history / Feed, the 7-day
     grid, the Missed tile on Stats. Today, and yesterday until 9am, still
     say Not yet. Gentle mode never says Missed.
   - Watch (Wear emulator, or Apple Watch via TestFlight with DIDI_WATCH=1):
     with 4 questions, 2 of them set to ask after a later time, the count
     reads "1 of 4" and stays "of 4" as you answer and when the later ones
     come due; it matches Today's meter at every step: a Did moves it, a Not
     yet does not, Did wes count, and after midnight last night's grace cards
     show but are not in the count. Phone side:
     `src/lib/watch-count.js` (`done` and `later` in the cards); watch side:
     `targets/watch/DidIWatchApp.swift` and `android/wear/.../Cards.kt`.

7. **Build 1.3.7.** Android: Actions > android-apk. iOS: Actions > ios-ipa
   (bumps the build number itself). Then TestFlight and Play internal.
   - These builds are the first compile of the watch changes: the cloud
     session could not build Swift or Kotlin. Watch them go green; a failure
     in `targets/watch-widget/DidIWatchWidget.swift` (complication count) or
     `android/wear/.../DidITileService.kt` (tile count, "1 not yet") is a
     small fix there, not a reason to back the rest out.
   - On the watch: Not yet on one of three questions; the complication, the
     watch app and Today all say 0 of 3, and the Wear tile says "1 not yet".
   - After the build, the JS changes reach older installs by OTA only once
     1.3.7 is what they run (runtimeVersion is the app version).

8. **Watch for a week after it ships:** the look glow on pale looks in
   light mode (Chalk, Lemon), set by reasoning, never seen on a screen;
   push counts (the new live pings use their own kinds so they send no
   silent wakes, so a jump means something is off); the new-account invite
   prompt on Today should not land on top of the first-day intro.

9. **Tidy up.** Move what landed out of docs/not-yet.md ("Security read
   2026-10-17" section), add anything Aaron finds to docs/lessons.md, and
   delete this file.

## Decided, do not redo

- Past answers stay locked once yesterday's grace ends (no "change to Did" on old days): Aaron, 2026-10-18.
- An unnamed friend reads "No name yet" in lists and "Someone" in sentences; friends' IDs are not sent to show instead.

- No cap on how many questions someone can have.
- Night coins and the weekly gem stay as they are (an answer check would
  underpay; coins are asked for before the answer syncs). Milestone cap stays.
- `npm audit fix` without overrides is off the table: it bumps expo-widgets
  past `patches/expo-widgets+57.0.20.patch` and adds a second @expo/ui.
- Missed days are stored as `skip` (the server only takes yes/skip/late) and
  read Missed once the day closes; do not add a new status.
- SQL functions no client calls now (`find_handle`, `my_handle`,
  `claim_auto_sends`, `buy_coin_cosmetic`, `waitlist_count`, `shelf_gem_max`,
  `shelf_coin_max`) stay: older phone builds may still call them.
- About 40 unused JS exports stay (harmless; listed in the cleanup survey).
- Pushes over 30 an hour to one person are dropped quietly; that is the cap.
- Wording left on purpose: Night look / Night owl / Neon night and other
  names, night-sky frame text, "date night", "Morning, noon or night",
  "That is everything for tonight" (shown only at night).
