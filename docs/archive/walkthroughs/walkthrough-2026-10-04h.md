# Walkthrough pass 9 (2026-10-04)

Fresh install on the Android emulator, no account, custom question "floss".

Covered: onboarding with a typed question, Tonight answer, Collection (all four
tabs, wearing a buddy), Light theme across Home, Questions, editor and Settings,
moving a question into a new folder from the editor, Get gems signed out,
Account page, Settings bottom half (help, privacy, legal, danger, version).

## Findings

1. Account page title said "Sign in to keep your folders". The body is about
   questions, answers and streaks, and a new user has never made a folder.
   Now "Sign in to keep your questions", in all 9 languages.

## Checked and fine

- Gem packs are not tappable while signed out, but "Sign in to buy gems" sits
  right above them, so nothing reads as broken.
- A question moved to a new folder shows the folder on its page, in the list,
  and as the default on the next Add.
- Back from Account returns to Settings.
