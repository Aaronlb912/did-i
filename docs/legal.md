# Legal pages

Did I ships with in-app Privacy Policy (`#/privacy`) and Terms of Use
(`#/terms`). Copy is in the `legal.*` keys of `src/locales/*.js`, in all 9
languages. Sections are listed in `src/lib/legal-sections.js`.

## Before you open to the public

1. Set `VITE_LEGAL_EMAIL=support@did-i.app` in `.env.local` and on Vercel.
   Privacy requests and store listings use this address.

2. Have a lawyer in your state review the text. The app includes plain
   disclosures, not legal advice. Laws differ by country and state.

3. For Google Play and the website, use clean URLs on did-i.app:
   `https://did-i.app/privacy` and `https://did-i.app/terms`

4. App Store Connect and Google Play should link to the same terms URL
   in each store listing.

## What the documents cover

- Local-only use vs signed-in sync (Supabase)
- Friends, family, sends, blocks, reports
- Phone numbers for finding friends (needed to add friends, one per account, who can see it)
- Push tokens (Firebase)
- Gem purchases (App Store / Google Play)
- Not a medical device / not for emergencies
- Age 13+ and family kid role
- Export, delete account, CCPA/GDPR-style requests by email
- AS IS warranty and liability cap

## Updating copy

Edit the `legal.*` keys in `src/locales/en.js` and bump `legal.date`. Make the
same change in the other 8 files; `npm test` fails if a new or changed key is
left in English.

Translated pages show `legal.translated` (the English version applies if they
differ), so the English text is the one a lawyer needs to review.
