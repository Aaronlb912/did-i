# What Did I is missing

A review of the app as it stands, not a wish list. When one gets built,
delete it from here.

Last worked through 2026-10-02.

## Card frames

- **Needs device testing:** frame on the Home done card and the swipe stack (top card moves, cards behind stay still), nothing clipped and the week dots and friends pill clear of the frame, animation stops off screen, in the background, after a while without a touch and with Less motion; the Collection tiles at 390px wide; a coin buy and a gem buy while signed in.
- **Needs device testing (friends, gifts, low power):** a friend's page shows their card in their look and frame (and a plain card with no frame); a gem frame sent as a gift arrives, Wear it puts it on, a second copy goes back; frames hold still in low power mode (iPhone Low Power Mode, Android Battery Saver) and move again when it is off. Low power needs the next native build (bump to 1.3.1; expo-battery); a binary without it never pauses for it and does not crash.
- **Needs device testing (pass 3a fixes):** Questions > Select > Move to a folder and its undo; the Home card and friends row move up while a toast shows (with and without the Did / Nope row); the done count changes with the left count during the cheer; the note sheet stays above the keyboard, and Remove note with undo; German shows 09:00 with the clock on Phone; the year view starts at the first month with answers.
- **Supabase not applied yet for frame_on and frame gifts.** friends-week.sql and gifts.sql changed; run npm run db:apply:all and the frames-social test before the OTA. Until then the phone's look and frame write fails quietly and friends see no card.
- **Web shows a gifted frame by name only.** No frame art on the web, and View in collection there has no frames tab.
- **Birthday frame waits for the launch date.** It is Did I's birthday, free for a week each year from the first anniversary. Set `APP_LAUNCH` in `src/lib/frames.js` to the App Store release day (YYYY-MM-DD) and ship an OTA; until then it stays hidden.
- **Web app has no frames.** The website's Shop and Collection do not list them; only the phone does.
- **Frames have no wishlist and no "Remind me".** Looks, cheers, buddies and accessories can be wishlisted; frame sheets cannot (the wish list in `purse.js` only knows those four kinds). A seasonal frame that is not out yet says when it is back, with no reminder.

## Friend notes

- **Phone only.** The website has no friend page, so notes are not shown or editable there. They are in `friend_notes` and would show if it gets one.
- **Needs device testing:** add, edit, clear (Save with an empty box) on a friend page, offline save shows the miss line, the note is back on a second phone.

## Referral rewards (branch `feat/referral-rewards`)

- **SQL not applied.** `supabase/referral-rewards.sql` (claim_invites lists the Hive buddy at 15 friends and the Bloom frame at 20) and the `bloom` id in `supabase/friends-week.sql`. Run `npm run db:apply:all`, then `node scripts/test-sql.mjs supabase/tests/referral-rewards.test.sql`. Until then nobody gets the two rewards and wearing Bloom fails the frame_on write quietly.
- **Needs device testing:** the Refer ladder at 390px (dark, light, a gem look), the Hive chip sway and the sheets, Bloom on the top card only, still with Less motion and in tiles; Hive on the Android widget and wearing a hat between its antennae. The iPhone widget draws Hive from the next store build.
- **Web Refer page draws Bloom from its own SVG.** The web has no frame renderer, so the ladder there uses a small copy of the art.

## Reminder answers and streak freezes (branch `feat/answer-freeze-r10`)

- **Reminder buttons when the app is fully closed need a native build.** With `opensAppToForeground: false` the answer is saved only when JS gets the response: app open or in the background (both platforms), and on iOS when the system wakes the app. A phone that killed the app may drop the tap. A sure path needs `expo-task-manager` plus `Notifications.registerTaskAsync` (a headless task that runs `applyWidgetTapOnce`), which is a new native module, so a new build on both platforms. Test on the device before shipping the OTA: if taps are lost from a killed app, set `opensAppToForeground` back to true in `src/lib/notify-answer.js`.
- **No tap feedback on the notification itself.** The reminder is cleared; a refused answer (night over, already answered) shows a toast the next time the app is open.
- **Freezes are only on the phone screens.** The web Home dots, calendar and streaks page still show a covered night as missed (the streak number itself agrees, since it is shared night math).
- **First streak walk is slower on long histories.** Freezes walk every night from the first one; about 85 ms on a laptop for two years of 8 daily questions, once per day per launch. Later walks reuse the settled nights.
- **Freezes are not on the server.** The server stores the streak the app sends (`profiles.streak`), so friends see the frozen streak too. No coins are paid for freezes and per-question streaks ignore them.

## Settings and social round 4 (branch `polish/settings-social-round4`)

- **SQL not applied.** `supabase/family-summary.sql` (profiles.family_hour) and the new `supabase/device-names.sql` (devices.model, devices.name). Until applied, the family hour picker shows a save miss and phone rename fails; the app falls back to the old device columns. Test: `supabase/tests/settings-social.test.sql`.
- **iOS phones show "iPhone · iOS 18.2", not the exact model.** No expo-device; Platform constants have no hardware model on iOS.
- **The cheer line opens the friend page, not a one-tap cheer.** On purpose (no auto-send), but it is one more tap.
- **New day start is fixed at midnight.** Shown as plain info; a picker for dayFoldHour would need night-math and server changes.

## Settings polish (branch `polish/craft`)

- **Drop push needs SQL applied.** `supabase/shop-drops.sql` (after push.sql) and the new `drop_live` text in push.sql are not applied yet. New drop dates in `src/lib/purse.js` need a row in `shop_drop_days` too; `npm test` fails until they match.
- **Drop switch does not ask for notification permission.** Turning on "Tell me when a drop goes live" only saves the pref; a phone that never allowed notifications gets nothing.
- **Rating is a store link, not the in-app sheet (for now, owner call 2026-10-07).** The card shows once after the 7th cleared night and opens the store (the App Store opens on the write-a-review sheet). Once the app is public on both stores, swap it for the real in-app prompt: add `expo-store-review` (native, needs a build) and call `requestReview()` where RateCard opens the link, keeping the link as the fallback when the prompt is not available.
- **Accessibility is code-level only.** Labels and roles added, inkDim raised to 4.5:1 on panel in every look. Not tried with TalkBack, VoiceOver, or 200% font on a phone. Modal backdrops still have no label.

## App PIN

- **Forgot PIN.** Signed in: a code to the account email removes the PIN. Signed out: the only way past is to erase what is on the device.
- **The sign-in code path is not tried end to end** (needs a real inbox); the signed-out erase path is.

## Save a copy

- **Shares text, not a file.** Save a copy uses the share sheet with the JSON as text; Drive or Files save it as .txt, which Load a copy now accepts. A real .json file needs expo-file-system + expo-sharing (a native build).

## Did you links and sends from Did I (branch `did-you-links`)

- **Links**: "Share as a link" on the send sheet makes did-i.app/d/CODE (20 a day). Opening it on a phone needs the next native build for the Android `/d/` App Link and the updated AASA on the site; didi://d/CODE and the page's Open button work over the air. Not tried on a phone yet.
- **No way to end a link in the app.** `did_you_links.ended` is set by hand in SQL. People cannot see or delete links they made.
- **No report on a link.** A link with a bad question can be passed around; the add sheet only offers Add or No thanks.
- **Sends from Did I** (`scripts/send-from-did-i.mjs`, max 4 in 30 days) reach signed-in accounts only. Inbox ones show for 30 days. `--tonight` ones are added on the next sync for that night (or the night after, by date), while the app or web app is open.
- **The site page shows no avatar** yet, only the name.
- **Did we links** (did-i.app/d/ with a 12 letter code, `supabase/share-links.sql`) last 7 days, 10 new a day per person, and can be turned off from the Did we page. Opening one offers "Join and add {name}", "Just join" or "No thanks"; a Did you link now offers "Keep it and add {name}" too. Friends are only made on that tap. Not tried on a phone yet; the sheet needs the OTA.
- **Link previews** come from `api/link-preview.js` (a Vercel function on /d/CODE). English only, text only (no sender photo as the preview image yet).
- **Did we links cannot be reported** from the join sheet, the same gap as Did you links.

## Profile pictures (2026-10-02)

- Picking a photo needs the 1.3.0 build (expo-image-picker and
  expo-image-manipulator). Older builds show "comes with the next update".
- The website shows initials, not photos, and cannot set one.
- Report photo blocks the person and files a report; nobody reviews the
  `reports` table yet, and there is no way to take a photo down for someone.
- Phones already listed twice under Account stay until they age out (30
  days) or "Remove the other phones" is used; new installs no longer add rows.

## 1.3.0 build pieces (2026-10-02)

None of these has run on a real phone yet. They need the 1.3.0 build.

- **Camera photo** for your profile (image picker, front camera).
- **QR codes**: your friend code is on Connect ("Show my QR code"), and the family code is in the family's code box. Scan from Connect, the add-friend box, or the app icon. The codes are did-i.app/f/ID and /j/CODE links, and the page (src/site/ScanLanding.jsx) has an Open in Did I button plus the store buttons. The code survives install (Play referrer, copied link on iPhone) and sign-in (`PendingScanHost`). Universal links / App Links: public/.well-known holds both files. Associated Domains is on the App ID (2026-10-02), the App Store profile was remade, and the repo variable DIDI_UNIVERSAL_LINKS=1 turns the entitlement on in the iOS build. Not checked on a phone yet.
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

- **Gem items bought while signed out stay on that phone only.** Since gem
  items moved to the server (`buy_with_gems`, `gem_cosmetics` in `gifts.sql`),
  signing in replaces the phone's gem items with the account's list, the same
  way signing in already replaced signed-out gems. Nobody signed in has lost
  anything: existing shelves were copied to the server once.
- **TestFlight gem buys credit real gems** (the receipt check accepts Apple's
  sandbox so App Review can buy). Fine for testers; revisit if it gets abused.

## Found in the 2026-09-26 people pass

- **Family questions do not reach Tonight.** `FamilyTonight` sat behind the
  public-list flag (off in every build) and went with it on 2026-09-26, so
  a question a parent puts in the family folder only shows on the family
  page. The family page still says "It shows up on their tonight." Decide:
  bring a family block back to Tonight, or change that line. Family
  did yous (sends) are not affected; they now land on tonight.
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
- **Errors on Friends sit at the bottom.** A failed save on the auto-add
  switch, a cheer, or a gift shows under the list, which can be off screen
  on a long list.

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
- **Shake to undo** is off (`SHAKE_ON = false` in `native/hooks/useShakeUndo.js`), so it no longer asks for motion permission. Tap to undo stays. `NSMotionUsageDescription` and expo-sensors are still in the native build; drop them at the next native build if shake stays off.
- **UX clarity pass (2026-10-08) needs a phone check:** Later on a question not open yet, Not yet / Missed wording on the calendar, stats and Did we, the Name and note page with no sign-out row, the one-line swipe hint on the first-question screen, and the folder vs topic line on Edit question.
- **Did I tonight (the public list)** was removed from the app code on
  2026-09-26. If it comes back it will be its own product. The database
  still has its tables and functions (`supabase/tonight.sql`,
  `supabase/dit-board.sql`); dropping them needs a migration that keeps
  `delete_me()`, which lives in `tonight.sql`.

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
