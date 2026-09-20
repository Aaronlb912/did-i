import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { DIT_ENABLED } from '../../src/lib/features.js'
import { t } from '../../src/lib/i18n.js'
import { answerFamilyLamp, useFamilyTonight } from '../../src/lib/people.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'

export function FamilyTonight({ colors }) {
  const account = useAccount()
  const { rows, reload } = useFamilyTonight(account.user)
  const [busy, setBusy] = useState('')
  const [miss, setMiss] = useState('')

  if (!DIT_ENABLED || !rows.length) return null

  const open = rows.filter((row) => !row.answer)
  const families = [...new Map(rows.map((row) => [row.family.id, row.family])).values()]

  async function tap(row, status) {
    setBusy(row.lamp.id)
    const { miss: why } = await answerFamilyLamp(row.family.id, row.lamp.id, row.night, status)
    setBusy('')
    if (why) {
      setMiss(t('famNight.offline'))
      return
    }
    setMiss('')
    reload()
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: colors.ink }]}>
          {open.length ? t('famNight.left', { n: open.length }) : t('famNight.clear')}
        </Text>
        <View style={styles.familyBtns}>
          {families.map((family) => (
            <KeyButton
              key={family.id}
              colors={colors}
              label={family.name}
              onPress={() => goHash('/family', { id: family.id })}
            />
          ))}
        </View>
      </View>
      {rows.map((row) => {
        const done = row.answer && row.answer.status !== 'skip'
        return (
          <View key={row.lamp.id} style={[styles.row, { borderTopColor: colors.line }]}>
            <View style={styles.copy}>
              <Text style={[styles.question, { color: colors.ink }]}>{row.lamp.question}</Text>
              <Text style={[styles.family, { color: colors.inkDim }]}>{row.family.name}</Text>
            </View>
            <DidButton
              colors={colors}
              small
              label={done ? t('famNight.did') : t('famNight.do')}
              disabled={busy === row.lamp.id}
              onPress={() => tap(row, 'yes')}
            />
            <KeyButton
              colors={colors}
              label={t('famNight.nope')}
              onPress={() => tap(row, 'skip')}
            />
          </View>
        )
      })}
      {miss ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
          {miss}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  head: { padding: 12, gap: 8 },
  label: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '600' },
  familyBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  copy: { flex: 1, minWidth: 120, gap: 2 },
  question: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '600' },
  family: { fontFamily: fonts.ui, fontSize: 12 },
  miss: { fontFamily: fonts.ui, fontSize: 13, padding: 12 },
})
