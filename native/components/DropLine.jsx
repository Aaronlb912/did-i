import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { frameText } from '../../src/lib/frames.js'
import { buddyText, cheerText, freshDrop, lastFreeDay, lookText } from '../../src/lib/purse.js'
import { boardDate } from '../../src/lib/recurrence.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'

const SEEN_KEY = 'did-i-drop-seen'
// Dev builds only: set this key to a drop date to see the line early.
const TEST_KEY = 'did-i-drop-test'

function read(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function itemName({ type, item }) {
  const key =
    type === 'look' ? lookText(item.id, 'name')
      : type === 'cheer' ? cheerText(item.id, 'name')
      : type === 'frame' ? frameText(item.id, 'name')
      : buddyText(item.id, 'name')
  return t(key)
}

// A new drop on its first two days; otherwise a free item on its last claim day.
function pickDrop(book) {
  const today = (typeof __DEV__ !== 'undefined' && __DEV__ && read(TEST_KEY)) || boardDate(new Date())
  const drop = freshDrop(today, { frames: true })
  if (drop && drop.items.length) return { ...drop, key: 'home.dropLine' }
  const last = lastFreeDay(book, today)
  return last.length ? { date: 'last:' + today, items: last, key: 'home.dropLastDay' } : null
}

/** True when a drop line would show now. */
export function dropLineUp(book) {
  const drop = pickDrop(book)
  return Boolean(drop && read(SEEN_KEY) !== drop.date)
}

// One line on Home the day a shop drop goes live and the day after, or on a free item's last day.
export function DropLine({ colors, book }) {
  const drop = pickDrop(book)
  const [seen, setSeen] = useState(() => read(SEEN_KEY))
  if (!drop || !drop.items.length || seen === drop.date) return null
  const names = drop.items.slice(0, 3).map(itemName).join(', ')
  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, drop.date)
    } catch {
      // Hidden for this launch only.
    }
    setSeen(drop.date)
  }
  return (
    <View style={[styles.row, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
      <Pressable accessibilityRole="button" onPress={() => goHash('/shop')} style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}>
        <Text style={[styles.text, { color: colors.ink }]} numberOfLines={1}>
          {t(drop.key, { names })}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('home.dropHide')} onPress={close} hitSlop={10} style={styles.x}>
        <Text style={[styles.text, { color: colors.inkSoft }]}>×</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, minHeight: 36, marginBottom: 8, paddingLeft: 14 },
  hit: { flex: 1, paddingVertical: 8 },
  x: { paddingHorizontal: 14, paddingVertical: 8 },
  text: { fontFamily: fonts.uiSemi, fontSize: 14 },
})
