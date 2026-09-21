# Cheers

How a cheer works on screen. Follow this for every new cheer and every stage
tweak.

## Stage = count + size

- **Stage 1** — one instance, smaller.
- **Stage N** — N instances spread around the screen, each bigger than stage 1.
- **Stage 5** — five instances at the edges, full intensity, together they cover
  the viewport.

Preview and a real Did I tap use the same layout. `fireCheer(..., preview: true)`
only bypasses reduce-motion in shop/collection. It does not change pop count or
positions.

## One source of truth

`src/lib/cheer-pops.js` owns everything:

| Piece | Job |
|-------|-----|
| `ORIGINS` / `DANCE_ORIGINS` | Where each pop sits (% of the cheer stage) |
| `BURST_BUILDERS` | Per-kind bit recipe for each pop |
| `burstLevel(pop, stage)` | Intensity for this pop (`stage + pop`) |
| `stageMul(stage)` | Size multiplier across the whole cheer |
| `popsFor(kind, stage)` | Returns N pops with staggered `wait` |
| `holdFor(kind, stage, popCount)` | How long the overlay stays up |
| `GAP_MS` / `BASE_HOLD` | Per-kind timing |

Do not hardcode pop count or positions in Shop, Collection, or `board-ops`.

## Adding a cheer

1. Add the id to `CHEER_KINDS` and `CHEERS` in `purse.js`.
2. Add a builder in `BURST_BUILDERS`.
3. Add `GAP_MS` and `BASE_HOLD` entries.
4. Wire web bits in `src/lib/CheerBurst.jsx` + `src/lib/did-i.css`.
5. Wire native bits in `native/components/CheerBurst.jsx`.
6. Add shop/collection copy in `src/locales/en.js` and `src/locales/es.js`.
7. Extend `scripts/check.mjs` if the cheer needs a shape test.

## Positioning rules

- Each pop is a zero-size anchor at `ox` / `oy`. All bits offset from that
  anchor in **rem**, not screen %.
- One full-screen layer per cheer event at most (e.g. night veil). Mark it
  `screen: true` on the bit; render it on the cheer root, not inside the pop.
- Rain, bubbles, stars, tape, etc. spread wider at higher stages via
  `stageMul` and `burstLevel`. They should read as separate instances, not one
  blob stacked on the same point.

## Scaling rules

- Ring / streak / drop / bubble sizes: multiply base rem by `stageMul(stage)`.
- Tape reach: scale vw with stage (`reach` on the bit, `--reach` in CSS).
- Rain fall and bubble rise: pass `--fall` / `--rise` from the builder so
  higher stages travel farther.
- Every pop gets its own puddle / cluster / signature bits so each instance is
  visible at stage 5.

## Files

| Layer | Path |
|-------|------|
| Recipe | `src/lib/cheer-pops.js` |
| Fire event | `src/lib/purse.js` (`fireCheer`) |
| Did I tap | `src/lib/board-ops.js` |
| Web render | `src/lib/CheerBurst.jsx`, `src/lib/did-i.css` |
| Native render | `native/components/CheerBurst.jsx` |
| Preview taps | Shop, ShopCheers, Collection, native shop — always `preview: true` |
| Tests | `scripts/check.mjs` |

## Check before done

- Stage 1: one pop, centered-ish.
- Stage 5: five pops, edge spread, visibly larger than stage 1.
- Preview in shop shows all five instances.
- Did I tap shows the same five, staggered.
- `npm run check` passes.
