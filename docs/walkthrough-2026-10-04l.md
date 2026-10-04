# Walkthrough pass 13 (2026-10-04): clean

Fresh install on the Android emulator, no account, suggested question
"lock the back door".

Covered: reminder prompt "Turn on" then the phone's "Don't allow", answering
Did, Settings middle section (New day starts, Clock, Notifications, Sound on
DID, Hide achievements, Folders), Achievements, Calendar, Every answer, This
phone, a scan of every English string for the words the app avoids.

## Findings

None.

## Checked and fine

- Don't allow on the phone's prompt returns to Home quietly; the editor and
  the question page then say notifications are off.
- New day starts is a read-only row with no arrow.
- Achievements: 3 of 101 after one night, locked ones say how to get them.
- Every answer lists the one DID with today's time.
- This phone: name and note save when you tap away; the page says it stays on
  this phone.
- No English string shows skip, board, hall, hang or heat (only key names and
  placeholders use them).
