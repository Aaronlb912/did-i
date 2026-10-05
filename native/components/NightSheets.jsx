// Two small explainer sheets: why a night did or did not clear, and how
// coins work. Both use SheetHost.
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { coinNightLine, coinNights, gemThisWeek, mergeCoinNights } from '../../src/lib/coin-history.js'
import { COIN_RULES, nightWhyLines } from '../../src/lib/night-why.js'
import { nightWhy } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { accountSessionOn } from '../../src/lib/session-id.js'
import { readCoinHistory } from '../../src/lib/wallet.js'
import { goHash } from '../navigation/hash.js'
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
  const [hist, setHist] = useState(() => ({ nights: coinNights(shelf), gemWeek: shelf?.gemWeek || '' }))

  // Signed in, the server's record is the real one. Keep the local one if it fails.
  useEffect(() => {
    if (!accountSessionOn()) return undefined
    let live = true
    readCoinHistory()
      .then((next) => {
        if (live && next) setHist({ nights: mergeCoinNights(coinNights(readShelf()), next.nights), gemWeek: next.gemWeek })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

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
      <Text style={[styles.line, ink]}>{gemThisWeek(hist.gemWeek, new Date(), fold) ? t('coins.gemYes') : t('coins.gemNot')}</Text>
    </View>
  )
}

export function openCoinsHow(colors) {
  const close = () => publishSheet(null)
  publishSheet({
    title: t('coins.howTitle'),
    body: COIN_RULES.map((key) => t(key)).join('\n'),
    content: <CoinHistory colors={colors} />,
    goLabel: t('shop.title'),
    closeLabel: t('cal.close'),
    colors,
    onClose: close,
    onGo: () => {
      close()
      goHash('/shop')
    },
  })
}

const styles = StyleSheet.create({
  hist: { gap: 4 },
  head: { fontFamily: fonts.uiSemi, fontSize: 14, marginBottom: 2 },
  line: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
})
