# Shop drops

Every two weeks the shop gets a batch: **2 gem looks, 1 coin look, 2 cheers,
1 buddy**. Batches are built ahead and ship dated, so they appear on their day
with no store build.

Drop days are every other **Friday**, starting **2026-10-09**
(2026-10-09, 10-23, 11-06, 11-20, 12-04, ...). Keep at least **3 future drops**
built ahead.

## How a date works

- `src/lib/purse.js`: give each new item `from: 'YYYY-MM-DD'`. `CHEERS`,
  `LOOKS`, `BUDDIES` only hold items whose day has come (`isLive`); the
  "New" shelf in the shop shows the newest dated batch. `SHOP_CALENDAR` has
  everything.
- `supabase/shop-catalog.sql`: coin items the server sells. Add each new
  **coin look** and each new **cheer** (its coin stages) with the same date:
  `('look', 'id', 'YYYY-MM-DD')`, `('cheer_stage', 'id', 'YYYY-MM-DD')` in an
  `insert ... on conflict (kind, item_id) do update set live_from = excluded.live_from`.
  Then `npm run db:apply supabase/shop-catalog.sql` and `npm run db:audit`.
  Gem items are client-side (purse) and need no SQL.
- `scripts/check.mjs` fails if a coin look or cheer is missing from
  `shop_catalog`, or an id repeats.

## What each item touches

Copy the newest item of the same kind and change it. Every name and line goes
through `t()` with keys in **all 9** `src/locales/*.js` files.

**Look** (`look.<id>.name`, `look.<id>.line`)
- `src/lib/purse.js` `ALL_LOOKS` (gem: `gems: LOOK_GEM_PRICE`; coin:
  `coins: LOOK_COIN_PRICE`) and, for gem looks, `GEM_LOOK_IDS`.
- `src/lib/did-i.css`: every `[data-look='pulse']` block has a twin for the
  new id (dark, light, chip, reduced motion).
- `native/lib/gem-look-tone.js`, `native/palette.js`,
  `native/components/Cosmetic.jsx`, `src/lib/prefs.js`,
  `src/lib/widget-config.js`, `src/site/site.css`: same pattern as `pulse`.
- Colors come from the existing token style; look distinct from every other look.

**Cheer** (`cheer.<id>.name`, `cheer.<id>.line`)
- Follow `.cursor/rules/cheers.mdc` and `docs/cheers.md`: builder in
  `src/lib/cheer-pops.js` (+ `GAP_MS`, `BASE_HOLD`, `CHEER_KINDS`), web
  `src/lib/CheerBurst.jsx` + CSS, native `native/components/CheerBurst.jsx`,
  chip in `native/components/Cosmetic.jsx`.
- Same level of detail as the current cheers: motion with overshoot and
  settle, sensible stage 1 to 5 growth, reduced motion respected.
- Check all five stages on the Android emulator (force stage 5 in the shop
  preview temporarily, then revert).

**Buddy** (`buddy.<id>.name`, `buddy.<id>.line`)
- `src/lib/purse.js` `ALL_BUDDIES`.
- Art in `src/lib/BuddyArt.jsx` and `native/components/BuddyArt.jsx`, and the
  same parts in both widgets: `widgets/DidITonightWidget.tsx` (iOS) and
  `widgets/android/DidITonightAndroidWidget.jsx`.

## Coming soon

A drop shows in the shop as **"Coming {date}"** for the 7 days before its day
(`TEASE_DAYS`, `comingDrop()` in `src/lib/purse.js`). Tiles there preview but
cannot be bought. Anything further out is hidden. So a drop must be finished,
checked, merged, and in an update at least **8 days** before its Friday.

## Quality gate (every item, before the PR is ready)

A drop is not ready until each point is true and shown in the PR:

1. **It works.** `npm run ios:prepare:store` passes. Buy, equip, and preview
   each item on the Android emulator with a signed-in and a phone-only shelf.
   Coin items buy through the server (`shop_catalog`); gem items take gems.
2. **It looks right everywhere.** Dark and light theme. Look: home, a card,
   the shop chip, the widget ring. Buddy: app card, shop chip, Android widget.
   Cheer: shop preview and a real Did swipe, stages 1, 3, and 5, plus Less
   motion (no animation). Nothing clipped, nothing off-screen at 390px wide.
3. **It has the same appeal.** Put it next to the current items of its kind.
   It must match their polish: motion with anticipation, overshoot, and
   settle; colors that hold contrast in both themes; a buddy drawn at the same
   size, stroke, and charm. If it looks plainer or busier than its
   neighbours, redo it.
4. **It is new.** Different name, colors, motion, and silhouette from every
   existing item. No near-duplicates.
5. **Copy is right.** Short, concrete, no em dashes, no hype, product words
   only, real translations in all 9 locales.

If the emulator is not available, open the PR as a **draft** titled
"needs device check" and say so. Never mark an unchecked drop ready.

## Shipping

1. The scheduled task builds a drop on a branch `drop/YYYY-MM-DD`, runs
   `npm run ios:prepare:store`, applies `supabase/shop-catalog.sql` (safe
   early: the server only sells an item from its date), pushes the branch and
   opens a PR.
2. Aaron reviews the PR and merges it.
3. Aaron runs `npm run update:prod` before the drop day. Because items are
   dated, one update can carry several future drops.

Widget buddy art is native on iPhone, so a new buddy shows on the iPhone
home-screen widget from the next store build; everywhere else it comes with
the update.
