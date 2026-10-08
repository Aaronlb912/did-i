// Shared rules for the locale report and the locale checks in npm test.


const PRODUCT_SAME = new Set([
  'nav.everyone',
  // "Did you · 3" and "Did we · 2": product names plus a count.
  'questions.didYouPill',
  'questions.didWePill',
  'we.title',
  'we.new',
  'we.did',
  'we.nope',
  'we.widgetMine',
  'we.more',
  'marks.section.we',
  'ach.looks.name',
  'ach.cheers.name',
  'lead.you',
  'help.we',
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
  'jewelKey.nope',
  'widget.tonight.nope',
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
  'pill.markedWhat',
  'people.namePh',
  'people.addPh',
  'people.newFamilyPh',
  'marks.ok',
  'cal.day',
  'tonight.purse',
  'title.home',
  'tags.general',
  'we.pAnswer',
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

/** Text that may match English on purpose (product terms, templates, brand names). */
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

// Keys whose text is still the English text, minus ones that may match on purpose.
export function englishLeft(pack, enPack) {
  return Object.keys(enPack).filter((key) => !mayMatchEnglish(key) && pack[key] === enPack[key])
}

const HAN = /[一-鿿]/g
const KANA = /[぀-ヿ]/
const HANGUL = /[가-힯]/

// Text written in the wrong language's script, like Chinese in the Japanese
// file. Returns why, or ''.
export function wrongScript(code, value, key = '') {
  // Language names are written in their own script on purpose.
  if (key.startsWith('lang.')) return ''
  const text = String(value)
  const han = (text.match(HAN) || []).length
  if (['es', 'fr', 'de', 'pt', 'it'].includes(code)) {
    return han || KANA.test(text) || HANGUL.test(text) ? 'has Chinese, Japanese or Korean text' : ''
  }
  if (code === 'ja') {
    if (HANGUL.test(text)) return 'has Korean text'
    // Short kanji-only phrases are normal Japanese; a long run with no kana is Chinese.
    if (han >= 10 && !KANA.test(text)) return 'looks like Chinese (no kana)'
    return ''
  }
  if (code === 'zh') return KANA.test(text) || HANGUL.test(text) ? 'has Japanese or Korean text' : ''
  if (code === 'ko') return han || KANA.test(text) ? 'has Chinese or Japanese text' : ''
  return ''
}
