# Lessons

Bugs Aaron found after a change was called done. One line each: date, what
broke, why it was missed, and the check that now stops it. If an area shows up
twice, the fix is a test or a rule, not a note.

| Date | What broke | Why it was missed | What stops it now |
|---|---|---|---|
| 2026-10-03 | Widget showed "1 left" with no Did we question (fixed three times) | Widgets only draw a question that has a matching item; not tested | Widget drawing test in `scripts/check.mjs` |
| 2026-10-03 | Blank toast after accepting a link | Toast had no text; no fallback | ToastHost falls back to "Done"; test checks it |
| 2026-10-03 | Shared text was not a full question, link not tappable | Share text and preview built separately | Share text vs preview test |
| 2026-10-03 | Removed friend still showed up; sends and Did we's left behind | Unfriend only dropped the row | `supabase/unfriend.sql` + checklist row "when the relationship ends" |
| 2026-10-03 | Accepting a Did you gave no next step | No rule that every action confirms | `native/lib/confirm.js` + coverage test |
| 2026-10-03 | Link preview trusted the host header (SSRF) | No security review on new endpoints | Review agent on every diff |
| 2026-10-03 | Merged before the visual check finished | Did not wait for CI | Green CI before asking to merge |
| 2026-10-03 | Web button showed raw key `friendId.orPhone` | Keys not checked against en | Every `t()` key exists in en test |
