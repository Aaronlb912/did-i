# Walkthrough pass 26 (2026-10-04)

Fresh install, answered Did. Covered: folder rename, add a folder, remove a
folder, Select delete, the question page's Delete.

## Findings

1. Deleting a question from its page said "This cannot be undone." and gave
   no way back, while deleting the same question from Select offered "You can
   undo for a few seconds." The page's Delete now shows the same undo toast,
   and undo brings the question and its answers back (clearing the delete
   marker so sync does not drop it again). The confirm text says so, in 9
   languages.

## Checked and fine

- Rename a folder: Save, "Saved", the new name everywhere.
- A new folder becomes where new questions go; Home still shows all.
- Remove a folder asks first and names the folder.
- Back from Home leaves the app, as Android expects.
