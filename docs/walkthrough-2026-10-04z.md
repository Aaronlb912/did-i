# Walkthrough pass 27 (2026-10-04)

Fresh install. Covered: Save a copy, Load a copy with a .txt file, Help, Crash
reports switch.

## Findings

1. Save a copy said "Your questions as a file", but it opens the share sheet
   with the JSON as text. Load a copy only listed .json files, so a copy saved
   to Drive or Files as .txt could not be loaded back. Load a copy now accepts
   text files too, and both rows say what really happens (9 languages). Proper
   file export needs a native build; added to docs/not-yet.md.
2. After loading: "Loaded. 1 questions added." and English left in six
   languages ("questions"). Now "Loaded. Questions added: 1." in all 9.

## Checked and fine

- A loaded copy adds its folder and question next to what is there.
