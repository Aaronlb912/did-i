import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { leftoverOn } from '../../src/lib/tags.js'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

export function TagFilter({ boards, tagId, onTag, now, colors }) {
  const [open, setOpen] = useState(false)
  const live = (boards || []).filter((book) => !book.archived)
  useEffect(() => {
    setOpen(false)
  }, [tagId])
  if (live.length < 2) return null

  const clock = now || new Date()
  const allLeft = leftoverOn(live, clock, '')
  const picked = tagId ? live.find((book) => book.id === tagId) : null
  const label = picked ? picked.title : t('tags.all')
  const count = picked ? leftoverOn(live, clock, picked.id) : allLeft

  function pick(id) {
    setOpen(false)
    onTag(id)
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
      <Pressable
        onPress={() => setOpen((live) => !live)}
        style={[styles.pick, { backgroundColor: colors.panel2, borderColor: tagId ? colors.onDeep : colors.line }]}
      >
        <Text style={[styles.bars, { color: tagId ? colors.on : colors.ink }]}>≡</Text>
        <Text style={[styles.name, { color: tagId ? colors.on : colors.ink }]} numberOfLines={1}>
          {label}
        </Text>
        {count ? <Text style={[styles.count, { color: colors.on }]}>{count}</Text> : null}
      </Pressable>
      {tagId ? (
        <Pressable
          onPress={() => pick('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('tags.clear')}
          style={[styles.clear, { backgroundColor: colors.panel2, borderColor: colors.line }]}
        >
          <Text style={[styles.clearText, { color: colors.ink }]}>×</Text>
        </Pressable>
      ) : null}
      </View>
      {open ? (
          <View style={[styles.menu, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
            <Pressable style={styles.row} onPress={() => pick('')}>
              <Text style={{ color: !tagId ? colors.on : colors.ink }}>{t('tags.all')}</Text>
              {allLeft ? <Text style={{ color: colors.on }}>{allLeft}</Text> : null}
            </Pressable>
            {live.map((book) => {
              const left = leftoverOn(live, clock, book.id)
              const on = tagId === book.id
              return (
                <Pressable key={book.id} style={styles.row} onPress={() => pick(book.id)}>
                  <Text style={{ color: on ? colors.on : colors.ink }} numberOfLines={1}>
                    {book.title}
                  </Text>
                  {left ? <Text style={{ color: colors.on }}>{left}</Text> : null}
                </Pressable>
              )
            })}
          </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8, alignSelf: 'flex-start', zIndex: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontFamily: fonts.ui, fontSize: 18, lineHeight: 20 },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 32,
    maxWidth: '100%',
  },
  bars: { fontFamily: fonts.mono, fontSize: 14 },
  name: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', flexShrink: 1 },
  count: { fontFamily: fonts.mono, fontSize: 11 },
  menu: { marginTop: 6, borderWidth: 1, borderRadius: 12, padding: 6, gap: 2, minWidth: 180 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, gap: 12 },
})
