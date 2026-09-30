# Did we (build doc, not shipped)

Branch `did-we`. Nothing merges to master until 1.1.0 is live in the stores and
Aaron says merge. Decisions from Aaron (2026-09-30):

- The card's owner picks what others see, per card: every answer, only who is
  still waiting (a nope reads as waiting), or just a count.
- Kids use normal accounts, same as Family today. No kid profiles.
- Build everything: v1, v2 and the later items.

## Pieces and status

| Piece | Status |
|---|---|
| `supabase/did-we.sql`: tables, RLS, caps, we_make/ask/reply/leave/edit/answer/nudge/tonight/counts/claim, sweep | applied to the live project 2026-09-30 (additive; the 1.1.0 app never calls it) |
| `supabase/tests/did-we.test.sql` | passes; `npm run db:audit` returns no rows |
| Client lib `src/lib/did-we.js` (calls, streak, best, month and challenge math, widget line) | built |
| Tonight: no panel (Aaron, 2026-09-30: keep Tonight uncluttered). Only the swipe card, in the stack's own spot, once your own questions are through. Your cards are listed on People → Did we; each opens its page with Did / Nope / nudge. Old panel notes: (`native/components/WeTonight.jsx`, web `WeTonight` in `src/lib/DidWe.jsx`): asks to join, faces that light up on a did, waiting on X / your turn, streak, challenge progress, Did / Nope, nudge | built, not run on a phone |
| New Did we `/we/new`: pick people, mode, what others see, nights, finish line | built; web checked signed out |
| Card page `/we`: people, whose turn, streak and best, coins at next milestone, this and last month, challenge, ask more, change the rules (owner), leave with confirm | built, not run on a phone |
| Done together: your cheer plays, push to everyone on the card, streak coins claimed and pulled into the purse | built, not run on a phone |
| Widgets: one "Did we · waiting on Sam" line on medium and large (iOS and Android), saved by the app (`src/lib/we-widget.js`) | built, needs a native build to see |
| Signed out: `/we` and `/we/new` say it needs an account, with Sign in | built; web checked |
| Help page: sections for questions, reminders, widget, friends and family, Did we, cheers, coins and gems | built; web checked |
| i18n: all keys in 9 locales | done; `npm test` 114/114 |

## Its own place (2026-09-30)

- No menu entry and no tab (Aaron, 2026-09-30). Did we lives on Friends and
  family ("Open Did we" row); its count folds into that menu row's badge.
- One Add screen for all three (`native/screens/AddScreen.jsx`): tap the first
  words ("Did I ▾") to pick Did I, Did we or Did you (`LeadPicker`). The typed
  words carry over. Did you is `native/screens/you.jsx` (who, note, send).
  Editing an existing question stays plain Did I. The web has the same
  choice as a "Did I ▾" menu (`src/lib/LeadSwitch.jsx`) at the top of
  `/add`, `/we/new` and `/you` (web Did you, `src/lib/DidYou.jsx`); the words
  carry across in `start`.
- Did I words that sound shared ("together", `lead.togetherWords` per
  language) show a "Make it a Did we" chip under the card (phone and web).
- Who lists the last 3 people you asked first (this device only,
  `recentAsked` in `did-we.js`).
- Did you can repeat: Just once / Every night / Some nights. Stored as
  `sends.repeat` (`supabase/did-you-repeat.sql`, applied 2026-09-30).
  Keeping it, from the inbox or by auto add, puts it on their Tonight with
  that schedule; it is theirs to change or remove. Nothing repeats server side.
  All three share the Did I form's feel (`useAddFeel` in `questions.jsx`):
  folds ease open, a miss buzzes, and sending stamps the card "Sent" with
  your cheer before moving on.
- `/we` with no id is the Did we home (`WeHomeScreen` / web `WeHome`): asks,
  tonight together with Did / Nope, the rest by your folder, this month
  together, + Did we. Empty state has idea starters that fill New Did we.
- Violet accent `we` / `--di-we` (light and dark): the swipe card border and
  label, the faces ring, the menu icon and badge, the home rows.
- Ways in: "Start a Did we with {name}" on a friend's send sheet; a one-time
  prompt when you accept a friend; Friends and family has an "Open Did we" row.
- One shared load for Did we (`useWeTonight` caches per account for 3 s), so
  the menu badge does not add a call per screen.

## Not done yet

- **Store listings:** paste the 1.2 text from `docs/app-store-connect.md`
  into App Store Connect and Play Console when 1.2 ships, not before.
- **Apple guideline 1.2** (apps where people send each other content) expects the
  developer to act on reports. Report blocks at once; if review asks, say so.

- **Nobody has used it with two real accounts.** Everything past the SQL test
  and the signed-out web pages is untested in the running app. Next: two
  accounts that are friends (the review accounts work), make a card, join,
  answer, nudge, finish together, leave.
- **Web Tonight card uses buttons.** On the phone an unanswered Did we is a
  swipe card (the same `SwipeCardHost` as your own questions) once your own
  stack has nothing left to swipe. The web shows the same card in that spot
  with Did and Nope buttons, since the web swipe lives inside the lamp card.
- **Push texts are English only** (server side), same as the other pushes.
- **Faces and the people list are untested with real cards.** Each face is
  that person's buddy (`profiles.buddy_on`, Aaron said yes 2026-09-30), or
  initials without one; first 5, then +N. Tapping the faces lists everyone
  on the card and where they are tonight, within what the card shows. Your
  buddy is saved when your cards load and it changed (`shareMyBuddy`), so a
  new buddy reaches the others the next time you open the app.
- **The widget line updates when the app is open.** A friend's did changes it
  the next time the app loads Did we.

## Modes

- all: everyone on the card says did.
- any: one did is enough (feed the cat once).
- most: more than half.
- turns: one person a night, in the order they were asked; the turn only moves
  on nights the card is due.

A challenge is any card with `goal_nights`: done together that many nights and
it is finished.

## Rules the server keeps

- Only friends or family can be asked, never someone blocked either way.
- 30 live shared questions per person, 12 people per card.
- An unanswered ask is gone after 14 days, the same as one turned down: it is
  hidden, cannot be joined, and can be sent again. No sweep job.
- Being asked sends a push that opens the inbox; asks show in the inbox and
  count toward the People badge.
- Answers only for tonight or the night before (any time zone).
- One nudge per person per card per night, and only after you said did.
- Streak coins once per person per milestone: 7 → 5, 30 → 15, 100 → 40, 365 → 100.
- Leaving keeps history; the owner role passes to the longest-standing member;
  the last one out closes the card.

## Cheers (2026-10-01)

- The did that finishes a card is stored with the finisher's cheer
  (`we_done.finisher`, `finisher_cheer`, from `profiles.badge_cheer`, kept in
  step by `shareMyBuddy`). Everyone else sees that cheer once, with "{name}
  finished it", the next time they open Tonight (`takeWeFinishes`, this
  device only). Tapping the line opens the card.
- Cheer someone on a card: in the people list, and "Cheer {name}" on the
  card page for anyone who said did (no nudge for them). Same stored friend
  or family cheers as Friends and family (`src/lib/we-cheer.js`).
- A streak reaching 7, 30, 100 or 365 plays the cheer at stage 4
  (`weCheerStage`), for the finisher and for everyone who sees it after.

## Guards (2026-09-30, `supabase/did-we-guard.sql` + tests in `supabase/tests/did-we-guard.test.sql`)

- A no holds: that card cannot ask them again for 7 days, and none of your
  cards can ask them for a day (`said_no_at`, `we_said_no_lately`).
- 10 new cards a day per person; 3 nudge pushes a night per person, from all
  cards together; nudges check blocks.
- Blocking: the blocker leaves every card shared with that person, and asks
  either way are dropped. Unfriending drops waiting asks (not family); shared
  cards stay, and the Remove confirm says so.
- Repeating Did yous always wait in the inbox, even from family. 3 a day to
  one person, 10 a day to everyone.
- Report on a Did we card and on inbox Did yous (`report_we`,
  `report_send`) saves a row in `reports` with the question and blocks that
  person (so you leave shared cards and their asks and Did yous stop).
  Nobody reviews reports (Aaron, 2026-09-30); blocking is the protection.
  20 reports a day per person.
- Notifications → "Hide what it says" (`prefs.pingsPrivate`): every push to
  that person says who, not the question (`push_private` trigger).
