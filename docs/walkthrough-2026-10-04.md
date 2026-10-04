# New user walkthrough 2, 2026-10-04

Same clean Android emulator, no account ("Try it without an account"), after the
#103 OTA. This pass covered what pass 1 skipped: the Tonight header, question
page, editing, duplicate, priority, folders, topics, select mode, stop asking,
delete, every Settings row, folders screen, calendar, week, streaks, so far,
every answer, achievements, collection, Get gems, and the Add form's Did you /
Did we while signed out.

Not tested (on purpose): buying gems (real purchase), signing in or entering an
email, granting notification permission, Did you / Did we with a second person.

## Broken (fix first)

1. **Coins wiped when a question moves to a new folder.** Edit a question, make
   a new folder from the Folder row, Save. Coins went from 1 to 0. Saving copies
   the purse of the folder you're on (`spreadPurseFrom` in useAppShelf.js), and
   the brand-new folder's purse is empty, so it overwrites everyone's coins.
   Real data loss.

2. **"Add a folder" does nothing.** Settings > Folders > Add a folder. It does
   make an empty folder, but empty folders are hidden right away
   (`parkEmptyTags`), so nothing appears and no message shows.

3. **Edit question loses your changes without asking.** Save and Cancel are at
   the very bottom, below the fold. Changing the short name and pressing the
   back arrow (or phone back) throws the change away silently. The header back
   arrow also needed two taps while the keyboard was up.

4. **Duplicate cuts off the name.** "Water the plants daily" became "Water the
   plants daily c". The " copy" suffix is added, then the short name is cut to
   its length limit.

5. **Stats only count the folder you're on, without saying so.** "Every answer"
   showed 1 answer, "So far" showed DID 0, the week grid showed only Pills, while
   a DID on "Water the plants" (in another folder) existed. Looks like answers
   went missing.

## Trips you up

6. **Tapping "Did I" (the title) renames your folder.** It turns into a "Folder
   name" box with "General" in it. Nothing says that's what it is.

7. **No way to answer early.** Tapping a "not yet" question shows "Open
   question" and "Back". Open question only opens the settings page. If you
   watered the plants at 6pm you can't mark it until 8pm.

8. **A grace-period Did counts as "Late" with no explanation.** The DID I gave on
   last night's card shows as "late" in Every answer and earned 1 coin, not 2.
   The card never says answering now counts as late.

9. **Priority Low quietly turns off reminders.** It says "Waits until last.
   Never buzzes." but the Reminder row above still offers "Turn on".

10. **Three ways to group with no explanation.** Folders, Topics, and short
    names. "Topics" came from the Details text ("pills") without me making one.
    The filter shows Topics under Folders with no hint what a topic is.

11. **The Folders screen is hard to read.**
    - "Tap Save or leave the field." but there's no Save button.
    - "Add a folder: Empty. Free. Same name as you." doesn't make sense.
    - Buttons Home / Calendar / Feed / So far / Remove this folder: is "Home"
      the Home tab or my Home folder? Which folder is "this"?
    - Folders use a tag icon.
    - The suggested folder name is "Home", which matches the Home tab.

12. **"Empty list" under "Danger".** The confirm says "Every question and answer
    here goes away" but doesn't say if "here" is this folder or everything.

13. **Calendar dots on future days and before you started.** Every future day
    has a dot like it's due, and Oct 1 and 2 (before install) look like missed
    nights. The text says "Nothing due stays blank."

14. **"Streak is 1 of 5 nights."** Of 5 what? The next achievement? Not said.

## Not straightforward

15. **The question page and Edit question show the same settings.** Tapping a
    row on the question page jumps into Edit (scrolled to the top). Two screens
    for one thing.
16. **"Ask me again" for a paused question is at the very bottom.** Only "Not
    being asked right now." shows up top, with no button there.
17. **Collection says "Tap an item, then wear it"** but tapping wears it at once.
18. **Did you / Did we while signed out** go to a "needs an account" sheet that
    never says what a Did you or Did we is.
19. **Get gems while signed out:** price buttons look live though the text says
    "Sign in first". Packs are ordered 14, 40, 80, then 1, 3, 6.
20. **Theme "Phone"** means follow the phone; Clock also says "Phone". Clock sits
    under "Look". "Look" is both a section and a widget row.
21. **"New day starts: Midnight. Nothing to set."** sits next to a 9am grace
    period elsewhere. Which one ends the night?
22. **Save a copy / Load a copy** are under the "Help" heading.
23. **Achievements:** 101 with no sign of what you get for them.
24. **No "Saved" message** after saving an edit.

## Small polish

25. The Theme icon stays a moon in light mode.
26. Closing the "Empty list" sheet jumps Settings back to the top.
27. "ALL 2" on the filter chip: 2 what? (folders).
28. Back from a calendar subpage landed on "So far" instead of the calendar.

## What worked well

- Undo after Stop asking, and the paused list section.
- Delete confirm says how many answers go with it.
- Select mode is clear.
- Widget how-to sheet.
- Light theme looks right.
- Priority choices each explain themselves.

## What I'd do, in order

1. Fix the coin wipe (1). Copy the purse from the folder that had it, or keep
   the purse on the shelf, not per folder.
2. "Add a folder" should ask for a name and keep the folder (2, 11).
3. Edit question: Save in the header, and ask before leaving with changes (3, 24).
4. Duplicate: cut the name first, then add " copy" (4).
5. Stats, Every answer, Week: show all folders by default, with the folder
   filter visible (5).
6. Let people answer early from the "not yet" card (7), and say when an answer
   counts as late (8).
7. Title tap: show a pencil or drop the hidden rename (6).
8. One way to group: folders. Hide or explain topics (10).
9. Folders screen copy and layout rewrite (11), say what "Empty list" clears (12).
10. Calendar: blank future days and days before you started (13), explain the
    streak goal (14).
11. Merge the question page and Edit (15), Ask me again at the top (16).
12. Copy fixes 17–23, polish 25–28.
