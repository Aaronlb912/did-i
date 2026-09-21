# Locales

Ship quality is **English + Spanish**. Other languages fall back to English for missing strings.

## Add or change copy

1. Add keys to `scripts/i18n-additions.mjs` (`additionsEn` and `additionsEs` in the same edit).
2. `npm run locales:merge` — updates `en.js`, `es.js`, and seeds `scripts/locale-gaps/*.json` for partial locales.
3. For fr/de/pt/it/zh/ja/ko: translate only what you need in `scripts/locale-gaps/{lang}.json`, or export a batch with `npm run locales:missing -- --export fr`.
4. `npm run locales:sync` — merges gaps into `src/locales/{lang}.js`.

Optional: drop a batch file at `scripts/locale-pass/{lang}.mjs` (`export const pass = { ... }`) and run `npm run locales:apply-pass -- fr` (skips `legal.*` unless you pass `--legal`).

## Check

- `npm run locales:report` — counts keys still identical to English.
- `npm run locales:missing` — lists what still needs work; `--export` writes `scripts/.pass-{lang}.json`.
- `npm test` — fails if Spanish matches English on keys that are not product terms or templates.

## Legal

`legal.*` lives in `scripts/legal-i18n.mjs` for en/es. Other locales keep English until a lawyer signs off. Use `npm run locales:apply-pass -- fr --legal` only after review.

## Partial locales

English fallback is fine off the main path. Prioritize nav, Tonight, Add, Settings, Shop doors, and errors.
