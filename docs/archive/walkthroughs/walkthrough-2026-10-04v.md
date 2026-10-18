# Walkthrough pass 23 (2026-10-04)

Fresh install. Covered: Edit question, Some weekdays, Time (Any time / At a
time), Just once.

## Findings

1. Some weekdays started with no day picked, so Save would fail with a
   "pick a day" error. It now starts on today's weekday, like Once a month
   and Every few days.

## Checked and fine

- Just once starts on today; past days are dimmed.
- Time explains "It comes up as soon as tonight starts." for Any time.
