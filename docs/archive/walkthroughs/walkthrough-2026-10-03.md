# New user walkthrough, 2026-10-03

Fresh install on a clean Android emulator, "Use on this phone only", no account.
Went through first night, answering, adding a question, Questions, a question's
page, Friends (signed out), Shop, and Settings.

## Trips you up (fix first)

1. **No way to answer except swiping.** On Tonight the card has no Did / Nope
   buttons and no swipe hint. Tapping the card does nothing. The only hint was
   one line on the first-night screen. A new user who skims that is stuck.
   *Fix:* small Did and Nope buttons under the card (or a "Swipe right: DID"
   line like the first-night card) for the first few nights.

2. **The first question box doesn't look like a box.** On first night the
   field shows "lock the back door" in grey inside the card, which reads as
   an example, not a place to type. Continue stays grey with no reason given.
   *Fix:* a visible input underline/cursor or "Type here", and say why Continue
   is off ("Finish the question first").

3. **Reminders say they're on when they can't be.** I tapped "Not now" on
   notifications, but the question page says "Reminder: Buzzes at 8:00 PM" and
   the Add form's reminder switch is on. Nothing will buzz.
   *Fix:* when notifications are off, show "Off: notifications are off on this
   phone" with a Turn on button.

4. **Buy with 0 coins loses the helpful line.** Shop item first says "Earn 30
   coins by clearing 5 nights." Tap Buy and it turns into "Need 30 coins." and
   the earn tip disappears. Buy stays bright.
   *Fix:* keep the earn line, and change the button to "Not enough coins" (dim)
   or "How to earn".

5. **Nope still counts as "left".** After noping "take the evening pills" the
   header still says "1 DONE · 1 LEFT" and the card says "One question left
   tonight" with "Leave it" / "Did it now". "Leave it" is unclear: does it stay
   a nope? Does the night count?
   *Fix:* say it plainly: "You said nope to 1. Tonight still counts if you
   change it before 9am." Rename "Leave it" to "Keep nope".

## Not straightforward

6. **Sign-in screen first.** Before knowing what the app does, you get Google,
   email, and a small underlined "Use on this phone only". "Reviewer sign-in"
   is visible to everyone. "New here? Same steps. Your account is created when
   you confirm the code." is hard to parse.
   *Fix:* make "Try it without an account" a real button, hide Reviewer sign-in
   behind a long press, and rewrite the line: "New? Enter your email and we'll
   send a code."

7. **Signing in later: what happens to my questions?** Friends (signed out)
   says "Sign in first" but never says your questions come with you.
   *Fix:* one line: "Your questions and streak come with you."

8. **"When: Every day" looks tappable on first night but isn't.** It has no
   arrow and does nothing; on the Add form the same row opens choices.
   *Fix:* make it open the same choices, or drop the row and just say "Every day".

9. **The app renames your question.** "take the evening pills" became "Pills"
   in the list and the chip. I never typed "Pills". The two list rows also look
   different (one shows only the short name, the other short name + question).
   *Fix:* show the short name as an editable field on Add ("Short name: Pills"),
   and use one row layout.

10. **Recent nights grid has no labels.** The question page shows a 7x5 dot grid
    with no dates or legend.
    *Fix:* weekday letters on top and a one-line legend (Did / Nope / missed).

11. **Coins never move early on.** After my first DID, coins stayed 0 with no
    hint why. *Fix:* a small "+ progress to coins: 1 of 5 nights" under the
    streak on the done card.

12. **Widget setting with no way to add a widget.** Settings has "Widget: Look,
    Same as folder" but nothing explains how to put the widget on the home
    screen, and "Same as folder" is unclear.
    *Fix:* a "How to add the widget" row, and rename to "Match your look".

## Small polish

13. "Did it now" button is light blue while the rest of the app uses the look
    color (lime here).
14. After saving a new question, the Questions tab shows a back arrow even
    though it's a tab.
15. The Shop opens with "Coming Fri, Oct 9" items you can't buy yet. For a new
    user with 0 coins, lead with what they can earn instead.
16. The soft keyboard covers the idea chips and the schedule on Add; nothing
    scrolls the field into view.

## Worked well

- First night is short (3 steps), ideas fill in a time, and the reminder ask
  comes right after.
- The done card ("That is everything for tonight", streak, week dots,
  "Tomorrow: 1 question from 8:00 PM") is clear and rewarding.
- Undo toast after every answer.
- Add form schedule options are clear (Every day, Some weekdays, Once a month,
  Every few days, Just once, By a deadline).

## What I'd do, in order

1. Visible Did / Nope buttons on Tonight for new users (1).
2. Honest reminder state when notifications are off (3).
3. First-night input and Continue hint (2).
4. Shop: keep the earn line and a clear "not enough coins" state (4, 11, 15).
5. Clear nope wording (5).
6. Sign-in screen: real "try without account" button, hide reviewer link, plain
   copy, "your questions come with you" (6, 7).
7. Short-name field and one list row style (9), grid labels (10), widget how-to (12).
8. Polish 13–16.
