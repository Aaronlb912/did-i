# Shop drops

Every two weeks the shop gets a batch: **2 gem looks, 1 coin look, 2 cheers,
1 buddy, 4 buddy accessories, 3 card frames** (4 accessories from the 2026-12-04 drop on). Batches are built ahead and ship dated, so
they appear on their day with no store build.

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
- `supabase/gifts.sql` `gift_catalog`: every look, cheer, buddy and accessory
  at the same price and date.
- `supabase/shop-drops.sql`: add the drop day to `shop_drop_days` (the
  morning push for people who asked). check.mjs fails if a `from` date is
  missing there.
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
- On the phone, the eyes go in the `EYES` table in
  `native/components/BuddyArt.jsx` and the drawing uses `<EyesInline>`, so the
  buddy blinks like the rest. The shop sway needs nothing extra.

**Accessory** (`accessory.<id>`, a name only, no line)
- Two per drop, in two different slots (head, eyes, back, held, around): one
  common or standard (15 or 25 coins) and one rare (40). Balance the slots
  over time; the shop and Collection group by slot, so a thin slot shows.
- `src/lib/accessories.js`: the drawing in `DRAW` (shapes through `h`, placed
  from the buddy anchors in `AT`: `onHead` for head items, `hand` for held,
  `mid` for back) and an entry in `ALL_ACCESSORIES` with `from: 'YYYY-MM-DD'`.
  Seasonal ones also get `until`, the first day off sale.
- `src/lib/accessory-shapes.js`: the same item rebuilt from ovals,
  rectangles, lines, rings and triangles for the iPhone widget, which cannot
  draw paths. Keep it close to the real drawing.
- `supabase/shop-catalog.sql`: `('accessory', 'id', coins)` (seasonal: with
  `live_from` and `live_until`), and `supabase/gifts.sql` `gift_catalog` at
  the same price and dates. check.mjs tests both.
- Design rules (from Aaron's reviews): a rim on everything (the layer adds
  it), no neck items, no capes or backpacks, and every item must read as what
  it is at chip size, with a telltale detail (antennae on bee and butterfly
  wings, a string on a balloon). Fit every buddy: the frog's head items sit
  higher and wider (`hat`), the ant's back items lower (`back`). Back items
  draw behind the buddy, the rest in front.
- Seasonal sets go out ahead of their season (October, December, New Year)
  with an `until` date; after it they leave the shop and owners keep them.

**Frame** (`frame.<id>.name`, `.desc`, `.f1` to `.f3`, and `.short` if the name is long)
- Three per drop: one coin frame (still, 30 to 120 coins by how rich it is),
  one gem frame (a living frame, 3 gems) and one special (seasonal, earned
  or an event gift; never sold).
- `src/lib/frames.js`: `coin(id, coins, { from })`, `gem(id, 3, { from })`
  or `season(id, 'MM-DD', 'MM-DD', { from })`. `from` keeps it out of the
  shop, All frames and the Collection count until the drop day
  (`frameLive`, `shownFrames(today)`).
- Drawing in `native/components/frames/` (`FRAME_ART`, `FRAME_IDS` in
  geometry.js). Living gem frames read `f.p` (answered, total, skipped,
  evening, remind, buddy) and `f.pull`; tiles (`f.still`) stay still.
- `supabase/shop-catalog.sql`: `('frame', id, coins, gems, 'YYYY-MM-DD')`
  for coin and gem frames. Gem frame gifts are priced from there, so
  `gift_catalog` needs nothing. `supabase/friends-week.sql`: add the id to
  the `frame_on` check.
- Design first: a temporary showroom page next to Gold leaf, Aurora,
  Tonight's moon and the closest frame of the same kind, dark and light,
  three looks, card and tile. A separate reviewer grades it from screenshots
  before any app code; up to 2 redesign rounds. Keep the sketch in
  `docs/ideas/`.

## Event drop (free, one time)

An item with `free: true`, `gems: 0`, `from` and `until` in `src/lib/purse.js`
is a free event item (Halloween 2026: buddy `bat`, cheer `boo`).

- It is claimed in the shop, with a "Free" tag and "Free until {last day}"
  (`freeLastDay()`; `until` is the first day it is gone). The sheet button says
  "Claim it free". It shows as Coming for the 7 days before `from`, with its
  free dates, and cannot be claimed then.
- After `until` it is not in the shop or Coming, ever. Owners keep it: it
  stays in the purse, Collection lists owned items even when off sale
  (`buddiesOnOrOwned`, `cheersOnOrOwned`), and sync keeps it.
- Signed in, `claimFree` (src/lib/coin-shop.js) calls `claim_free_item`
  (supabase/event-items.sql). The server reads the window from
  `event_catalog` (same day of slack as paid drops) and adds the item to
  `profiles.gem_cosmetics`. No gems move. Signed out, it is claimed on the
  phone only, like a season frame, and kept at sign in. Add a row to
  `event_catalog` for each new event item, plus a `cheer_stage` row in the
  same file for a cheer (owners buy its stages with coins).
- Not in `gift_catalog`, so it can never be gifted; the gift picker hides it.
- `from` still needs a line in `shop_drop_days` (supabase/shop-drops.sql) so
  the morning push goes out.
- A free frame follows the frame rule (kind 'season', claimed once per year
  with the existing season-frame claim), not this path.

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
   motion (no animation). Accessory: on all 9 buddies (a temporary browser
   page that draws each buddy wearing it, the real drawing next to the
   accessory-shapes version, deleted after), on the Tonight card without
   being cut off at the top, in the shop and Collection, and on the Android
   widget. Nothing clipped, nothing off-screen at 390px wide.
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
2. If every point of the quality gate passed on a device, the task waits for
   CI and merges the PR itself. A draft ("needs device check") waits for Aaron.
3. After the merge, the task runs `npm run update:prod` from a local checkout
   of merged master (no Actions minutes). A merge that changed native files
   is not published; it needs a store build.
   Items are dated, so shipping early is safe.

Widget buddy art is native on iPhone, so a new buddy shows on the iPhone
home-screen widget from the next store build; everywhere else it comes with
the update.
