import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { confirmDone } from '../lib/confirm.js'
import { hangStarter, unusedStarters } from '../../src/lib/starters.js'
import { KeyButton } from './ui.jsx'
import { fonts } from '../theme.js'

export function StarterPicks({ book, onChange, now, colors, label, readyNow = false }) {
  const clock = now || new Date()
  const open = unusedStarters(book, clock, readyNow)
  if (!open.length || !onChange) return null

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.inkDim }]}>{label || t('first.picks')}</Text>
      <View style={styles.row}>
        {open.map((starter) => (
          <KeyButton
            key={starter.short}
            label={starter.short}
            colors={colors}
            onPress={() => {
              onChange(hangStarter(book, starter, clock, readyNow))
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
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
