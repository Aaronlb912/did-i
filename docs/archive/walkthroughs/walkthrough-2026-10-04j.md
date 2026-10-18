# Walkthrough pass 11 (2026-10-04)

Fresh install on the Android emulator, no account, suggested question
"put the bins out" (weekly, Sunday, topic House).

Covered: Questions list, topic filter, Select mode (nothing picked, Stop
asking with undo), a stopped question's page and Ask me again, Duplicate,
reminder line with notifications off.

## Findings

1. Duplicate did nothing. The copy opened, Add question stamped "On tonight",
   and the list still had one question. The save passed the original's folder
   along, so it was treated as an edit of a question that did not exist yet.
   A copy now saves as a new question.
2. The question page showed its topic as raw "house" with no capital, while
   the filter showed "House". It now uses the same label.
3. Select mode toasts read "Stopped asking 1." / "Deleted 1." with no noun.
   Now "Questions no longer asked: 1." and the same for deleted and asked
   again. Other languages already read this way.

## Checked and fine

- Select with nothing picked: Stop asking and Delete are dimmed.
- Stop asking moves the question under "Not being asked" with a timed undo.
- Ask me again puts it back on Tonight.
- The reminder line shows "Buzzes" for a moment before the phone's
  permission check comes back, then "Notifications off". Too brief to matter.
