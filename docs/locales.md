# Locales

Nine files in `src/locales/`: en, es, fr, de, pt, it, zh, ja, ko. **They are the
only source.** There is no merge or sync step; edit the files directly.

## Add or change copy

1. Add the key to `src/locales/en.js`.
2. Add it to the other 8 files in the same change, translated.
3. `npm test`.

Product names can stay English on purpose (Did I, Did we, Look, Cheer, Buddy, coins, gems, Shop
in zh/ja/ko, and the like). Add those keys to `PRODUCT_SAME` in
`scripts/locale-shared.mjs` so the checks allow them.

## What npm test checks

- Every file has exactly the English keys, none empty.
- Spanish has nothing left in English.
- No **new** string is left in English in the other languages. Older ones
  still in English are listed in `scripts/locale-english.json`. That list only
  shrinks: after translating some, run `npm run locales:report -- --save`.
- Each file is in its own script: no Chinese in the Japanese file, no Korean
  or kanji in Korean, no CJK in the European files.

## See what is left

- `npm run locales:report` counts strings still in English per language.
- `npm run locales:report -- -v` lists them.

## Legal

The Privacy Policy and Terms are translated in all 9 files, like everything
else. When a page is not in English it shows `legal.translated`: the English
version applies if they differ. See `docs/legal.md`.
