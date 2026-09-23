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
