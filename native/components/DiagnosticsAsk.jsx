import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { needsDiagnosticsAsk, setDiagnosticsAnswer } from '../../src/lib/diagnostics.js'
import { t } from '../../src/lib/i18n.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { fonts } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'

export function DiagnosticsAsk() {
  const colors = useHallColors('lime', 'dark')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (needsDiagnosticsAsk()) setOpen(true)
  }, [])

  if (!open) return null

  function answer(yes) {
    setDiagnosticsAnswer(yes)
    setOpen(false)
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => answer(false)}>
      <Pressable
        accessible={false}
        style={[styles.veil, { backgroundColor: colors.veil }]}
        onPress={() => answer(false)}
      >
        <Pressable
          accessible={false}
          style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.kicker, { color: colors.on }]}>{t('diagnostics.kicker')}</Text>
          <Text style={[styles.title, { color: colors.ink }]}>{t('diagnostics.title')}</Text>
          <Text style={[styles.body, { color: colors.inkSoft }]}>{t('diagnostics.body')}</Text>
          <View style={styles.row}>
            <DidButton small label={t('diagnostics.yes')} onPress={() => answer(true)} colors={colors} />
            <KeyButton label={t('diagnostics.no')} onPress={() => answer(false)} colors={colors} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 22, gap: 10 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: '700' },
  body: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
})
