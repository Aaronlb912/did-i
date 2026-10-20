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
| 2026-10-03 | Cancel on the Did we / Did you form opened a new page, so Back reopened the form | Cancel pushed a route instead of going back; never tapped through on a phone | Phone pass: Add, switch kind, Cancel, Back |
| 2026-10-03 | Remove sheet said "1 Did we's" | Counted copy had no singular | Use the repo's `...One` key pattern for counts |
| 2026-10-12 | First light frame cut off in the Collection preview | A gem look card set zIndex, so it drew over the frame layer; previews only checked on Home | CardFrame Over layer has its own zIndex and elevation; test in `scripts/check.mjs` |
| 2026-10-17 | Keyboard covered the Topics and Details boxes on Add; no way to scroll to them | Only the Add card scrolled itself above the keyboard; every other box relied on luck | AppTextInput reports focus and growth, BoardShell scrolls the box above the keyboard; test in `scripts/check.mjs` |
| 2026-10-18 | Friends lost their pictures, looks and frames | An older SQL file that also defines `known_people()` re-ran live without the files after it (source not found in history); the full re-apply then stopped at `avatars.sql` on the newer `friend_askers` shape | `npm run db:apply <file>` refuses a file a later one redefines (`scripts/sql-order.mjs`); `avatars.sql` drops `friend_askers` first so a full run reaches the end |
| 2026-10-19 | Shared links on iPhone opened the website, never the app | `applinks:did-i.app` sat in `ios.entitlements`; Expo's entitlements mod deletes that key unless `ios.associatedDomains` is set, so no build since the flag went on carried it | `ios.associatedDomains` in `app.config.js`; test in `scripts/check.mjs` |
| 2026-10-20 | Weekly Did we showed streak 0 after both people did it | Answers on different days landed on different weeks, and the streak walk stopped at this week's due night before it was done; no streak test existed | Slots in `supabase/we-slots.sql`, server streak; `supabase/tests/did-we-slots.test.sql` and the slot cases in `scripts/check.mjs` |
| 2026-10-20 | No coins were earned for about an hour | The coin race fix (`coin-race.sql`) used `on conflict (user_id, night_iso)` inside a function with a `night_iso` parameter; Postgres called it ambiguous and every credit failed. It was applied without a call through the function | `on conflict on constraint coin_night_grants_pkey`; `supabase/tests/coins-credit.test.sql` calls the function. Run a SQL test that calls a changed function before applying it |
| 2026-10-20 | Every tap ran a full sync (all answers re-sent and pruned) | The stale-push guard (#341) compared the server `saved_at` text (`+00:00`) with the JS stamp (`Z`); they never matched | Compare with `Date.parse`. Timestamps from Postgres are compared as times, never as text |
