# New user walkthrough 3, 2026-10-04

Clean Android emulator, data cleared, "Try it without an account", after the
#105 OTA. First night with a custom question at 11 AM, answered it, added a
Mon/Wed/Fri question, edited, duplicated, paused, delete prompt, every menu
item, every Settings row, folders, calendar, nights in a row, seven nights,
every answer, achievements, help, Get gems, and the Did you / Did we picker.

Not tested (on purpose): buying, signing in, granting notifications, Sign out.

## Broken

1. **Stuck after saving an edit.** Edit a question, Save, then back: "Discard
   changes?" every time, and back never leaves. Save opened a second copy of
   the question page over the edit page, and the edit page still listened
   for back.
2. **Seven nights shows missed nights before you started.** Every day before
   install is red. Red isn't in the legend (DID, Late, Nope).
3. **Question page grid has dots before the question existed.** A question
   made today shows five weeks of "Not answered yet".
4. **Notifications page says "This browser will not tap you."** on the phone,
   with every switch on and no way to turn notifications on.
5. **No way to change an answer once the undo is gone.** Tapping the answered
   question shows "Marked DID" with no buttons, and swipes do nothing.
6. **New questions go into the last folder you made.** After adding a
   "Health" folder, Add puts new questions in Health while Home shows All.

## Trips you up

7. The reminders card says "We'll ask you at 11:00 AM" at 11:32 AM, when the
   question is already open.
8. Add with "Some weekdays" and no day picked: the error shows at the very
   bottom, off screen, so Add looks dead. It stays after you pick days.
9. Picking "Some weekdays" makes the row say "Weekly".
10. "Any time" says "It waits until this time to come up tonight."
11. Duplicate names the copy "Drink 8 glasses of copy".
12. The Delete button in the delete prompt is the bright main color, not red.
13. Add opened from the menu has a tall empty band above Cancel.
14. Add a folder: the keyboard covers the Add and Cancel buttons.
15. Calendar: a future day says "Open" for each question.
16. This phone: "Tap Save or leave the field." with no Save button. "Sign out"
    shows when you never signed in. "Back to Settings" repeats the back arrow.
17. Get gems says "Sign in first" with no way to sign in from there.
18. How Did I works: "Nope does not break the rest" right above "anything
    noped ends the streak". "Shop is the bag" and "look-back" mean nothing.

## Not straightforward

19. Settings puts Achievements, Calendar and Every answer under "Folders".
    Send feedback has the same icon as Save a copy.
20. The question page's summary line reads "Mon, Wed, Fri · Any time · Off.
    Notifications are off on this phone. · General · Normal". The grid title
    is "DRINK 8 GLASSES OF WATER RECENT NIGHTS".
21. "Not on tonight." never says when it is on next.
22. "Question paused" toast has no Undo.
23. An empty email says "That email does not look right."
24. Friends (signed out) says "send a Did you" without saying what that is.
25. Accessories preview wears the Ant while Buddies says "No buddy".
26. Folders: "This folder" moves to whatever folder you made last.
27. A look's "Earn 30 coins by clearing 5 nights" assumes 6 coins a night;
    one question earns less.

## Worked well

- First night is quick; the Did / Nope buttons and swipe hint are clear.
- Stop asking / Ask me again are instant.
- Add a folder now asks for a name and keeps the folder.
- Calendar day sheets, Every answer, and the folder filter.

## What changed (PR)

All fixed except 6, which stays by design: a new folder has to be the one in
use or it is put away while empty, and the Add card names the folder on top.
5 now says why: a DID stays once the undo is gone, so coins stay fair.
