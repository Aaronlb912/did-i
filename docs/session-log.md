# Session log

## 2026-09-18 session 1

What runs: http://127.0.0.1:48741/

What landed: Vite React on 48741. Hayes Street sample. One
question on the face. DID and skip. Hang a daily lamp. Miss
on a blank question. Quiet remove with undo. JSON download /
load. Demo persist. Hall CSS, not a clerk desk.

## 2026-09-18 letters A-M

What runs: http://127.0.0.1:48741/

What landed: cadence hangs and misses, askAfter waiting lamps,
catch-up last time, lamp detail (edit / duplicate / archive /
strip), hall-on and empty, pips and quiet mode, keyboard,
slot groups, print slip, motion, hash site (door, name, read,
tonight, into), kitchen copy, old JSON `inkNote`.

Next session: PWA, Capacitor, or ship only if he asks.

## 2026-09-18 PWA

What runs: http://127.0.0.1:48741/

What landed: vite-plugin-pwa, manifest, icons, service
worker, offline precache, IndexedDB copy for the worker,
Ask at lamp time, page timeouts at askAfter, periodic sync
when the browser allows it. iOS pings stay weak.

Next session: Capacitor or ship only if he asks.

## 2026-09-18 hall is the app

What runs: http://127.0.0.1:48741/

What landed: `#/` is the hall. First visit writes empty My
hall. No session gate. Door / Name / How / Into stay under
`#/door` and friends. Tray has Start empty. Hayes Street is
a sample, not the starting board.

Next session: Capacitor from did-i-phone-prompt.md only if
he asks.

## 2026-09-18 phone hall

What runs: http://127.0.0.1:48741/

What landed: Capacitor 8, app id `com.aaronbryant.didi`,
Android project, dark splash, amber jewel icon, safe area,
thumb DID at 390. Local notification schedule, haptics,
Share JSON on native, `?face=` from a ping. Hall heat,
filament, night sit, Click on DID (off by default). iOS
needs a Mac. APK needs JDK 17 and Android SDK, then
`npm run cap:apk`.

Next session: live with the hall, or APK once Java and the
SDK are on this machine.

## 2026-09-18 look pass

What runs: http://127.0.0.1:48741/

What landed: the hall is the board. Big brass jewels,
switch-plate DID rocker, skip as tape, hall-on is lights,
last night is dark holes, Hang/Read/Door/Tray sit in a
latch. No cream essay on all-clear.

## 2026-09-18 every page

What runs: http://127.0.0.1:48741/

What landed: hang and lamp as plates, wait and last-night
plates, welcome carousel, lamps, find, feed, stats, week
grid, streaks, me/fuse door, ping plate, bottom nav Hall /
Lamps / Feed / Stats / Me. Latch still Hang/Read/Door/Tray.

## 2026-09-18 new look, real APK

What runs: http://127.0.0.1:48741/

What landed: the design was rebuilt from scratch. Dark slate
canvas, one lime accent, big grotesque headlines with mono
labels, hairline cards, chip row, a segmented progress meter
for tonight, floating three-key nav, undo as a toast. No
brass, no screws, no plate metaphor.

Real fixes: a new question no longer shows up as missed
yesterday, an empty history strip is hidden, waiting and
all-done states are real cards instead of one dim line,
times read 8:00 PM and Today 3:58 PM, delete asks first and
says how many answers go with it, the Board page is grouped
with guards on the two actions that wipe the board, the week
grid shows day numbers and marks today, and Time of day now
orders tonight's row.

Debug APK built: `android/app/build/outputs/apk/debug/app-debug.apk`
(4.1 MB). Needed JDK 21, not 17, and two duplicate Android
resources had to go (`drawable/splash.xml`,
`values/ic_launcher_background.xml`).

## 2026-09-18 simpler bottom

What runs: http://127.0.0.1:48741/

What landed: one bottom bar, three keys. Tonight, Lamps,
Board. Latch gone. Feed/stats/streaks sit under Board with
plain names. Temurin JDK 17 and Android SDK 36 are on this
machine. `npm run cap:apk` can run next.

## 2026-09-18 home, enter, settings

What runs: http://127.0.0.1:48741/

What landed: `#/` is the home screen (who you are, tonight
status, list, one tap into the plate). `#/tonight` is still
the DID tap. `#/enter` puts a name on this phone. No email.
Optional 4-8 digit lock stays in this browser only. Settings
is `#/me` with your name, board name, when the day folds,
reminders, copy, lock, about, and leave. `#/about` says the
board never leaves the phone. Bottom keys: Home, Questions,
Settings.

## 2026-09-18 boards tab, settings cog

What runs: http://127.0.0.1:48741/

What landed: bottom keys are Home, Questions, Boards.
Boards is a sideways scroll of every board on this phone
plus Add a board. Settings left that tab. The cog in the
top right opens `#/settings`.

## 2026-09-19 home not empty

What runs: http://127.0.0.1:48741/

What landed: empty boards offer usual questions (pills, door,
keys, bins, charge, water). Home shows last time, latest
taps, a seven-night row, and a note on the board. Add a
question starts from those same usual ones.

## 2026-09-19 missing pages

What runs: http://127.0.0.1:48741/

What landed: Help, What to ask, and Coming up. Home lists
the rest of the app. Reminders shows what is still waiting
tonight. Door and How match the current pages.

## 2026-09-19 android emulator

What runs: emulator AVD `did-i`, app `com.aaronbryant.didi`

What landed: Android Emulator 37 and the API 36 Google APIs
image are on this machine. AVD `did-i` exists. Fresh debug
APK installed and opened on the emulator.

## 2026-09-19 daily loop

What runs: http://127.0.0.1:48741/

What landed: first-download path is Welcome, Enter, First
night, Tonight. Opening the board stamps a night. Heat
(0-5) sits on Home and on hall-on. Marks page lists the
closed pips, including showed-up, heat, and come-back.
No XP, no shop.

## 2026-09-19 daily loop next

What runs: http://127.0.0.1:48741/

What landed: after the hall is on, Home names the heat and
what tomorrow will ask. Welcome goes to First night when
the board is still empty.

## 2026-09-19 walkthrough

What runs: http://127.0.0.1:48741/

What landed: a new lamp no longer shows holes for nights
before it was added.

## 2026-09-19 plain copy

What runs: http://127.0.0.1:48741/

What landed: hall and hang are out of the screens. Home is
tonight, heat, last time, and the week. Help is short.

## 2026-09-19 one job

What runs: http://127.0.0.1:48741/

What landed: hall and hang stay out of copy. Add is `#/add`.
Home is tonight, leftover, and heat if it is on. Add form
is question plus how often. More options stays closed.

## 2026-09-19 heat on home

What runs: http://127.0.0.1:48741/

What landed: Home leads with heat, last marks, and the
next mark to hunt. One left says heat goes up. Tonight
done names tomorrow.

## 2026-09-19 shop

What runs: http://127.0.0.1:48741/

What landed: DID pays coins. Shop sells gems and cheers.
A short burst on DID. No real money.

## 2026-09-19 purse split

What runs: http://127.0.0.1:48741/

What landed: gems are not for sale. They come from a
finished night. New questions do not pay coins the day
you add them. Two paid taps a night.

## 2026-09-19 looks and streak

What runs: http://127.0.0.1:48741/

What landed: coins buy board looks. A third board costs
24 coins. Screens say streak, not heat.

## 2026-09-19 test boards

What runs: http://127.0.0.1:48741/

What landed: Settings can add Practice night and Shop try
without wiping the current board. Hayes sample now has
coins, gems, and last nights already done.

## 2026-09-19 board stack

What runs: http://127.0.0.1:48741/

What landed: Boards is a vertical list. Tap one to open it.

## 2026-09-19 theme and i18n

What runs: http://127.0.0.1:48741/

What landed: Settings can set Dark, Light, or Phone. English
and Spanish live in `src/locales`. Prefs stay in
`did-i-prefs`. Future copy goes through `t()`.

## 2026-09-19 icons and collaborator copy

What runs: http://127.0.0.1:48741/

What landed: Lime question-mark icons on the browser and
the Android launcher. Capacitor web assets synced. GitHub
is the copy for a collaborator. Extra tags stay free. Nav
is Home and Questions.

## 2026-09-20 native rebuild

What runs: `npm run expo` (Expo Go) and http://127.0.0.1:48741/
(web).

What landed: Full React Native shell in `native/`. Tonight,
questions, shop, settings, legal, account, people, and the
rest route through `ScreenRouter`. Shared night logic in
`useTonightStack.js`. Metro shims for hash, native feel,
and push. Android export bundles (1559 modules). Web app
unchanged; Capacitor APK still ships the web build.

## 2026-09-20 native parity + doc cleanup

What runs: `npm run expo` and http://127.0.0.1:48741/

What landed: Native at web shell parity (social, settings, account,
search, lamp detail, FamilyTonight, offline, clipboard, pings, cheer
burst). IAP framework in repo (`expo-iap`, `gem-iap`). Docs trimmed so
`docs/not-yet.md` only lists account/ops work (mail, push on a real
phone, store products + secrets for gems). Stripe references removed
from ship docs and legal copy.

## 2026-09-20 custom SMTP

What runs: same as above.

What landed: `scripts/setup-smtp.mjs` and `npm run smtp:setup`. Pushed
Resend SMTP (`support@did-i.app`) to Supabase project `lsvvxslgizihbktqoybt`.
`external_email_enabled` is true.

Next session: send yourself a code and check the inbox, then `npx expo
prebuild` and a phone.



