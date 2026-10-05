# Walkthrough pass 22 (2026-10-04)

Fresh install. Covered: Edit question, Every few days (with 1), By a
deadline, the question page after saving.

## Findings

1. **Saving a deadline question cleared the night by itself.** With only a
   "Due by Sun, Oct 11" question and nothing answered, the "Tonight done:
   Everything due got an answer" achievement fired, and the same check pays
   the nightly coins. A deadline question before its day was counted as due
   but not required, so "all required done" was true with nothing done. It is
   now left out of tonight's count until it is answered or its day comes, the
   same as an optional question. Test added.
2. With 1 in Every few days, the header read "Every 1 days" next to the
   error. It now reads "Every few days" until the number is 2 or more.

## Checked and fine

- Every few days starts at 3; 1 shows "needs a number of 2 or more".
- By a deadline starts a week out; past days are dimmed.
