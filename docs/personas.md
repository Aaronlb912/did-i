# Did I personas

Who uses, builds and promotes Did I. Use them to walk the phone app from
every side before calling a change done. Internal only: never put these
names in posts, videos or sample data.

Updated: 2026-10-25

## How to use

- Pick the personas a change touches. Most UI changes touch at least one
  everyday user, Maya (screen reader) and Leo (small Android).
- Walk the flow as each one on the dev build. Write down where they stop.
- Each persona has a **test path** (what to drive in the app) and **red
  flags** (what makes them quit or file a bug).
- Use a test account, not the emulator's real account, for anything that
  answers, buys or sends (see `docs/phone-pass.md`).
- Builders and reviewers are senior. They judge the work, not just use it.

---

## Everyday users

### 1. Jess, forgets the small stuff
- 29, ADHD, iPhone. Uses Did I for "did I take my vitamins", "did I text
  mom back". Opens the app for 20 seconds, once a day.
- Wants: one question at a time, fast Did, a reminder that actually fires.
- Test path: add 3 questions with ask times, wait for the reminder, swipe
  through Today, answer one Not yet, tap Look again, clear it.
- Red flags: more than one tap to answer, a reminder that never comes,
  a Not yet that vanishes, guilt-trip copy.

### 2. Marcus, the streak keeper
- 35, Android, 120 days in a row on "did I stretch". Checks So far daily.
- Wants: streaks that never break by mistake, the calendar, freezes.
- Test path: answer late at night, then just after midnight, then the next
  morning in the grace window. Change time zone. Check So far and the
  streak line.
- Red flags: a streak reset he did not cause, the wrong day marked, a
  freeze spent without asking.

### 3. Priya, widget only
- 41, never opens the app if she can help it. Answers from the home screen
  widget and her Apple Watch.
- Test path: place the widget, answer Did and Not yet from it, stop a
  question in the app, check the widget and watch update. Same on Android.
- Red flags: widget showing a stopped or answered question, widget and app
  disagreeing, a tap that does nothing.

### 4. Dana, the parent running a family
- 44, two teens (both 13+) and a partner in one family. Sets shared
  questions like "did I feed the dog".
- Test path: make a family, invite by link, add a family question, answer
  as each member, cheer someone, have one member leave.
- Red flags: a teen seeing something private, a leave that keeps old links
  working, family rows lost on Tonight.

### 5. Theo, the friend who nudges
- 26, uses Did you and Did we with two friends. Sends cheers.
- Test path: send a Did you link, open it on a second account, share a
  Did we, cheer, then unfriend and block.
- Red flags: a link that works after 7 days, a blocked person still
  reaching him, a cheer that charges twice.

### 6. Sofia, the shop fan
- 23, buys buddies, looks, frames and cheers with coins and gems. Waits
  for holiday drops.
- Test path: open the shop, check the drop banner and Coming, preview a
  frame, buy with coins, claim a free holiday item, buy a gem pack (test
  build only).
- Red flags: coins taken twice or not at all, a free item that asks for
  coins, a preview that is blank, a buy with no confirm sheet.

### 7. Kenji, reads it in Japanese
- 38, phone set to Japanese. Represents all 8 non-English locales.
- Test path: switch the phone language, walk Today, Add, the shop and
  the widget.
- Red flags: English left in, text cut off, wrong script, dates in the
  wrong order.

### 8. Leo, small cheap Android
- 19, 5-inch Android Go phone on slow data, Android beta tester.
- Test path: every changed screen at small size, slow network, airplane
  mode, app killed and reopened.
- Red flags: buttons off screen, a spinner forever, an answer lost
  offline, a crash on cold start.

### 9. Maya, screen reader and large text
- Low vision, VoiceOver on iPhone, largest text size, reduce motion on.
- Test path: add a question, answer it, open the menu and shop with
  VoiceOver only.
- Red flags: unlabeled buttons, swipe-only actions with no button, motion
  that ignores reduce motion, text that clips.

### 10. Ruth, new and unsure
- 67, first habit app. Got the link from her daughter.
- Test path: install, first run, the tour, add a first question, sign in
  later.
- Red flags: jargon (folder, streak) with no hint, a screen with no next
  step, losing questions when she signs in.

## Staff and trust

### 11. Lena, senior trust and safety lead
- Checks: report paths the stores require, block, what a blocked or
  removed person can still see, family and friend data across accounts.
- Red flags: one account reading another's answers, links that never
  expire. Reports stay minimal: no moderation tools (store rules only).

### 12. Omar, support lead
- Answers "my streak is gone", "I lost my coins", "the widget is stuck".
- Checks: can he explain it from what the app shows, is there a way back
  (undo, restore purchases, sign back in).
- Red flags: errors that say nothing, states with no next step, fixes that
  need a developer.

## Builders (senior)

### 13. Hana, staff product designer
- Owns the look: `--di-*` tokens, Dark / Light / Phone themes, shop looks.
- Checks: hierarchy, empty states, pill dots not checks, full-row taps
  (no tiny links), copy vocabulary (Did, Not yet, day, folder).
- Red flags: new hardcoded colors, tiny links, "nope", "tag", "night" in copy.

### 14. Sam, senior React Native engineer
- Checks: Reanimated on the UI thread, list performance, native-stack
  back, OTA-safe changes vs native rebuilds, `fonts.uiSemi` not
  `fonts.ui` + weight.
- Red flags: JS-thread jank on swipe, a change that needs a native build
  shipped as OTA.

### 15. Tomás, senior Supabase engineer
- Checks: RLS on every table, `(select auth.uid())`, indexed FKs, caps on
  repeatable writes, SQL applied with `db:apply:all`, `db:audit` clean.
- Red flags: an old SQL file applied alone, N+1 over friends or family.

### 16. Grace, senior security engineer
- Checks: IAP receipts checked on the server, gem and coin caps, link
  tokens, sign in with Apple and Google, secrets out of the bundle.
- Red flags: trusting the client for coins or gems, links that leak ids.

### 17. Ben, senior QA engineer
- Breaks it: double taps, undo then redo, two phones on one account,
  midnight and grace edges, time zone change, widget tap while the app is
  closed.
- Red flags: lost answers, a streak off by one, the major-bug classes:
  lost answers or streak, money, cross-account, crash or stuck, missed
  reminder.

### 18. Chris, senior product manager
- Checks: solves the asked problem, way in and way back, `docs/not-yet.md`
  and `docs/launch-checklist.md` current.
- Red flags: flows dropped in a redesign, half-built features with no note.

## Promoters (senior)

### 19. Jay, social lead
- Runs Instagram and Reels. Needs screens worth showing.
- Checks: does it look good in a recording, the app reveal end card.
- Red flags: real names or accounts in shots, door, stove or meds
  questions, Apple Watch-only framing.

### 20. Elena, App Store and SEO lead
- Owns store pages, keywords and did-i.app guides.
- Checks: App Store text with no Android mention, screenshots current,
  guides match what the app does.
- Red flags: claims the app does not back up, review rejections repeated.

## Business

### 21. Fatima, payments lead
- Checks: gem packs match the store prices, restore purchases, refunds,
  gem cap at 9999, test vs live.
- Red flags: a buy with no owner, gems lost at the cap.

### 22. Daniel, legal and privacy
- Checks: privacy and terms pages, 13+ age line, account delete removes
  data, consent declined by default.
- Red flags: data shared with friends without notice, delete that leaves
  answers behind.

---

## Quick review checklist

| Question | Who asks |
| --- | --- |
| Can someone new tell what to do next? | Ruth, Jess |
| One tap to answer, works offline? | Jess, Leo |
| Streak and days right across midnight and grace? | Marcus, Ben |
| Widget and watch match the app? | Priya |
| Private things stay private across accounts? | Dana, Lena |
| Coins and gems right, buy confirmed? | Sofia, Fatima |
| Every locale, no English left? | Kenji |
| VoiceOver, large text, reduce motion? | Maya |
| Copy plain, right words, no em dashes? | Hana, Jay |
