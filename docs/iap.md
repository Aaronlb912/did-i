# In-app purchases

Gems sell through Apple and Google only. Stripe is not used.

## Status

**In the repo:** pack ids, native purchase flow (`expo-iap`), receipt submit
(`gem-verify.js`), edge function (`gem-iap`), claim on sync (`gem-claim.js`).

**Not in the repo:** your store products, deployed function secrets, and a
real-device buy test. Production receipt verification runs when
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` and `APPLE_IAP_SHARED_SECRET` are set.
Until then, `GEM_IAP_TRUST=1` is for local dev only.

## App SKU (Apple only)

When you add the app in **App Store Connect**, use:

| Field | Value |
|-------|--------|
| **SKU** | `did-i` |
| **Bundle ID** | `com.aaronbryant.didi` |

Defined in `src/lib/store-skus.js` as `APP_STORE_SKU` and `STORE_APP_ID`. If you
already registered the app with a different SKU, keep that one in Connect; only
new registrations should use `did-i`.

Step-by-step in Connect (products, tiers, listing): `docs/app-store-connect.md`.

Google Play has no app SKU. Use package name `com.aaronbryant.didi`.

## Gem product ids (IAP SKUs)

| Pack | Store id |
|------|----------|
| 1 gem | `com.aaronbryant.didi.gems_1` |
| 3 gems | `com.aaronbryant.didi.gems_3` |
| 5 gems | `com.aaronbryant.didi.gems_5` |
| 10 gems | `com.aaronbryant.didi.gems_10` |
| 25 gems | `com.aaronbryant.didi.gems_25` |
| 50 gems | `com.aaronbryant.didi.gems_50` |

All are **consumable** in-app products.

## App code

| Piece | Where |
|-------|--------|
| Pack list + ids | `src/lib/gem-packs.js` |
| Purchase entry | `src/lib/gem-buy.js` |
| Native store | `native/iap/gem-store.js` (via `expo-iap`) |
| Receipt submit | `src/lib/gem-verify.js` |
| Claim on shelf | `src/lib/gem-claim.js` |

## Server

`supabase/functions/gem-iap` verifies the receipt (when secrets are set),
calls `record_gem_purchase`, and the phone claims gems with
`claim_gem_purchases` on sync.

## Before testing

1. Create products in App Store Connect and Google Play Console.
2. Deploy `gem-iap` and set store secrets (or `GEM_IAP_TRUST=1` locally).
3. `npx expo prebuild --clean` and run a dev build on a real device.
4. Sign in, open Shop → Gems, buy a test pack.
