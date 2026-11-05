import { useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { confirmDone } from '../lib/confirm.js'
import { hangStarter, unusedStarters } from '../../src/lib/starters.js'
import { KeyButton } from './ui.jsx'
import { fonts } from '../theme.js'

export function StarterPicks({ book, onChange, now, colors, label, readyNow = false }) {
  const clock = now || new Date()
  // Two quick picks land before the new book comes back as a prop; build the
  // second on the first so neither is lost.
  const last = useRef({ from: null, next: null })
  const base = () => (last.current.from === book ? last.current.next : book)
  const open = unusedStarters(book, clock, readyNow)
  if (!open.length || !onChange) return null

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{label || t('first.picks')}</Text>
      <View style={styles.row}>
        {open.map((starter) => (
          <KeyButton
            key={starter.short}
            label={starter.short}
            accessibilityLabel={t('first.pickHint', { name: starter.short })}
            colors={colors}
            onPress={() => {
              const from = base()
              // A double tap on the same pick adds it once.
              if (!unusedStarters(from, clock, readyNow).some((item) => item.short === starter.short)) return
              const next = hangStarter(from, starter, clock, readyNow)
              last.current = { from: book, next }
              onChange(next)
              confirmDone(t('confirm.questionAdded'))
            }}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 12, marginBottom: 4 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
