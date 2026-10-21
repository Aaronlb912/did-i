# Tutorial (draft)

Status: idea. Nothing built.

## Goal
People finish their first week knowing every main feature exists and how to reach it. Today they learn swiping from FirstSwipe and the rest by luck or Help.

## Who sees it and when
- First run: no tutorial up front. Keep the current flow (StarterPicks/FirstPacks, FirstSwipe, ping primer, NameFirstSheet). It already teaches answering.
- Day 1 onward: a "Get started" card on Today, after the day's questions are done (same slot as DoneCard). It never sits above questions still open.
- Replay: a full row in Help ("Show me around") and Settings. Reopens the card with all steps unchecked-for-view but keeps done ticks.
- Recommendation: card on Today plus replay row. Hide it after all steps are done or "Hide for good".

## Format
Options: spotlight steps on real screens, a card deck, or a checklist card.
Recommend the checklist card. Each row says one thing and opens the real screen. A spotlight needs measuring views on two platforms, breaks on every layout change, and fights the Modal menu. A card deck teaches by reading, which nobody does. The checklist uses routes we have, ticks itself from real state, and fits a small Expo team. One light touch: when a row opens a screen, show a one-line hint bar at the top of that screen (dismissable), not a spotlight.

## Steps (in order)
Each: does / copy / done when / skip.

1. Add a question. Opens Add. "Add something you want to remember each day." Done: a question you made exists. Skip: row "Later".
2. Times and reminders. Opens Add on that question. "Pick a time and we remind you." Done: any question has a time and pushes are allowed. Skip: Later.
3. Every so often. Opens Add, schedule tile. "Some things are every few days. Set that here." Done: one question on every so often or some days. Skip: Later.
4. Folders. Opens Questions. "Group questions in a folder." Done: a folder exists. Skip: Later.
5. Answer. Already taught by FirstSwipe; tick from first answer. "Swipe right for Did. Left for Not yet. Or tap the buttons." Done: first answer.
6. Fix it until morning. Hint only. "Missed one? Yesterday stays open until {time}." Done: tap Got it.
7. Not yet list. Opens StillOpen. "Your Not yets wait here. Change one to Did if you get to it." Done: opened once.
8. Days in a row. Opens streak/calendar. "Say Did to all of today and your streak goes up." Gentle mode: "Your days still count." Done: opened once.
9. Recent and Collection. Opens Recent, then marks. "See your past days and what you earned." Done: opened Collection.
10. Widget. Opens the existing widget tip sheet (did-i-widget-tip). "Put today on your home screen." Android: pin button. iPhone: steps, then "I added it". Done: widget reported present, or I added it.
11. Watch (only if paired, Wear OS or Apple Watch app installed). "Answer from your wrist." Done: watch seen syncing. Otherwise row hidden.
12. Add a friend. Opens Friends and family with friend ID and QR. "Share your friend ID or QR. Friends who join with your code earn you gems." Done: one friend or family member.
13. Did you. Opens SendDidYou. "Ask a friend about something. Send it or share a link." Done: one sent or link made.
14. Did we. Opens Add with Did we picked. "Do one together. Pick together, anyone, most, or turns." Mentions amounts and notes in the hint. Done: one Did we made or joined.
15. Cheer. Opens a friend. "Cheer them on." Done: one cheer sent.
16. Shop. Opens shop. "Coins come from your days. Gems buy looks, frames and buddies." Done: opened shop. No buy needed.
17. Settings. Opens Settings. "Pick a theme. Turn on gentle mode or private reminders if you want." Done: opened.

## No friends yet
Steps 12 to 15 group under "With friends". With zero friends, 13 to 15 show "Add a friend first" and one row "Do this later". Do the Did you step with a link: making a link counts, no friend needed. No sample friend: a fake person on real screens leaks into family, cheers, and counts, and invites confusion about who sees what. If we want a demo later, it is a read-only picture in the hint bar.

## Test-safe rule
Tutorial rows only open screens. They never buy, send, answer, or push on their own. Done-checks read real state. Opening the shop costs nothing; no free "try a buy". No pushes sent to test reminders. No answers written by the tutorial, so streaks cannot break. State is local (`did-i-get-started` in first-run.js), no server writes, no write on page load.

## Edge cases
- Existing users after an OTA: pre-tick everything state already proves; show only if 3 or more rows left, once.
- Signed out: social rows say "Sign in to add friends" and open Account.
- Push denied: step 2 done on time alone, hint links to notification settings.
- Gentle mode on: no streak numbers in copy.
- Family child accounts: hide shop and Did you rows if the repo already limits them.
- Reduced motion: no tick animation.
- Locale: all copy via t() in all 9 files.
- Second phone, same account: local state, so it may show again; ticks come from synced state so most are done.

## Build size
1. GetStartedCard on Today + state + done-checks: medium (1 to 2 days).
2. Hint bar on target screens: small.
3. Help and Settings replay rows: small.
4. Copy in 9 locales: small, mostly translation.
5. Phone pass on Android and iOS: half a day.
Pieces 2, 3, 4 can go to parallel builders after 1 lands the keys.

## Open questions
1. Checklist card on Today, or do you want a true spotlight walkthrough?
2. Show it to existing users, or new installs only?
3. Should finishing it pay a few coins? (Needs a server cap.)
4. Any steps to cut? 17 is a lot; could split into "Basics" (1 to 10) and "More" (11 to 17).
5. Watch row: worth it now, or later?
