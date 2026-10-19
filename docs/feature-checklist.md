# Feature checklist

Paste this into the plan before building. Fill every row. "n/a" needs a reason.

| Question | Answer |
|---|---|
| Already friends? | |
| Not friends? | |
| Blocked, either way? | |
| Same family? | |
| They remove you, or leave the family? | |
| Signed out? | |
| Brand new install (link before onboarding)? | |
| Offline? | |
| Full or capped? | |
| Expired? | |
| What does the other person see? | |
| What does the widget show? | |
| Which push goes out, and its switch? | |
| What happens to data when the relationship ends? | |
| Success / failure / destructive / double tap messages? | |

## Example: share a Did we by link

| Question | Answer |
|---|---|
| Already friends? | Join the Did we. No add-friend ask. |
| Not friends? | Join, then ask once to add the maker as a friend. |
| Blocked, either way? | Link does not join. Says the link no longer works. |
| Same family? | Same as friends. |
| They remove you, or leave the family? | You choose to keep or leave the shared Did we. |
| Signed out? | Sign in first, then the join continues. |
| Brand new install? | Code is held through onboarding, then joins. |
| Offline? | Inline message. Nothing saved half way. |
| Full or capped? | Says it is full. Cap is in the DB. |
| Expired? | Link lasts 7 days. After that it says so. |
| What does the other person see? | The maker gets a push that you joined. |
| What does the widget show? | The Did we question, once it has a matching item. |
| Which push goes out, and its switch? | Join push to the maker, under its notification switch. |
| What happens to data when it ends? | Link stops when the maker leaves. Your answers stay yours. |
| Messages? | Join lands on Tonight with confirmDone. Failure: confirmMiss. once() on join. |

Link format: `https://did-i.app/d/` plus a 12-letter code.

## After it ships

If Aaron reports a bug in it, add a line to `docs/lessons.md` and fix the
check that missed it (test, rule, or this checklist), not only the code.

## Example: day nudges

| Question | Answer |
|---|---|
| Already friends? / Not friends? / Blocked? / Same family? / They leave? | n/a: local to your own phone and questions. |
| Signed out? | Same as signed in; nudges read the shelf on this phone. |
| Brand new install? | Asked for notifications after setup; nudges start once granted. |
| Offline? | Local notifications, no network. |
| Full or capped? | 14 a week, inside the 60 pending the phone keeps (iOS caps 64). |
| Expired? | A rolling 7 days, refreshed on every answer and open. |
| What does the other person see? | Nothing. |
| What does the widget show? | Unchanged. |
| Which push goes out, and its switch? | None from the server. Local, under Day reminders. |
| What happens to data when it ends? | Turning the switch off cancels them on the next arm. |
| Success / failure / destructive / double tap messages? | Not now closes the card; denied shows Open phone settings. |

## Example: morning ask (one-day questions for today)

| Question | Answer |
|---|---|
| Already friends? / Not friends? / Blocked? / Same family? / They leave? | n/a: your own questions only. |
| Signed out? | Works; stays on the phone. |
| Brand new install? | Hidden until there is a question (set-up first) and after night one. |
| Offline? | Saved like any add; syncs later. |
| Full or capped? | 10 a day. The card says the day is full. The server drops past 30, an abuse guard. |
| Expired? | Card gone at noon. The question leaves Tonight after its day; the day's sheet keeps it. |
| What does the other person see? | Nothing new. |
| What does the widget show? | The question, like any due today. |
| Which push goes out, and its switch? | 9:00 day nudge asks for today (Day reminders, Morning ask). A picked time reminds like any question (Reminders). |
| What happens to data when it ends? | Put away after its day with its answer. |
| Messages? | Empty: nothing. Same question today: refused. Time passed: refused. Failed save: says so. |
