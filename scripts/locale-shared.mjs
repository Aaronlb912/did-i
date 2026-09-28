// Shared rules for locale report, missing export, and ship-locale checks.

export const SHIP_LOCALES = ['es']
export const PARTIAL_LOCALES = ['fr', 'de', 'pt', 'it', 'zh', 'ja', 'ko']

const PRODUCT_SAME = new Set([
  'nav.everyone',
  'welcome.plate',
  'tonight.didI',
  'tonight.swipeDid',
  'tonight.swipeNope',
  'tonight.answerDid',
  'tonight.answerNope',
  'stats.did',
  'stats.nope',
  'later.did',
  'later.nope',
  'hole.nopeKicker',
  'feed.status.did',
  'feed.status.nope',
  'famNight.do',
  'famNight.nope',
  'family.doIt',
  'family.nope',
  'family.what',
  'people.sendWhat',
  'people.no',
  'shop.looks',
  'shop.cheers',
  'shop.buddyPreviewTag',
  'account.cheer',
  'title.door',
  'title.shopLooks',
  'title.shopCheers',
  'push.channelName',
  'web.landing.kicker',
  'web.download.androidKicker',
  'web.download.android',
  'web.download.iphoneKicker',
  'web.download.iphone',
  'settings.legal',
  'help.legal',
  'legal.terms.dit.title',
  'site.door.title',
])

const TEMPLATE_SAME = new Set([
  'hang.am',
  'hang.pm',
  'hang.timeDaypart',
  'hang.priority.normal',
  'people.namePh',
  'people.addPh',
  'people.newFamilyPh',
  'marks.ok',
  'cal.day',
  'tonight.purse',
  'title.home',
])

export function isLegalKey(key) {
  return (
    key.startsWith('legal.') ||
    key === 'title.privacy' ||
    key === 'title.terms' ||
    key.startsWith('settings.privacy') ||
    key.startsWith('settings.terms') ||
    key.startsWith('settings.legal') ||
    key.startsWith('help.legal')
  )
}

/** Spanish may match English (product terms, templates, brand names). */
export function mayMatchEnglish(key) {
  if (key.startsWith('lang.')) return true
  if (/^cheer\.[a-z]+\.name$/.test(key)) return true
  if (/^look\.[a-z]+\.name$/.test(key)) return true
  if (key === 'site.into.code') return true
  if (/^web\.landing\.step\d\.num$/.test(key)) return true
  if (TEMPLATE_SAME.has(key)) return true
  if (PRODUCT_SAME.has(key)) return true
  if (/^ideas\.[a-z]+\.(question|start)$/.test(key)) return true
  return false
}

export function keysSameAsEn(pack, enPack, { skipLegal = true, shipOnly = false } = {}) {
  return Object.keys(enPack).filter((key) => {
    if (skipLegal && isLegalKey(key)) return false
    if (shipOnly && mayMatchEnglish(key)) return false
    return pack[key] === enPack[key]
  })
}
