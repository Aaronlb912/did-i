# Handoff: security pass and 1.3.7 (from the cloud session, 2026-10-17)

For the agent on Aaron's computer. Everything below is on branch
`claude/friendly-turing-1ryjpc` (a few commits on top of master), not merged.
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
| Bug pass: sign-out mid-sync, Did we refresh races, Did/Not yet coin flip, recorded gem buy at the cap, every missed day saved as Not yet (`src/lib/daily.js` missedRows) | `src/lib/{answer-log,cloud-sync,we-nights,did-we,board-ops,purse,board-json,daily}.js`, `supabase/refunds.sql` |
| Version 1.3.7 (native deps added) | `app.json`, `android/app/build.gradle`, `android/wear/build.gradle`, `strings.xml`, `targets/*/Info.plist` |

Checked in the cloud: `npm test` 343/343, lint, typecheck, `expo export`
Android, `vite build`, and every SQL test on a local Postgres 16 stand-in
(readthrough-12 and social-live fail there on master too: stand-in gaps).
Nothing has run on a phone or the live database.

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
     `play-voided` is deployed, which is harmless).
   - Check: the query above now lists `avatar_url`, `look_on`, `frame_on`;
     on Aaron's phone the Friends list shows pictures again and a friend's
     page shows their look and frame. Then `npm run db:audit` (no rows) and
     `git worktree remove ..\did-i-fix --force`.
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

8. **Tidy up.** Move what landed out of docs/not-yet.md ("Security read
   2026-10-17" section), add anything Aaron finds to docs/lessons.md, and
   delete this file.

## Decided, do not redo

- No cap on how many questions someone can have.
- Night coins and the weekly gem stay as they are (an answer check would
  underpay; coins are asked for before the answer syncs). Milestone cap stays.
- `npm audit fix` without overrides is off the table: it bumps expo-widgets
  past `patches/expo-widgets+57.0.20.patch` and adds a second @expo/ui.
