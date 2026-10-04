# Walkthrough pass 21 (2026-10-04)

Fresh install. Covered: Add, the Did I / Did we / Did you switch, Did we
signed out, When set to Once a month.

## Findings

1. Once a month showed a full October calendar (month arrows, weekday row,
   today ringed) for what is only "which day number". It read like picking a
   date. It is now a plain 1 to 31 grid plus Last day.
2. Once a month started with no day picked, so Add failed with "A monthly
   question needs a day." It now starts on today's day, like Every few days
   starts on 3.
3. "Monthly on the 12" read wrong in English. Now "Monthly on day 12"
   (German gets the ordinal dot).

## Checked and fine

- Did we when signed out explains it needs an account, with Sign in and Back
  to Did I.
- Leaving Add keeps the draft for next time.
