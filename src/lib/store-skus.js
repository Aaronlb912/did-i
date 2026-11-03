/**
 * Store identifiers for Did I. Paste APP_STORE_SKU into App Store Connect when
 * you register the app (one time; Apple does not let you change it later).
 *
 * Google Play has no separate app SKU; use PLAY_PACKAGE as the application id.
 * In-app gem packs use gemProductSku() — same strings in both consoles.
 */

/** App Store Connect → New App → SKU */
export const APP_STORE_SKU = 'did-i'

/** iOS bundle id and Android application id (must match app.json / native build). */
export const STORE_APP_ID = 'com.aaronbryant.didi'

export const PLAY_PACKAGE = STORE_APP_ID

/** @param {string} packId e.g. gems_1 */
export function gemProductSku(packId) {
  const id = String(packId || '').trim()
  if (!id) return ''
  return `${STORE_APP_ID}.${id}`
}

/** Public store pages. They only load once each store has approved the app. */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6814688066'
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`
/** Opens the App Store straight on the write-a-review sheet. Play has no such link, so it uses the page. */
export const APP_STORE_REVIEW_URL = `${APP_STORE_URL}?action=write-review`

/** App Store Connect provider token. With ct=, installs show under Analytics, Campaigns. */
export const APP_STORE_PROVIDER_TOKEN = '129488388'

/** App Store link tagged with a campaign (Apple allows 40 characters). No campaign gives the plain link. */
export function appStoreCampaignUrl(campaign) {
  const ct = String(campaign || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40)
  if (!ct) return APP_STORE_URL
  return `${APP_STORE_URL}?pt=${APP_STORE_PROVIDER_TOKEN}&ct=${ct}&mt=8`
}
