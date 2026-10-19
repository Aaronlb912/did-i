// Two small explainer sheets: why a night did or did not clear, and how
// coins work. Both use SheetHost.
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { coinNightLine, coinNights, gemThisWeek, mergeCoinNights } from '../../src/lib/coin-history.js'
import { COIN_RULES, nightWhyLines } from '../../src/lib/night-why.js'
import { nightWhy } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { SHELF_IN } from '../../src/lib/cloud-sync.js'
import { accountSessionOn } from '../../src/lib/session-id.js'
import { readCoinHistory } from '../../src/lib/wallet.js'
import { goHash, readHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { publishSheet } from './SheetHost.jsx'

export function openNightWhy({ colors, boards, iso, now = new Date(), tagId = '', onCalendar }) {
  const why = nightWhy(boards, iso, now, tagId)
  const close = () => publishSheet(null)
  publishSheet({
    kicker: t('why.kicker'),
    title: formatBoardDate(iso),
    body: nightWhyLines(why).join('\n'),
    closeLabel: t('cal.close'),
    colors,
    onClose: close,
    ...(onCalendar
      ? {
          onMore: () => {
            close()
            onCalendar()
          },
          moreLabel: t('why.calendar'),
        }
      : {}),
  })
}

function CoinHistory({ colors }) {
  const shelf = readShelf()
  const fold = shelf?.boards?.[0]?.dayFoldHour ?? 0
  const [server, setServer] = useState(null)
  const [serverMiss, setServerMiss] = useState(false)
  const [, setTick] = useState(0)

  // Signed in, the server's record is the real one. Keep the local one if it fails.
  useEffect(() => {
    if (!accountSessionOn()) return undefined
    let live = true
    readCoinHistory()
      .then((next) => {
        if (!live) return
        if (next) setServer(next)
        else setServerMiss(true)
      })
      .catch(() => {
        if (live) setServerMiss(true)
      })
    return () => {
      live = false
    }
  }, [])

  // Right after a cold start the shelf can still be loading: recount when it lands.
  useEffect(() => {
    const onShelf = () => setTick((n) => n + 1)
    window.addEventListener?.(SHELF_IN, onShelf)
    return () => window.removeEventListener?.(SHELF_IN, onShelf)
  }, [])

  const local = coinNights(shelf)
  const today = boardDate(new Date(), fold)
  const hist = server
    ? { nights: mergeCoinNights(local, server.nights, today), gemWeek: server.gemWeek }
    : { nights: local, gemWeek: shelf?.gemWeek || '' }

  const ink = { color: colors.inkSoft }
  return (
    <View style={styles.hist}>
      <Text style={[styles.head, { color: colors.ink }]}>{t('coins.recent')}</Text>
      {hist.nights.length ? (
        hist.nights.map((row) => (
          <Text key={row.night} style={[styles.line, ink]}>
            {coinNightLine(row, formatBoardDate(row.night))}
          </Text>
        ))
      ) : (
        <Text style={[styles.line, ink]}>{t('coins.none')}</Text>
      )}
      {serverMiss && !server ? <Text style={[styles.line, ink]}>{t('coins.localOnly')}</Text> : null}
      <Text style={[styles.line, ink]}>{gemThisWeek(hist.gemWeek, new Date(), fold) ? t('coins.gemYes') : t('coins.gemNot')}</Text>
    </View>
  )
}

// back: opened from a shop item. No Shop button (you are there), and
// Close goes back to that item.
// Anywhere in the Shop (hub or an All page), a Shop button would go nowhere.
function inShop() {
  const path = String(readHash() || '')
  return path === '/shop' || path.startsWith('/shop/')
}

export function openCoinsHow(colors, back) {
  const close = () => publishSheet(null)
  publishSheet({
    title: t('coins.howTitle'),
    body: COIN_RULES.map((key) => t(key)).join('\n'),
    content: <CoinHistory colors={colors} />,
    ...(back || inShop()
      ? {}
      : {
          goLabel: t('shop.title'),
          onGo: () => {
            close()
            goHash('/shop')
          },
        }),
    closeLabel: t('cal.close'),
    colors,
    onClose: back || close,
  })
}

const styles = StyleSheet.create({
  hist: { gap: 4 },
  head: { fontFamily: fonts.uiSemi, fontSize: 14, marginBottom: 2 },
  line: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
})
