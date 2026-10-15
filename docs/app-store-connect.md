# App Store Connect — Did I???

App **Did I???** (name unchanged). Bundle `com.aaronbryant.didi`, SKU `did-i`,
Connect app Apple ID `6814688066`.

## Gem IAPs (consumable)

Create each in **Monetization → In-App Purchases**. Product IDs must match `src/lib/gem-packs.js`.

| Reference | Product ID | US price (tier) | Display name |
|-----------|------------|-----------------|--------------|
| 1 gem | `com.aaronbryant.didi.gems_1` | $0.99 | 1 gem |
| 3 gems | `com.aaronbryant.didi.gems_3` | $2.99 | 3 gems |
| 5 gems | `com.aaronbryant.didi.gems_5` | $4.99 | 5 gems |
| 10 gems | `com.aaronbryant.didi.gems_10` | $6.99 | 10 gems |
| 25 gems | `com.aaronbryant.didi.gems_25` | $14.99 | 25 gems |
| 50 gems | `com.aaronbryant.didi.gems_50` | $29.99 | 50 gems |

Per product: **Availability** → all countries; **Price** → tier above; **English (U.S.)** localization with description e.g. “N gems for cheers and shop looks in Did I.”

First IAP ships with the **1.0** app version submission. IAP review screenshot can be a Shop → Gems screen from TestFlight.

## iOS 1.0 listing (paste into Connect)

| Field | Value |
|-------|--------|
| Subtitle | Habits that come to you |
| Promotional text | From `web.landing.lead` in `src/locales/en.js` (147 chars). |
| Support URL | `https://did-i.app/download` |
| Privacy URL | `https://did-i.app/privacy` |
| Copyright | © 2026 Aaron Bryant |
| Primary category | Lifestyle |
| Keywords | habits,chores,reminders,streak,checklist,tonight,pills,door,sync,family,friends |

Description: lead with `about.p1`, then landing bullets `web.landing.b1`–`b4` and `about.p4` for sync.

## 1.2 listing text (App Store and Google Play)

Paste when 1.2 (Did we) ships. Same text for both stores except the widget
line below. Keep it plain; no em dashes. Do not paste before 1.2 is live: it
describes Did we. The App Store text must never name Android or Google Play:
1.3.4 was rejected on 2026-10-15 under 2.3.10 (Accurate Metadata) for "Widgets
on iPhone and Android".

**Promotional text (App Store, 170 max):**
For people who forget to open habit trackers. Did I brings the question to you: a widget, your watch, or a reminder at the time you set. Swipe Did or Not yet.

**Short description (Google Play, 80 max):**
For people who forget to open habit trackers. One question, one swipe.

**Keywords (App Store, 100 max):**
habits,chores,reminders,streak,checklist,pills,door,family,friends,shared,together,widget,gifts

**Description:**

Did I take my meds? Did I text them back? Did I drink enough water?

For people who forget to open habit trackers.

Did I brings the question to you. It shows on your home screen widget, on your watch, or as a reminder at the time you set. You never have to remember to open an app. Swipe right for Did. Swipe left for Not yet.

Ask at any time of day, or check them all at the end of the day.

ONE QUESTION AT A TIME
- One question, not a whole to-do list.
- Home screen widgets and an Apple Watch app. (Google Play: "Home screen widgets and a Wear OS app.")
- Home shows what's still open today.
- Streaks stay honest: Not yet means not yet.

YOUR QUESTIONS
- Every day, some days, once, by a date, or every few days.
- A reminder at the time you pick, morning, noon or night.
- Folders keep a long list tidy.

FRIENDS AND FAMILY
- Did you: ask a friend "Did you call Grandma back?", once or every day. It waits in their inbox until they keep it.
- Did we: answer a question together. "Did we walk the dog?" Pick friends or family, pick when it counts (everyone, anyone, most, or take turns), and keep a shared streak.
- Share a family: one folder everyone can add to.
- Cheer each other on when someone finishes.

MAKE IT YOURS
- Earn coins every day and from shared streaks. Get gems each week.
- Looks, cheers and buddies in the shop.
- Send a look, cheer or buddy to a friend or family member as a gift, with a short note.

SAFE AND PRIVATE
- Add friends by their 12-digit friend ID or an invite link. Nobody can browse for you.
- Report and block anyone. Blocking takes you off anything you share.
- Hide what notifications say, so questions stay off your lock screen.
- Works without an account. Sign in to sync across phones.

**What's new in 1.2:**
Did we: questions you answer together with friends or family, with a shared streak. One Add screen: tap "Did I" to switch to Did we or Did you. A Did you can repeat every night. Tap the faces on a Did we to see everyone and their buddy. Send gifts: buy a look, cheer or buddy for a friend or family member, with a short note. They see it the next time they open the app. New privacy choices: hide what notifications say, and report and block.

**What's new in 1.3.1:**
Card frames: dress up your card with a frame. Some are free, some cost coins or gems, some you earn with a streak, and some come with the seasons. Bring friends to Did I and earn Hive, a new bee buddy, at 15 friends and the Bloom frame at 20. Swipe left now says Not yet, so you can still come back and say Did before the night ends. A wishlist in the Shop and Collection keeps track of what you want next. Undo after a swipe is easier to catch, deleted questions stay deleted, and the Shop is smoother. Frames rest in low power mode, and the launch screen matches your light or dark setting.

**App Privacy labels for 1.3.1:** no new data types. The look and card
frame you wear are shown to friends and family (Other User Content, already
declared).

**App Privacy labels for 1.2:** no new data types. A buddy shown to people
on a shared card is Other User Content (already declared). Reports stay under
Customer Support. A gift note is also Other User Content.

**Google Play Data safety for 1.2:** same types; names, buddies and answers
shown on shared cards are data shared with other users, as before. A gift and its note go to the person it is for, the same way.

## App Privacy (nutrition labels)

Privacy policy URL: `https://did-i.app/privacy` (also on iOS 1.0 listing).

**Collect data:** yes (when the person signs in or uses cloud features).

**Data types to declare** (align with `legal.privacy.*` in `src/locales/en.js`):

| Connect type | Why |
|--------------|-----|
| Email Address | Sign-in |
| Name | Display name on profile |
| Other User Content | Questions, answers, shelf, public tonight lines |
| User ID | Account / handle |
| Device ID | Device row + push token |
| Purchase History | Gem pack purchases (store receipt metadata) |
| Customer Support | Optional reports / contact |

For each type after selection: purposes **App Functionality** and **Account Management** (add **Customer Support** for reports); **linked to identity** yes; **used for tracking** no.

Local-only use (no account) does not send data to you; the label still covers signed-in use.

## Search and screenshots (written 2026-10-07)

Tagline: "For people who forget to open habit trackers." (changed 2026-10-14). Positioning: Did I brings the question to you (widget, watch, a reminder at the time you set), one question at a time, swipe Did or Not yet. Questions come at any time of day, or all at the end of the day. Never say "one question a night". Never mention ADHD or autism. Lead with the
"did I?" feeling, not with habits. Category: Productivity primary, Lifestyle
secondary (Play: Productivity). Apple indexes the name, subtitle and keywords
together, so no word below repeats another field. `adhd` sits in keywords only, which users never see.

Live in App Store Connect: version **1.3.4**, submitted 2026-10-15, with the
fields below. Its description is the one in "1.2 listing text" above, with
this as the last line: "No ads. No tracking. Delete your account from the app
at any time."

| Field | Value | Length |
|-------|-------|--------|
| Subtitle (30) | Habits that come to you | 23 |
| Keywords (100) | pills,medication,reminder,routine,checklist,streak,widget,chores,forgetful,family,watch,adhd | 92 |
| Play short description (80) | For people who forget to open habit trackers. One question, one swipe. | 70 |
| Promotional text (170) | For people who forget to open habit trackers. Did I brings the question to you: a widget, your watch, or a reminder at the time you set. Swipe Did or Not yet. | 158 |

Screenshot captions, in order. Big line on top, small line under it, then the screen.

| # | Big line | Small line | Screen |
|---|----------|------------|--------|
| 1 | For people who forget to open habit trackers. | The question comes to you. | Home with a question card |
| 2 | Swipe right for Did. | Left for Not yet. That's the whole app. | The card mid-swipe with the Did bar |
| 3 | No app to remember. | Widgets and your watch ask for you. | Home screen with the widgets |
| 4 | Meds, water, texting back. | Ask yourself anything. | Questions list |
| 5 | Streaks that stay honest. | Every day on one calendar. | Streak and calendar |
| 6 | Did we feed the dog? | Share questions with the people you live with. | Did we or family |
| 7 | Make it yours. | Frames, looks and a little buddy. | Card wearing Galaxy or Neon Heart |

## After IAPs

1. **App Information** — category Lifestyle, age ratings questionnaire, content rights if prompted.
2. **App Privacy** — types above, publish labels.
3. **iOS 1.0** — fields above, screenshots, build from EAS/Xcode.
4. **App Review** — demo sign-in and notes for reviewers. Reviewer sign-in shows only while the server switch is on (`supabase/reviewer-flag.sql`; flip it with the launch checklist's "App Review switch" step). The switch only hides the UI, with no server gate; the review account's password works through the reviewer form only. Review notes text:

   > Tap Reviewer sign-in at the bottom of the sign-in screen (or press and hold the "Did I???" title for 3 seconds). Use the email and password above.

   Use the same note in Google Play Console → App access.
5. **App-Specific Shared Secret** (App Information → Manage) → Supabase `APPLE_IAP_SHARED_SECRET` for `gem-iap`.

## iOS build (EAS)

**GitHub Actions (preferred from Windows):** signing secrets + **Actions → iOS IPA**
(`docs/native-rebuild.md`). Uploads to TestFlight when API key secrets are set;
does not submit for review.

Run from **PowerShell** with `$env:CI=''` (Cursor sets `CI=true` and freezes credential sync).

**Store build with widgets** (`production`, `EAS_INCLUDE_WIDGETS=1`):

1. `npm run ios:prepare:store` (or `ios:prepare:store:full` for sweep)
2. [Expo credentials](https://expo.dev/accounts/abryant/projects/did-i/credentials) → **com.aaronbryant.didi** → **Provisioning Profile** → **Remove**
3. `npm run ios:build:store:first` (interactive; recreates main profile with App Groups)
4. Later rebuilds: `npm run ios:build:store`
5. **After Finished:** `npm run ios:submit`

App Groups on both bundle IDs: `docs/widgets.md`. Push plist on EAS: `GOOGLE_SERVICES_PLIST` in production env (`docs/push-ios.md`).

**Fallback (no widget):** `npm run ios:build:safe:first` — same as [build 25](https://expo.dev/accounts/abryant/projects/did-i/builds/c6aa9ce2-16b2-404e-bae2-bc2dd3160fd7) if credentials keep failing.

**TestFlight launch crash (no Mac):** You do not need Xcode.

1. **App Store Connect (web):** [TestFlight](https://appstoreconnect.apple.com/apps/6814688066/testflight/ios) → **Crashes** (left sidebar). Pick the build number (e.g. 24). Copy the top frames or screenshot and send them.
2. **On the iPhone:** Settings → **Privacy & Security** → **Analytics & Improvements** → **Analytics Data**. Find rows starting with **DidI** or **didi**. Open the newest, tap **Share**, and email the `.ips` file to yourself.

**Launch crash (TestFlight):** `RCTExceptionsManager` + `ObjCTurboModule` on `com.meta.react.turbomodulemanager.queue` is a **JS fatal** during a native module call (usually `expo-notifications`, often `getDevicePushTokenAsync` when notification permission was already granted but Firebase is not in the binary). Store builds must not fetch a push token at cold start; token sync runs only after the user enables reminders. Ensure `GOOGLE_SERVICES_PLIST` is on EAS production (`docs/push-ios.md`). Rebuild and test the **latest build number**.

`app.json` version is **1.0.0**. EAS `appVersionSource: remote` bumps **build number** on each production build (was at 2 after the failed non-interactive attempt).

## Not done in Connect alone

- Upload iOS build (Mac or EAS; see above).
- Firebase iOS app + APNs key for push (`docs/push.md`).
- Paid Applications agreement + banking in **Business**.
