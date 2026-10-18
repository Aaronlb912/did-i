# Walkthrough pass 12 (2026-10-04)

Fresh install on the Android emulator, no account, suggested question
"take the evening pills".

Covered: swipe left for nope, the nope card ("Did it now" / "Keep nope"),
Change a nope, Replay the intro, Settings bottom half, How Did I works.

## Findings

1. Help said "Add a question with the + button". There is no + button; Add
   is on the Questions tab and in the menu. Fixed in all 9 languages.
2. Help said "the folder chips on Tonight show one folder at a time". The
   chips on Home are per question; the ALL chip is the folder filter and can
   pick more than one. Now "the ALL chip on Home filters by folder."
3. English Help and Settings mixed "9am", "9 AM", "5am" and "9:00 AM" on the
   same screens. All now "9:00 AM" / "5:00 AM", matching the app's clock.

## Checked and fine

- "Did it now" after a nope always saves as late, so "It counts as late"
  is true even before midnight.
- Replay the intro returns to Home on Start.
