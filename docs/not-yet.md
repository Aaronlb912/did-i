# What Did I is missing

A review of the app as it stands, not a wish list. When one gets built,
delete it from here.

Last worked through 2026-10-09 (branch `gaps-2`).

## First week (UX loop 2026-11-04)

- /first is three screens and a card before the first question.
- Nothing brings back someone with reminders off on days 2-7.
- No first-week recap.
- Nothing points to per-question reminder times.
- A fresh-install pass is still owed.

## Stats and progress (UX loop 2026-11-04)

- No habit score like Loop.
- No weekly frequency bars for every question.
- No monthly summary card.

## Breaks and rest days (UX loop 2026-11-04)

- Pausing a folder pauses each question one by one; no folder pause yet.
- Away always starts today or tomorrow; no planned start date.
- No one-day rest day for everything that costs no freeze.
- A paused question stays paused until resumed; no end date.

## Remind me in (branch `ux/remind-me`)

- **iPhone widget has no mic.** The widget file uses `widgetURL` for the whole card; iPhone gets the long-press icon shortcut only. A `Link` from `@expo/ui/swift-ui` exists but is untried inside the widget and cannot be checked without a Mac.
- **No background voice capture.** Speech starts only after the app opens; the OS does not allow listening from a widget or shortcut alone.
- **Sign-out clears reminders.** Waiting Remind me notes and their text are dropped on sign-out, so one account's words never reach another account's Today.
- **Reminders live on one phone.** They are not synced to the account or a second phone.
- **Android widget label.** The mic reads `p.remindLabel` and falls back to English; the widget props builder should pass `t('remind.mic')`.

## 1.4.0 native release (branch `native/road-to-ten`, needs a store build)

- **Built:** Share my year sends a picture of the year (react-native-view-shot, expo-sharing; the text share is the fallback). A Calendar grid widget on iOS and Android. A store rating sheet after the Did that takes the streak to 7 (or the first one past it), once ever; it shares the `asked` flag with the Home rate card, so the card then stays away.
- **Not done:** none of it seen on a phone or a widget. The picture is drawn off screen: check it on Android and iPhone. The rating sheet follows the all-folders streak only (not inside a folder view), and the OS decides whether it shows. The grid widget has no today marker and no Not yet legend.

## Product Hunt buddy (branch `hunt-buddy`, needs SQL, OTA, then a build)

- Needs `npm run db:apply:all` (adds the rocket row to `event_catalog`).
- The Android App Link for `/hunt/claim` is a manifest change, so it needs a
  new Android build; until then the page's "Claim" button (`didi://hunt`) works.
- The iPhone `apple-app-site-association` entry ships with the website deploy.

## Signed-out carry (branch `signin-carry`, needs SQL, OTA)

- **Built:** coins, coin looks and accessories earned signed out carry to the account once, at the first sign-in on a phone (`carry_signed_out`, `supabase/signin-carry.sql`). Capped at 300 coins of total value; items are granted cheapest first and cost against the cap.
- **Not done:** a new account on a fresh install can carry again, so farming is bounded only by real earning (300 coins per account). Tried on no phone yet.

## Free event items (Halloween 2026; Thanksgiving 2026, branch `drop/2026-11-23-thanksgiving`)
- **The turkey shows on the iPhone home-screen widget only from the next store build** (widget buddy art is native there); everywhere else it comes with the update.
- **Late signed-out claims stay on the phone.** A bat, boo, turkey or wishbone claimed signed out is sent to the account on the first sync after sign in, up to a day after the window closes. Signing in later than that keeps it on that phone only.
- **Web shop is not updated.** The web Shop pages list the free items as 0 gem buys; the phone shop has the Free tag and Claim button.
- **Owned looks leave Collection when they leave the shop.** Buddies and cheers now always show when owned; looks still use the live list.

## Bug hunt 2026-10-22 (#557 to #563, OTA)
- **Not done: Android widget taps skip the server send while the app is running** (`AnswerKeyPost.java` jsRunning). Removing the skip loses that tap's coins when a pull lands the server row before the app applies the tap. Fix needs coins paid when a pulled row matches a queued tap. Also: an Android card left up past midnight still advances on tap (the widget has no day or fold hour); the app now redraws it from the shelf after.

- **Built:** removed buddy stays off after sync; block refreshes Did we and the inbox; blocking a family member offers leave or remove; offline coins from older days go on yesterday; reminders that run out end with an Open Did I note; edit page save keeps pause records; a parked folder name opens that folder; Wear taps report the watch time (next build).
- **Built: undo on one phone stays undone on a sleeping second phone.** `supabase/answer-undos.sql` notes each undone answer; `put_answers_as` refuses that exact answer and pulls drop it before merging. Answer-key undos (widget, watch, Wear) are noted too, in `key_answer` in the same file, and a live undo reads the slot again so the answer it put back is not lost.
- **Not checked yet:** done screen counts and "N not yet", gentle mode, optional questions, first launch.

## First-run tour (2026-10-21, branch `tour`, SQL applied, OTA)

- **Built:** a step-by-step tour with cutouts. Basics (swipe, add, time, days, folders, Not yet, widget) pays 20 coins once; More (friends, Did you, Did we, cheer, shop, Recent) pays 30 (`supabase/tour-coins.sql`). Progress is per account. Replay from Help, "Show me around". Steps whose target is missing skip. Someone new adds a first question before the menu and tabs show. Three days after Basics, one "Want to see the rest?" card if More was never opened.
- **Not done:** not tried on an iPhone (the Add sheet has its own host). A widget tap on the home screen during the widget step is a real answer. New accounts on a phone that already ran the tour see it again.

## Bug audit 2026-10-20 (#338 and branch `audit-2`, SQL applied, OTA)

- **Built:** a widget or watch Not yet no longer replaces a Did on the server (`supabase/keep-did.sql`); a widget answer with the app closed clears that question's reminders right away; a gem pack that would pass 9999 waits instead of losing gems (`supabase/gem-cap.sql`); only a parent moves a family question onto someone else (`supabase/family-edit.sql`); a Did we Not yet keeps that day's reminder; the iOS app minimum is 1.3.8, so old JS cannot make a gem buy with no owner. Round 2: a stale iOS widget Not yet keeps a Did and redraws; a watch tap that fails stays pending and does not drop the rest; a session that ends on its own clears the answer key; a join or leave never undoes last night's Did we (`supabase/we-keep-done.sql`). Sign out, offline launch and an update mid-answer were audited and are clean.
- **Not done:** Android minimum stays 1.0.0 while 1.3.8 is beta only; an ownerless Play buy from old JS is refused until Google refunds it at 3 days. Round 3: a gem pack waiting for room says so; Supabase requests give up after 30s; IAP buys and the push token were traced after a session ends and are clean. Reminders keep their old times after a time zone change with the app closed until it opens, except on Android with the widget placed (the widget task sets them again).

## App sweeps 2026-10-19 (#322 merged, then branch `sweep-2`; SQL applied, needs the 1.3.8 store build)

- **Built:** two rounds of accessibility, QoL, usability, security and bug passes. Undo only puts back the one answer; Did, Undo, Did pays once, also across an app restart; widget and watch repeat taps stay local; family wrong-code cap shared by every account; invites only for accounts under 7 days, and invite gems only once the invited person has answered on 3 nights (`supabase/sweep2-guards.sql`); photo links pinned to the owner's folder; one nudge per sender a night; the Did button and dim text reach 4.5:1 in every look; shared question pages retry.
- **Not done:** new family codes are 10 characters from 2026-10-21 (`supabase/family-code-10.sql`); families made before keep their 6. Phones still on 1.3.7 can't type a 10-character code. An invite link applies with no ask (it can only take the invite slot now, no gems). Anyone can fill the daily milestone cap (analytics only). Join a family still needs no parent yes. VoiceOver not tried.

## Social fixes (2026-10-20, SQL applied, OTA)

- **Built:** weekly Did we cards use slots: a Did any day from the due night to the day before the next one counts for that due night, so two people answering on different days still finish the week (`supabase/we-slots.sql`). The server counts streak and best (`we_streaks`, also used by `we_claim`); the app falls back to its own count on an older server. A done week older than yesterday can't be undone by take back, Not yet, a join or a leave. A one-time repair ran (`supabase/we-slot-repair.sql`, marker table, added 0). Did you: the sender sees the last 7 days, not the newest 7 rows; once and "by" answers are dated the night they were given; links stop working after 7 days (`did_you_link_open`). Tests: `supabase/tests/did-we-slots.test.sql`, `did-you-flow.test.sql`.
- **Not done:** phones on 1.3.7 count weekly streaks the old way until they update. The repair can't know time zones, so a late-evening answer near a due night may not have been recovered. Translations of the new privacy lines not checked by native speakers. Not tried on a phone.
- **Did we members who are not your friends** (joined by link) show a letter, not a photo or buddy, unless the card carries their photo. Faces come from your friends list.

## Updates on return (OTA)

- **Built:** back in the app after 5+ minutes, it checks and downloads an update and reloads only on Tonight or Home with no sheet open, within 4 seconds of coming back; "Did I updated." after (`native/lib/ota-refresh.js`).
- **Not done:** not tried on a phone.

## Morning ask (branch `morning-today`, needs SQL, OTA)

- **Built:** before noon Tonight opens "Anything to remember today?" as a sheet, once a visit, with a field, an optional time and Add (`native/components/MorningAsk.jsx`, `src/lib/morning-ask.js`). Each add is a one-day question on today (`cadence: 'once'`, `optional`, `morning`), so a Not yet never cuts a streak and a Did pays coins. A time only sets its reminder (askAfter; morning questions skip the wait), shown as "Today, 3:00 PM". Closing before an add is Not today for the day; after an add the button is Done; leaving Tonight or noon takes the sheet down without counting as Not today. 10 a day in the UI; `supabase/morning-cap.sql` drops past 30 a day as an abuse guard. The first day nudge comes at the picked Morning ask time (5:00 to 11:30, default 8:00, times inside quiet hours not offered), asks "What do you want to remember today?" and focuses the field. "Today" label on Tonight pills, cards and the questions list; the past day's sheet lists them with Did / Not yet. Switch `Morning ask` under Day reminders.
- **Not done:** apply `supabase/morning-cap.sql` (in `db:apply:all`), then `npm run db:test supabase/tests/morning-cap.test.sql`. Phone only; the website has no card. Not tried on a phone. The nudge only focuses the card when it is showing (not after Not today or past noon).

## Day nudges (OTA, not tried on a phone)

- **Built:** two local nudges a day, 9:00 and 13:30, for the next 7 days (`src/lib/day-nudges.js`, scheduled with the rest in `native/shim/native.js`). None on a day with every question Did, none within an hour of a question's own reminder, dropped in quiet hours. Re-armed on every answer. On for everyone; switch `Day reminders` (`pingsOff: 'day'`) in Notifications. A second permission ask after a first Did, once, for people who said Not now.
- **Not done:** the 13:30 time is fixed; the morning one follows Morning ask time when that is on. The first-run primer copy still talks about reminders and friends, not the day. Gentle mode does not change them. Not tried on a phone: the ask after a first Did, a nudge at 9:00, no nudge after all Did, tap opens Tonight.
## Widget tip (branch `widget-tip`, OTA)

- **Built:** from the 2nd day Did I is opened with a question, Tonight shows one sheet: "Want your questions on your home screen?" with the steps. Android's button pins the widget (steps if the launcher cannot); iPhone's button is Done. Not now brings it back once, 3 or more days later. State in `did-i-widget-tip` (`src/lib/first-run.js`).
- **Not done:** iPhone cannot tell if the widget is placed without native code (WidgetCenter), so the tip can show to someone who already added it; Done ends it. Days are counted only while Tonight is open. Not tried on a phone.

## Snowman buddy (needs SQL and a store build)

- **Built:** `snowman`, 5 gems, always in the shop, drawn on the website, phone, Android widget, iPhone widget and watch. The iPhone widget now also takes the buddy's shapes from the app (`buddyParts`), so a later buddy draws on an older widget build.
- **Not done:** apply `supabase/gifts.sql` before anyone can buy it (the server price list). Until the next store build, iPhone widgets on 1.3.7 and older show no buddy for a worn snowman (an OTA does not change the widget). Not tried on a phone.

## Security read 2026-10-17 (needs SQL and a function deploy)

- **Built:** `supabase/abuse-caps.sql` (3 friend asks a day per pair and 50 per asker, even if taken back; 30 pushes an hour per person; no direct answer_log writes, 200,000 answers per account; waitlist closed) and `supabase/iap-tries.sql` (30 purchase checks per account per 10 minutes). gem-iap refuses a buy with no owner made after 2026-10-18 and answers `tooMany` at the daily pack cap. Site headers in `vercel.json`; `supabase/config.toml` pins `verify_jwt`. `reports.line_id` is created in blocks.sql, so a fresh database builds.
- **Apply:** `npm run db:apply:all`, then `supabase functions deploy gem-iap`. Until then gem-iap fails closed on `iap_try` ('store'), so deploy it only after the SQL.
- **Refunds (live):** `supabase/refunds.sql` (refunded packs never pay; claimed gems come off the balance and what was spent is owed from the next packs), `functions/apple-notify` and `functions/play-voided` are deployed. Play: the hourly cron reads voided purchases and Google answers (checked 2026-10-20). Apple: App Store Server Notifications (production and sandbox) point at `https://lsvvxslgizihbktqoybt.supabase.co/functions/v1/apple-notify` (checked 2026-10-20). No real refund seen yet on either store. Refunds from before the setup are not caught.
- **1.3.7 build (native):** the sign-in session moves to an encrypted MMKV file whose key is in the Keychain / Keystore (`native/lib/auth-store.js`, expo-secure-store and expo-crypto); signed updates are wired but off until the certificate exists (docs/native-rebuild.md, Signed updates). Not tried on a phone: sign in, kill the app, reopen still signed in; widget tap after a reboot before the first unlock (session stays in plain MMKV until the key reads, then moves); sign out.
- **Not done:** restrict the Firebase key in Google Cloud to the app; night coins and the weekly gem are taken on the phone's word (capped at 6 coins a day; an answer check would underpay, since coins are asked for before the answer syncs); build tools still flagged by npm audit (braces, node-forge, an old @xmldom/xmldom) have no fixed version or only reach prebuild, not the app.

## Reindeer buddy, winter drop (branch `reindeer-buddy`)

- **Built:** a reindeer buddy (`reindeer`) on sale from 2026-12-01 for 5 gems, drawn the same on web, phone, both widgets and the watch. Hats sit between its antlers.
- **Placeholders:** the date 2026-12-01 and the 5 gem price are not confirmed. 2026-12-01 is its own drop day, three days before the 2026-12-04 drop.
- **Supabase not applied yet.** `supabase/gifts.sql` (server price and date) and `supabase/shop-drops.sql` (drop push day), both in `db:apply:all`. Until then a gem buy of the reindeer fails on the server.
- **Not done:** not seen on a phone, a widget or a watch.

## Nights lost flying west over the date line (branch `travel-skipped-nights`)

- **Built:** flying west over the date line (LA to Tokyo) skips the night that was never tonight. Questions left open that night, or closed by the app on its own, are stepped over; a Did counts and a tapped Not yet stays a Not yet. At most one skip a week (`src/lib/travel.js`).
- **Not done:** no skip when the app was not opened the night before the flight, or when the phone changes zone mid-flight in steps under 14 hours. A phone on an older build drops the skipped nights on sync until a newer phone closes again. On a skipped night the widget's last-night rows still take a tapped Not yet, and it counts as a real Not yet. Nights skipped while signed out go to the next account that signs in on that phone, the same as signed-out answers. Not tried on a phone.

## Did you answers for the sender (branch `did-you-answers`)

- **Built:** a kept Did you remembers its send (`sendId` on the question). Each sync copies the last 7 nights of Did / Not yet for those questions to `send_answers` (`supabase/send-answers.sql`, `src/lib/send-answers.js`); taking an answer back drops it on the next sync. The sender's Sent list (web and phone) and the friend page show "Did today 10:41 PM", "Not yet today", "Did yesterday" or "Did {day}" in place of "kept it". The keeper sees "{name} sees your answers to this" with a Share my answers switch on the question's page; off deletes what the sender could see. Blocking, unfriending or leaving the family deletes what was shared, and so does deleting the question. Gentle mode does not hide it (it is not a streak).
- **Supabase not applied yet.** Run `supabase/send-answers.sql` (in `db:apply:all`), then `npm run db:test supabase/tests/send-answers.test.sql`. Until then the reads fail quietly and Sent shows "kept it" as before.
- **Not done:** Did yous kept before this ship have no `sendId`, so they never share (no backfill: the shelf does not know which send they came from). Only the last 7 nights are shared, and offline answers go with the next sync. A phone on an older build keeps Did yous without `sendId`. Not tried on a phone.
- **Follow-ups:** a small 7-night run on Sent for repeating Did yous (rows are already returned); a push to the sender on Did (needs a quiet-hours check).

## Wear OS (branch `wear-os`)

- **Built:** `android/wear` (Compose for Wear OS) shows tonight's cards with the ring, buddy, Not yet and Did, the done screen and a tile; taps save on the phone like a widget tap (`WatchTapService`, `WatchModule`). See docs/watch.md, Wear OS app. CI: wear-check.yml; android-apk.yml builds `did-i-wear-aab` with the release key.
- **Not done:** never run on a Wear emulator or real watch; Play Console Wear OS form factor opt-in and Wear screenshots; no complication (tile only). A tap from the watch is reported back by the watch's own time (from the next build), so a refused tap opens again when the phone next sends cards. English-only fallback words before the first cards.

## Live answers across devices (branch `worktree-agent-a1ad3f1da0c5fa3e3`)

- **Built:** your own answers reach your other open devices through Realtime on `answer_log` (`startLiveAnswers` in `src/lib/cloud-sync.js`, `supabase/realtime.sql`, not applied yet). Watch taps are saved natively on the phone before JS runs and stay on the watch until the phone lists them as taken.
- **Not done:** Did we and Did you answers from other people are still read on focus, not live. Their rows are read through functions, so a live feed needs a broadcast or a new select policy, and that changes what others can see. A device in the background only catches up when it opens (the push function can send `content-available`, but nothing sends it for answers). An undo on one device reaches the others on their next pull. iOS home screen widget taps join the shelf when the app next opens.

## Answer keys and silent wakes (1.3.6, needs SQL, function deploy and a native build)

- **Built:** each device gets a write-only answer key after sign in (`supabase/answer-keys.sql`, `src/lib/answer-key.js`). The iOS widget tap (patches/expo-widgets, `DidIAnswerTap`) and the Android widget and Wear taps (`AnswerKeyPost`, only when no JS runs) post the answer with it, so other devices see it with the app closed. Keys live in the iOS Keychain under the app group (`modules/didi-wake`) and in the Android Keystore (`AnswerKeyStore`); the server keeps a hash. Ended on sign out, forget device and account delete; 10 live per account; 30 writes per key per 10 minutes. Answer changes queue a silent push (`supabase/wake-push.sql`, push function `{"wake":true}`) to your other devices and to the live_ping audience, at most one per device per 10 seconds and 20 an hour. The app pulls and redraws the widgets and watch (`native/wake.js`; iOS app delegate in `modules/didi-wake`, Android `WakeMessagingService` and the widget task).
- **Not done:** nothing here has run on a phone or against the database. Wakes go only to devices with `devices.wake_ok` (set with the push token by 1.3.6+), so 1.3.4 and 1.3.5 phones never get one. Apply order: `answer-keys.sql`, then `wake-push.sql` (both after social-live.sql), then deploy the push function; wakes need the Vault secrets `project_url` and `service_role_key`. The Apple Watch posts nothing itself (its taps reach the account through the phone app as before). iOS does not wake a force-quit app, may hold background pushes, and a system-closed app may not start JS for a wake (it then pulls on the next open). Android wakes redraw through the Tonight widget task, so a phone with no Tonight widget only pulls on the next open. The Together widget refreshes at most every 5 minutes on a wake. No screen lists or ends keys yet (the owner can, through `answer_keys` and `revoke_answer_keys`).

## Apple Watch (branches `watch-1`, `watch-2`)

- **Built:** steps 1 to 3. Watch app in `targets/watch` shows tonight's cards one at a time with Did and Not yet, a done state and "Open Did I on your iPhone" when it has no cards; taps go back to the phone and save like a widget tap (`modules/didi-watch`, `native/watch-sync.js`). Complication "1 of 3" in `targets/watch-widget`. Opt-in with `DIDI_WATCH=1`, built unsigned in CI by ios-watch-check.yml.
- **Not done:** the watch and complication App IDs, App Group and the `IOS_WATCH_PROVISIONING_PROFILE` / `IOS_WATCH_WIDGET_PROVISIONING_PROFILE` secrets (steps in docs/watch.md); a TestFlight pass on a real watch (step 4). Watch words come from the phone in its language; before the first cards, the complication gallery text and the "Open Did I on your iPhone" fallback are English only. Cards from last night stay on the watch until the phone sends new ones. Did we cards are not on the watch.

## Did we look (branch `we-polish`)

- **Built:** a face row with a dot each for tonight (filled did, ring not yet, empty no answer, 5 then +N) on the Did we list, the Tonight swipe card (on top, folder or "Did we" as the kicker) and the card page; one status line ("2 of 3 did it tonight", "Your turn", "{name}'s turn tonight", "All of you did it tonight" / "Done together"), with streak, folder and Together total on a quieter second line; a soft Did we wash on a card done tonight; "How it counts" on the card page; a last 7 nights strip (done together, and your own answer); empty list says "Do something together with a friend or your family" with a New Did we button. Web list and card page match.
- **Not done:** the 7-night strip shows only done-together nights and your own answers. Each member's dot per night would need a new read of others' past answers (RLS only returns your own), which changes what others can see; needs a decision. Cheers are not in one feed with shared notes: cheers on a Did we are not stored per card, so there is nothing to merge yet. The swipe card kicker is your folder name; there is no group name on a card.
- **Needs a signed-in phone look:** dots at 390px with 5 faces plus +N, long German status lines (they truncate), the done wash in light and dark, the face row above the swipe card title.

## Did we amounts and shared notes (branch `social-amounts`)

- **Supabase not applied yet.** Run npm run db:apply:all (or supabase/social-amounts.sql after did-we.sql, blocks.sql). Until then the total line, Track an amount and the Share switch stay hidden or show "Could not share the note".
- **Track an amount on a Did we: card page only, maker only.** The phone has it in the card's more menu; the web card page has Track an amount (maker) and Add your amount after a Did (branch `gaps-1`). The New Did we form has the switch and a unit box on both (branch `owner-picks-a`), saved right after the card is made; if that save fails the card is still made and the form says to turn it on from the card. Not clicked through on a phone or signed in on the web yet.
- **Did we notes (branch `notes-groups`) are phone only, on the card page.** A note goes on tonight after your Did, or on any night you said Did in the last 14 (the Earlier nights list, branch `gaps-1`); Share with the group is off by default. Others on the card see shared ones for the last 14 nights and can cheer you. No note box for an early answer, nothing on the Did we list or the website, and the Did we cheer does not say which note. Needs the SQL (`we_notes` in social-amounts.sql) and a device pass.
- **Share now follows the server.** The note sheet asks the server (one cached read of all your shared notes) when it opens, so another phone shows the right switch. Offline it falls back to what this device last knew.
- **Shared notes show on a friend's page (phone) and under each friend on the web Friends list (branch `web-social`).** Not in the group for a Did we. Both apps have the Share switch in the note box. A cheer on a shared note names it ("A cheer for your note on ...") in the push, the inbox and the banner; it needs friend-cheers.sql and push.sql applied, and until then it goes out as a plain cheer.
- **Needs device testing:** Share switch in the note sheet at 390px, a friend sees the note and cheers it, Remove note takes it back, Together line on the Did we list and card, amount sheet after Did, 21st shared note in a day shows the cap line.

## Every so often questions and a note after Did (branch `long-gap`)

- **Supabase not applied yet for amounts and gentle pushes (branch `amounts`).** answers.sql (amount column, range check, put_answers) and push.sql (push_wanted skips streakRisk and streakHit when gentle is on) changed; run npm run db:apply:all. Until then an amount stays on the phone that saved it and does not reach a second phone. Nothing fails: the old put_answers ignores the amount.
- **Needs device testing (amounts):** Track an amount and its unit on Add and Edit at 390px, the amount box in the note sheet from Add note in the undo toast (decimal keypad, comma reads as a point), Last 5 times on the question page with and without notes and amounts.
- **Amount shows only on Last 5 times.** No totals, averages or chart yet, and the web has no note sheet, so amounts are entered on the phone only. Remove note clears the note and the amount (phone note sheet and the web note box); its undo puts both back on the phone.

## Small fixes (branch `small-fixes`)

- **Needs device testing:** sign in on a fresh install and watch Tonight: loading rows until the first pull lands, no "That is everything for tonight" flash. A failed pull drops the rows and shows the sync miss toast, which now retries on tap.
- **Needs device testing:** a gem pack that is paid but does not credit shows "Your gems are paid for but not in yet. Tap to try again." (tap runs Restore). Hard to force; a server miss on submit_gem_purchase does it.
- **Web welcome not clicked through.** A fresh web visit (cloud set up, never signed in, no questions) shows Get started, "Have an account? Sign in" (opens Account) and the legal line. Checked with tests and `vite build` only.
- **Amounts: average and a 14 night chart only.** The question page shows "About 6 glasses a night" (Did nights, last 30) and bars for the last 14 nights. No totals, goals or longer ranges yet. Not tried on a phone yet. The web has no note sheet outside the undo toast, so amounts are mostly entered on the phone.
- **Needs device testing:** the Every so often pills on Add and Edit (about a week, 2 weeks, a month, Other with a number), the "Last time" line on the swipe card, the "12d" pill on the Questions list at 390px, the question page tiles, and Add note in the undo toast after a Did (opens the note sheet, the toast still undoes).
- **Web matches the phone in a build only.** The website card shows "Last time", the Questions list the days pill, and the question page the last-time and usual-gap tiles; checked with `vite build`, not yet clicked through with a real every so often question.
- **Not yet on one is not a miss.** A due every so often question counts toward a cleared night only once it is Did; Not yet never holds the night open. No streak and no missed dots. Reminders follow the same due rule (scheduled from today's answers).
- **Calendar and stats leave it out.** The overall calendar, streaks and the 30-night tile skip these questions; the question's own month view shows only the nights it was done.

## Shared every so often (branch `social-every`)

- **Supabase not applied yet.** Run `supabase/shared-every.sql` (or `npm run db:apply:all`, it is last in the list) before this ships. Until then the family and Did you lists select `every_days` and `last_did_on`, which do not exist yet, so those reads fail.
- **Family questions only.** A family question can come up every so often (about a week, 2 weeks, a month; no Other box). It is due for everyone it is for once that long has passed since anyone's last Did; the first Did resets it for the family; Not yet only counts for you, that night. No streak. Did we cards stay nightly or weekly.
- **Did you asks** can be every so often too. If the question matches one of the sender's own every so often questions, the ask carries the sender's last Did and both sides see "Last time: 12 days ago". Matching is by the words, so a reworded ask shows "Never yet".
- **On the website too (branch `web-social`).** The web Family page has the When chips and the last-time line, the family panel on Tonight shows it, and both web Did you forms offer Every so often; the inbox and Sent show "Last time". Clicked through signed out only at 390px; signed-in screens checked with tests and `vite build`.
- **Needs device testing:** the When chips on a family page at 390px, the "Sam did it 2 days ago" line on the Tonight people card and the family page, the every so often pills in the Did you sheet, and the last-time line in the inbox and Sent.
- **Not on the widget.** The widget does not show people cards, so these do not appear there.

## Card frames

- **Needs device testing:** frame on the Home done card and the swipe stack (top card moves, cards behind stay still), nothing clipped and the week dots and friends pill clear of the frame, animation stops off screen, in the background, after a while without a touch and with Less motion; the Collection tiles at 390px wide; a coin buy and a gem buy while signed in.
- **Needs device testing (friends, gifts, low power):** a friend's page shows their card in their look and frame (and a plain card with no frame); a gem frame sent as a gift arrives, Wear it puts it on, a second copy goes back; frames hold still in low power mode (iPhone Low Power Mode, Android Battery Saver) and move again when it is off. Low power needs the next native build (bump to 1.3.1; expo-battery); a binary without it never pauses for it and does not crash.
- **Needs device testing (pass 3a fixes):** Questions > Select > Move to a folder and its undo; the Home card and friends row move up while a toast shows (with and without the Did / Nope row); the done count changes with the left count during the cheer; the note sheet stays above the keyboard, and Remove note with undo; German shows 09:00 with the clock on Phone; the year view starts at the first month with answers.
- **Supabase not applied yet for frame_on and frame gifts.** friends-week.sql and gifts.sql changed; run npm run db:apply:all and the frames-social test before the OTA. Until then the phone's look and frame write fails quietly and friends see no card.
- **Gift thanks needs supabase/gift-thanks.sql applied** (npm run db:apply:all, then npm run db:test supabase/tests/gift-thanks.test.sql). Until then Say thanks shows an error. Say thanks is only on the gift pop-up, not on the gift in the Collection or Recent, and the web gift pop-up has none.
- **Friend requests need a name: supabase/friend-ask-name.sql not applied yet** (npm run db:apply:all, then db:test friend-ask-name, friend-ids, share-links, consent-guards). Until then nameless people can still ask and the request list shows no friend ID. Needs a phone pass: friend ID, QR scan, Did you link and Did we link asks with no name. A Did you link ask refused for no name waits and is retried on the next app open, not right after the name is saved.
- **Frame unlock and gift arrival fanfare need a phone pass:** cheer burst, haptic, the New frame unlocked toast and Wear it.
- **Web shows a gifted frame by name only.** No frame art on the web, and View in collection there has no frames tab.
- **Web app has no frames.** The website's Shop and Collection do not list them; only the phone does.
- **Frame wishlist is phone only, and Remind me is not a push (branch `owner-picks-c`).** Coin, gem and seasonal frames have the wishlist heart; a seasonal frame that is closed says Remind me, and once it is back the done card says you can get it now. No push when it opens. Needs a device pass: the heart on a frame sheet, the frame tile on the Collection wishlist opens the frame sheet.

## Friend notes

- **On the web Friends list too (branch `owner-picks-a`).** Each friend card has Your note: add, edit, Remove note (or Save empty), 500 characters, one read for the whole list. Checked with tests and `vite build` only, not signed in. Family members who are not friends have no note box on the web.
- **Needs device testing:** add, edit, clear (Save with an empty box) on a friend page, offline save shows the miss line, the note is back on a second phone.

## Family chip and gentle blanks (branch `owner-picks-a`)

- **Family chip by your count.** Phone Home shows "+2 family" (and "+1 from friends" for Did you asks) beside done and left; your own count never includes them. The web shows the family part only (the web Tonight has no ask cards) and a tap scrolls to the family panel. On the phone it is a label only. Hidden when you have nothing of your own tonight, since the meter is hidden then. Needs a phone pass at 390px with a long German label.
- **Gentle mode blanks missed nights** on the Home dots, the week strip (phone and web), the question month view and its key, past one-time questions on the Questions list, the history day labels and sheets, and the why sheet (no "streak broke" line). Achievements like Come back still name a missed night. Needs a phone pass.

## Referral rewards (branch `feat/referral-rewards`)

- **SQL not applied.** `supabase/referral-rewards.sql` (claim_invites lists the Hive buddy at 15 friends and the Bloom frame at 20) and the `bloom` id in `supabase/friends-week.sql`. Run `npm run db:apply:all`, then `node scripts/test-sql.mjs supabase/tests/referral-rewards.test.sql`. Until then nobody gets the two rewards and wearing Bloom fails the frame_on write quietly.
- **Needs device testing:** the Refer ladder at 390px (dark, light, a gem look), the Hive chip sway and the sheets, Bloom on the top card only, still with Less motion and in tiles; Hive on the Android widget and wearing a hat between its antennae. The iPhone widget draws Hive from the next store build.
- **Web Refer page draws Bloom from its own SVG.** The web has no frame renderer, so the ladder there uses a small copy of the art.

## Reminder answers and streak freezes (branch `feat/answer-freeze-r10`)

- **Reminder buttons when the app is fully closed need a native build.** With `opensAppToForeground: false` the answer is saved only when JS gets the response: app open or in the background (both platforms), and on iOS when the system wakes the app. A phone that killed the app may drop the tap. A sure path needs `expo-task-manager` plus `Notifications.registerTaskAsync` (a headless task that runs `applyWidgetTapOnce`), which is a new native module, so a new build on both platforms. Test on the device before shipping the OTA: if taps are lost from a killed app, set `opensAppToForeground` back to true in `src/lib/notify-answer.js`.
- **No tap feedback on the notification itself.** The reminder is cleared; a refused answer (night over, already answered) shows a toast the next time the app is open.
- **Freezes on the web (branch `gaps-2`).** The web calendar and week strip draw a covered night as the freeze ring, from the same night data as the phone. Checked with tests and `vite build` only.
- **First streak walk is slower on long histories.** Freezes walk every night from the first one; about 85 ms on a laptop for two years of 8 daily questions, once per day per launch. Later walks reuse the settled nights.
- **Freezes are not on the server.** The server stores the streak the app sends (`profiles.streak`), so friends see the frozen streak too. No coins are paid for freezes and per-question streaks ignore them.

## Settings and social round 4 (branch `polish/settings-social-round4`)

- **SQL not applied.** `supabase/family-summary.sql` (profiles.family_hour) and the new `supabase/device-names.sql` (devices.model, devices.name). Until applied, the family hour picker shows a save miss and phone rename fails; the app falls back to the old device columns. Test: `supabase/tests/settings-social.test.sql`.
- **iOS phones show "iPhone · iOS 18.2", not the exact model.** No expo-device; Platform constants have no hardware model on iOS.
- **The cheer line opens the friend page, not a one-tap cheer.** On purpose (no auto-send), but it is one more tap.
- **New day start is fixed at midnight.** Shown as plain info; a picker for dayFoldHour would need night-math and server changes.

## Settings polish (branch `polish/craft`)

- **Drop push needs SQL applied.** `supabase/shop-drops.sql` (after push.sql) and the new `drop_live` text in push.sql are not applied yet. New drop dates in `src/lib/purse.js` need a row in `shop_drop_days` too; `npm test` fails until they match.
- **Rating uses the in-app sheet from 1.3.3, not tried on a phone yet.** RateCard calls `expo-store-review` when the phone has it, else opens the store link. Builds before 1.3.3 and dev clients without the module get the link (shim `native/shim/store-review-safe.cjs`). Apple and Google decide whether the sheet shows; a draft or internal-test app may show nothing, and the card is already gone by then.

## Gentle mode

- **Phone and web.** The switch is in phone Settings and web Settings (next to Less motion). On the web it hides the Stats nights-on number, the Streaks page counts, the question page streak tile and streak popups. The web Home never showed a streak number.
- **Widgets get a `gentle` flag but show no streak today,** so nothing changes on them.
- **Shared streaks stay.** Did we streaks are shared with others and still show.
- **Friends and family see "Done tonight ✓" or "Not yet", no number (branch `social-gentle`).** supabase/social-gentle.sql nulls the streak in `known_people` and the public tonight wall for anyone with gentle on, and the phone and web read it through `friendLine` / `friendStreak` in people.js. **Not applied yet:** run npm run db:apply:all. Until then the old `known_people` still sends the number and only the client hides it once the `gentle` column arrives.
- **Gentle is read from `profiles.prefs`,** so it reaches friends only after the phone syncs prefs.

## Check on me (branch `social-gentle`)

- **Not applied yet.** supabase/social-gentle.sql adds `check_ons` (RLS: owner and friend read, owner writes, either deletes; 20 per person; buddy index), `queue_check_ons()` and a `check-ons` pg_cron job every 5 minutes. The existing drain-push job sends what it queues. Needs pg_cron, as family-summary.sql does.
- **Phone and web.** Set it on a question's page (daily, weekly, monthly, Just once, deadline and every so often questions; the web uses a time box, the phone +30/-30). The phone friend page lists what they asked you to check on, with Send a Did you and Turn off; the web shows the same under each friend on the Friends list (branch `web-social`) and, for family members who are not friends, under them on the Family page (branch `gaps-1`). Web not tried signed in.
- **Uses the friend's "friends" notification switch,** not a kind of its own.
- **New check-on columns not applied yet** (`kind`, `month_day`, `on_date`, `starts_on`, `every_days` on `check_ons`). Re-run social-gentle.sql before shipping the phone build: the card now sends them on every save. The job (branch `gaps-1`) nudges a deadline on every night of its window, and an every so often question on the gap the app learns (median of the last Dids), the same as Tonight.
- **An edit updates the check-on** (words and schedule) from Edit question on both apps (branch `gaps-1`). A question changed some other way (a copy loaded from a file, another device's old build) keeps the old rule until its page saves again.
- **Push text is in 9 languages in SQL (`check_on_text`),** separate from `push_text`.
- **SQL test:** `node scripts/test-sql.mjs supabase/tests/check-ons.test.sql` (friends only, owner writes, friend reads and turns off, 20 cap; branch `gaps-2`). The push tap to a prefilled Did you needs device testing (iPhone and Android, app closed and open).
- **Accessibility is code-level only.** Labels and roles added, inkDim raised to 4.5:1 on panel in every look. Not tried with TalkBack, VoiceOver, or 200% font on a phone. Modal backdrops still have no label.

## App PIN

- **Forgot PIN.** Signed in: a code to the account email removes the PIN. Signed out: the only way past is to erase what is on the device.
- **The sign-in code path is not tried end to end** (needs a real inbox); the signed-out erase path is.

## Save a copy

- **Shares text, not a file.** Save a copy uses the share sheet with the JSON as text; Drive or Files save it as .txt, which Load a copy now accepts. A real .json file needs expo-file-system + expo-sharing (a native build).

## Did you links and sends from Did I (branch `did-you-links`)

- **Links**: "Share as a link" on the send sheet makes did-i.app/d/CODE (20 a day). Opening it on a phone needs the next native build for the Android `/d/` App Link and the updated AASA on the site; didi://d/CODE and the page's Open button work over the air. Not tried on a phone yet.
- **Ending a link** works from Sent (phone and web, "Shared as a link"). An ended link says "This link has ended" on the page, in the app and in the preview, and the server refuses the add. There is still no way to delete a link outright.
- **Reporting a link** (`report_did_you_link`, in `supabase/did-you-links.sql`, not applied yet): a Report on the /d/CODE page and under the phone's add sheet. Signed in only, once per link, inside the 20 a day report cap. It files a report and blocks the maker. The link stays up until an admin ends it from the reports page (see Reports admin below).
- **Sends from Did I** (`scripts/send-from-did-i.mjs`, max 4 in 30 days) reach signed-in accounts only. Inbox ones show for 30 days. `--tonight` ones are added on the next sync for that night (or the night after, by date), while the app or web app is open.
- **The site page shows the maker's photo** when they have one (branch `gaps-2`); no photo as the preview image yet.
- **Did we links** (did-i.app/d/ with a 12 letter code, `supabase/share-links.sql`) last 7 days, 10 new a day per person, and can be turned off from the Did we page. Opening one offers "Join and add {name}", "Just join" or "No thanks"; a Did you link now offers "Keep it and add {name}" too. Friends are only made on that tap. Not tried on a phone yet; the sheet needs the OTA.
- **Link previews** come from `api/link-preview.js` (a Vercel function on /d/CODE). The fixed words follow Accept-Language across the 9 app languages (cached per language); the question stays as written. Text only (no sender photo as the preview image yet).
- **Did we links can be reported** (branch `gaps-2`) from the join sheet and the /d/ page, the same rules as Did you links (`report_we_link` in `supabase/share-links.sql`, not applied yet). The reports page can end them.

## Profile pictures (2026-10-02)

- Picking a photo needs the 1.3.0 build (expo-image-picker and
  expo-image-manipulator). Older builds show "comes with the next update".
- The website shows initials, not photos, and cannot set one.
- Report photo blocks the person and files a report. Remove on the reports
  page clears the photo from the profile; the old file stays in the avatars
  bucket (SQL can not delete storage files) until they upload a new one.
- Phones already listed twice under Account stay until they age out (30
  days) or "Remove the other phones" is used; new installs no longer add rows.

## 1.3.0 build pieces (2026-10-02)

None of these has run on a real phone yet. They need the 1.3.0 build.

- **Camera photo** for your profile (image picker, front camera).
- **QR codes**: your friend code is on Connect ("Show my QR code"), and the family code is in the family's code box. Scan from Connect, the add-friend box, or the app icon. The codes are did-i.app/f/ID and /j/CODE links, and the page (src/site/ScanLanding.jsx) has an Open in Did I button plus the store buttons. The code survives install (Play referrer, copied link on iPhone) and sign-in (AppShell replays it once the shelf is ready). Universal links / App Links: public/.well-known holds both files. Associated Domains is on the App ID (2026-10-02), the App Store profile was remade, and the repo variable DIDI_UNIVERSAL_LINKS=1 turns on `ios.associatedDomains` in the iOS build (builds up to 1.3.8 dropped it; fixed 2026-10-19). Not checked on a phone yet.
- **Together widget** (iOS and Android): friends and family with a check when done tonight. The list is only as fresh as the last time the app loaded people; the tap opens the hub, not one person.
- **Answer by voice**: Siri "Answer Did I" and Assistant "I did ... in Did I" open didi://answer. The Assistant query pattern format is unverified.
- **Keep and Pass on a friend's did you**: iPhone only; Android's system-drawn push has no buttons.
- **Nightly family summary** (supabase/family-summary.sql, over the air): not applied yet. Apply it when the app with the 'family' notification switch ships, so people can turn it off. Counts only members who share their streak; English only, like the other server pushes.
- **App icon shortcuts** (expo-quick-actions): Tonight, Add (iPhone only, since Android already has a fixed one), Friends and family, Scan. The labels are set when the app opens, so they follow a language change only on the next launch. Android shows no icons on these.
- **Did and Nope on reminders**: over the air. The buttons no longer open the app (branch `feat/answer-freeze-r10`); JS saves the answer the way a widget tap does, clears the reminder and redraws the widget. Did we reminders carry the same buttons.

## Did we (branch `did-we`, after launch)

Shared questions two or more people answer together. Built on the branch,
database live, not merged. What is left is listed in `docs/did-we.md`
under "Not done yet": no two-account run yet, and the web Tonight card uses
buttons where the phone swipes.

## Found in the 2026-09-30 security check

- **Signed out, a gem item buy asks to sign in first (branch `owner-picks-c`).**
  Looks, cheers, buddies and frames bought with gems show Sign in / Not now,
  phone and web, so nothing is bought that sign-in would replace. Gem items
  bought on a phone before this change still go at sign in. Coin items are
  unchanged: sign-in keeps them. Needs a device pass signed out.
- **TestFlight gem buys credit real gems** (the receipt check accepts Apple's
  sandbox so App Review can buy). Fine for testers; revisit if it gets abused.
- **Gem items bought while signed out stay on that phone only.** Since gem
  items moved to the server (`buy_with_gems`, `gem_cosmetics` in `gifts.sql`),
  signing in replaces the phone's gem items with the account's list, the same
  way signing in already replaced signed-out gems. Nobody signed in has lost
  anything: existing shelves were copied to the server once.
- **Test gem buys after launch** (branch `launch-safety`, `gem-iap` not deployed
  yet). Apple sandbox and Play license-tester buys credit only ids in
  `IAP_TEST_USERS` once `IAP_LAUNCH_AT` has passed; before it every test buy
  credits. With no `IAP_LAUNCH_AT` the list always applies (as before).
  Others see "Test purchases don't add gems." Keep the App Review account on
  the list. The toast needs the next OTA.
- **Reports admin** (branch `launch-safety`, `supabase/admin.sql` not applied):
  did-i.app/app#/admin/reports, in no menu. Only ids in `public.admins`
  (added by hand in SQL) can read reports or act. Dismiss, Remove (photo,
  Did you link, Did we link) and Ban (Supabase Auth `banned_until`: no
  sign-in or token refresh; lift it in SQL). Every action is logged in
  `report_actions`. Report emails (branch `admin-mail`, `supabase/admin-mail.sql`
  not applied, `report-mail` function not deployed): every admin gets one
  plain email per report through Resend. Needs RESEND_API_KEY and the Vault
  secrets project_url and service_role_key. Removing a photo also deletes the
  file. Lines on the shared list and plain person reports have
  no Remove; Ban covers them.

## Found in the 2026-09-26 people pass

- **Auto-add runs while the app is open.** A family did you, or one from a
  friend allowed to add, is claimed on the next app open or focus, not
  the moment it is sent. The push still arrives. The widget shows it only
  after the app has opened once.
- **Auto-add not tried with two real accounts.** The server rules pass
  `npm run db:test supabase/tests/auto-add.test.sql` (rolled-back fixtures:
  family goes straight on, a friend waits until switched on, the sender
  cannot read the switch, a stranger cannot send, signed out gets nothing,
  blocking drops the switch). The emulator showed the badge, menu row,
  banner, and the add to tonight with stand-in data only.
- **Web people screens signed in.** Friends, family, and the did you banner
  on the website were checked at 390px with fixture data, not a signed-in
  session.

## Waiting on an account, not on code

**Sign in with Apple.** Portal + Supabase configured (`npm run
apple:auth:setup` done). Use a **launch-clean** store build on iOS 1.0 (not
**23**; see iOS build below).

**Mail delivery test.** Custom SMTP is on (Resend, `support@did-i.app`,
`npm run smtp:setup`). Send yourself a sign-in code and confirm it hits
the inbox, not junk. If it does not, check SPF/DKIM on `did-i.app` in
Resend and the Auth rate limits in the Supabase dashboard.

**Push on a real phone.** Android: `android/app/google-services.json` was
lost when Capacitor was removed (20 Sep 2026), so APKs built from the
committed `android/` had no Firebase and could not get a push token. It is
back, with the `com.google.gms.google-services` Gradle plugin, as of 25 Sep
2026; the next android-apk run is the first to carry it. **iOS** has
`GoogleService-Info.plist` at repo root (gitignored; `.easignore` now uploads
it to EAS) and APNs key **Did I Firebase Push** (`TL92CR5TVF`). Finish **Firebase → Cloud Messaging →
production APNs auth key → Upload** (Browse → `AuthKey_TL92CR5TVF.p8`, Key ID
`TL92CR5TVF`, Team ID `2ZUKFKSSV8`). Then install a **new store build** with the plist baked in (`docs/push-ios.md`).
End-to-end nudge still unconfirmed.

**iOS store IPA from Windows.** Default: GitHub **iOS IPA** workflow with signing
secrets (`docs/native-rebuild.md`). EAS fallback (`docs/app-store-connect.md`).
No committed `ios/` folder; GHA runs `expo prebuild` on `macos-latest`. App Store
Connect API upload is wired (key ID **S7K3PW29JF** in GitHub secrets; verified on a
GHA run). `scripts/ios-bump-build.mjs` takes and pushes the next `ios.buildNumber` before
each build (78 as of 2026-10-09).

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

**Widgets never get frames.** A frame is for the card in the app. The
home screen widgets stay as they are.

**Kid accounts stay as they are.** A family is people sharing chores,
and the parent and kid roles decide who can assign what. Did I is not a
children's app and does not claim to be one. Blocking covers the case
where somebody is a nuisance.

## Before launch (your accounts, not the repo)

1. Confirm sign-in codes arrive in the inbox (SMTP is configured; see above).
2. Point `did-i.app` DNS at Vercel; import repo and set env vars (see `docs/site.md`).
3. Set `VITE_LEGAL_EMAIL` and have a lawyer review the English `legal.*` text in `src/locales/en.js`.
4. Privacy and terms at `/privacy` and `/terms` (and in the app). Disclosures
   at sign-in and gem checkout are already in copy.
5. When you are ready for paid gems: store products + `gem-iap` secrets per `docs/iap.md`.
6. `npx expo prebuild` and install on a phone; walk social, settings, and push with a second account.
7. Friend IDs (30 Sep 2026): with two real accounts, add one by the other's friend ID, accept, and check the push reads "Name wants to be friends." Server rules are proven on the live DB; the full two-account round trip is not. Phone numbers were removed from the app and the database; the legal text changed, so include it in the lawyer review.

## Native Android vs localhost web

The Expo app in `native/` shares night maths, swipe, cheer recipes, and
`useTonightStack.js` with the browser build. These still differ:

- **Cheer burst fidelity.** All twelve cheers play on the Android emulator
  (25 Sep 2026, Shop previews and a Did swipe). Not yet seen on an iPhone.
  Web CSS animations may still feel snappier on some cheers.
- **Collection screen, no device pass.** The single grid, worn check badge,
  tap-to-wear, and the native segmented control (`KitSegment`) are covered by
  code review only. Check Looks, Cheers, and Buddies on iOS and Android, in
  dark and light.
- **iOS widget, untested.** Per-question tag header, Next pill, fit-to-card
  question, and the buddy redrawn from the app SVG are covered by `npm test`
  only. Needs a TestFlight build to confirm the Next button, the triangle
  ears, and the text shrink on a real home screen.
- **Visual diff caps.** `npm run visual` compares web vs native fixtures at
  390px. Jewel is tight (~10%); face/settings are looser until RN-web layout
  matches DOM more closely.
- **Android predictive back has no in-app peek.** Predictive back is on
  (`enableOnBackInvokedCallback`), screens push with the Material shared-axis
  transition, and system back pops them. The stable native stack in
  react-native-screens 4.28 does not feed the gesture's progress to the
  screen transition, so the previous screen does not slide into view while
  the finger is down; it pops on release. Checked again 2026-09-28: the 4.29
  nightlies still do not, and the experimental Stack v5 (5.0.0-alpha) has only
  a skeleton transition API (its presets are open PRs #4660 and #4670) and no
  React Navigation integration yet. Skipped for launch as an Android fast
  follow; revisit when Stack v5 ships with React Navigation support.
- **Three older springs still run at Reanimated 4's default mass of 4.**
  Reanimated 4 gives a spring with no `mass` a mass of 4, so the damping they
  were tuned with reads four times as bouncy. The motion pass names `mass: 1`
  on its own springs; these predate it and were left as they are: the menu's
  `OPEN_SPRING` (`native/components/MastMenu.jsx`), the swipe card's release
  `SPRING` (`native/components/SwipeCard.jsx`), and the done card's streak pop
  (`native/components/DoneCard.jsx`). Name their mass once someone has looked
  at each on a phone.
- **Ask-at time picker is still a hand-made popup.** The hour, minute and
  AM/PM selects on Add (`HangSelect`) open a centered React Native list.
  Settings pickers are native menus and sheets now; this one should become
  the platform's time picker.
- **Keyboard shortcuts** on Tonight (web only): y/s, j/k, u, n.
- **Print slip** on Tonight (web only).
- **iOS IPA signing on GHA.** With distro cert, profiles, `GOOGLE_SERVICES_PLIST`,
  and App Store Connect API secrets set, `ios-ipa.yml` signs, exports, and uploads
  to TestFlight (`docs/native-rebuild.md`). Without them, the workflow still emits an
  unsigned archive only.

Tonight parity landed 2026-09-20: wait/hole plates, sync miss line,
title edit, idle face, night-strip history gate, meter/purse pop,
cheer skip under reduce-motion.

## Ideas parked (not built)

- **Classes** (teachers post questions to a class; high school and college, 13+): plan in docs/classes-plan.md. Parked 2026-10-01.
- **Buddy accessories:** the iPhone widget draws them from simple shapes (src/lib/accessory-shapes.js), checked side by side with the real drawings in a browser but not yet seen on an iPhone. The seasonal dates are for this year; next year needs new rows in src/lib/accessories.js, shop-catalog.sql and gifts.sql.
- **More coin sinks** from the brainstorm (undo token, preview gem looks, extra tag slot, streak stamps, tag badges) are still open. Signed-in **coin earns and spends** for looks and cheer stages go through `wallet.sql`; run `db:apply:all` after SQL edits.
- **Add a question by voice, the rest of it.** Built (27 Sep 2026):
  `didi://add?q=...` prefills Add; Android has an app-icon shortcut and a
  Google Assistant `CREATE_THING` capability (`android/.../res/xml/shortcuts.xml`).
  Still open: the Assistant phrase only works once the build is on Play and
  checked in the App Actions test tool. iPhone: a Siri App Intent
  (`plugins/with-siri-add.cjs`, 27 Sep 2026): "Add a question in Did I" asks
  for the question and opens the same link. Not yet run on a phone; needs the
  next iOS build.
- **iOS widget taps have no tap time.** Android now stamps each queued tap
  (`WidgetTapStore`, 27 Sep 2026) so a stale card tapped the next morning is
  dropped. iOS widget answers still land on their stored night.
- **Shake to undo** is off and out of the build from 1.3.2: no expo-sensors, no `NSMotionUsageDescription`. Tap to undo stays. `useShakeUndo` returns false; `src/lib/shake-undo.js` keeps the detection if it comes back.
- **UX clarity pass (2026-10-08) needs a phone check:** Later on a question not open yet, Not yet / Missed wording on the calendar, stats and Did we, the Name and note page with no sign-out row, the one-line swipe hint on the first-question screen, and the folder vs topic line on Edit question.
- **Did I tonight (the public list) drop is not applied (branch `owner-picks-c`).**
  `supabase/drop-tonight.sql` drops the tables (`tonight`, `cheers`), their
  functions and `profiles.public_tonight`, and now owns `delete_me()` (with
  the family hand-off from people.sql, which the old tonight.sql copy had
  lost). tonight.sql and dit-board.sql are deleted. Run `npm run db:apply:all`
  (or `npm run db:apply -- supabase/drop-tonight.sql`). `reports.line_id`
  stays as a plain column.

## Done (2026-09-26 people pass)

- Did you alerts: a count on the menu button on every screen, a lit Did you
  row in the menu, and a banner when one lands while the app is open (tap
  opens the inbox, close button, still under Less motion). One shared poll
  for all badges; coming back to the app refreshes it on the phone too
  (the phone's stand-in `document` had been swallowing that listener).
- Auto-add: family did yous go straight onto tonight in the open folder.
  A friend's do the same only with "Can add to my tonight" on for that
  friend (`supabase/auto-add.sql`: `auto_adds`, `claim_auto_sends()`, family
  can send a did you, cap of 200, switch dropped with the friendship).
- Friends and family restyled on phone and web: cards with initials, done
  tonight at a glance, Did you and Cheer on each card, the rest under More.
  Family members can be sent a did you.
- Questions: Select mode with Select all, Stop asking / Ask again, and
  Delete with a confirm and Undo.
- Buying a coin look said "That look is gone" every time; fixed.
- Privacy and terms no longer mention public tonight lines.

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
  WaitPlate, site pages, cadence lines, device labels, and home
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

- A free holiday item claimed signed out reaches the account only if you sign in within a day of the drop closing. Later, it stays on that phone (and its board sync). Letting the server take late claims would let a changed phone clock claim any past drop.

- Siri and Google Assistant answers open the card and ask for a tap; they do not save on their own. Saving from Siri needs a store build with an App Intent that writes natively (Streaks and Habitify do this). Siri phrases are English only, and the Assistant phrases in android res/values/arrays.xml still say nope, did not and tonight; both change with that build.

## Proof photos (2026-11-05)

- Phone only. The web app does not add or show photos.
- Add photo sits in the done toast and on the Did we card. No row on the question page yet.
- Needs a device pass: picker, camera, signed images, full-screen view, push.
- No auto-expire. Photos stay until removed.
