# Usage milestones

Where new people stop. Anonymous, phone app only (not the website).

## What is counted

One row per install per milestone, sent once:

| Milestone | When |
|---|---|
| `opened` | the app opens for the first time |
| `added_first` | the first question is saved |
| `first_swipe` | the first Did or Not yet |
| `night_1`, `night_3`, `night_7`, `night_14` | that many nights with an answer |
| `widget_used` | the first answer from a home screen widget |
| `friend` | the first accepted friend |
| `bought` | the first buy that spends coins or gems |

Each row has a random install id (made only for this, not the account or the
phone id), the platform and the app version. No questions, answers or names.
The privacy policy says so (`legal.privacy.vendors.body`).

## Reading it

In the Supabase SQL editor:

```sql
select * from milestone_funnel();
```

It lists each step with how many installs reached it and the share of the
installs that opened. For one platform or a date range, query
`public.milestones` directly (`platform`, `made_on`, `version`).

## How it works

- `supabase/milestones.sql`: the table, `note_milestone()` (the only way in,
  ignores repeats, caps at 50,000 rows a day) and `milestone_funnel()`.
  Phones cannot read either.
- `src/lib/milestones.js`: sends each milestone once, retries a failed send
  next time. Shelf-based ones (first question, first swipe, nights) are worked
  out on every shelf save in `writeShelf` and stop once all are sent.
- Calls: `native/AppShell.jsx` (opened), `src/lib/coin-shop.js` (bought),
  `src/lib/people.js` (friend), `src/lib/widget-tonight.js` (widget_used).
- Adding a milestone: add it to the `event in (...)` list in the SQL and send
  it with `noteMilestone('name')`. `npm test` checks the two agree.
