# Legal pages

Did I ships with in-app Privacy Policy (`#/privacy`) and Terms of Use
(`#/terms`). Copy is in `scripts/legal-i18n.mjs` (English and Spanish).

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

Edit `scripts/legal-i18n.mjs`, bump `legal.date` in en and es, then:

    node scripts/merge-i18n-additions.mjs
    npm run locales:sync

Other locales get English placeholders until translated.
