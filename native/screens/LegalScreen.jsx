import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../src/lib/LegalArticle.jsx'
import { legalVars } from '../../src/lib/legal.js'
import { t } from '../../src/lib/i18n.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'

function Section({ kind, id, vars, colors }) {
  const body = String(t(`legal.${kind}.${id}.body`, vars) || '')
  return (
    <View style={styles.block}>
      <Text style={[styles.h2, { color: colors.ink }]}>{t(`legal.${kind}.${id}.title`)}</Text>
      {body.split('\n\n').filter(Boolean).map((chunk, index) => (
        <Text key={index} style={[styles.p, { color: colors.inkSoft }]}>
          {chunk}
        </Text>
      ))}
    </View>
  )
}

export function LegalScreen({ kind }) {
  const insets = useSafeAreaInsets()
  const colors = useHallColors()
  const sections = kind === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS
  const vars = { ...legalVars(), date: t('legal.date') }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
    >
      <Text style={[styles.kicker, { color: colors.on }]}>{t(`legal.${kind}.kicker`)}</Text>
      <Text style={[styles.title, { color: colors.ink }]}>{t(`legal.${kind}.title`)}</Text>
      <Text style={[styles.note, { color: colors.inkDim }]}>{t('legal.effective', vars)}</Text>
      <Text style={[styles.note, { color: colors.inkDim }]}>{t('legal.notLawyer')}</Text>
      {sections.map((id) => (
        <Section key={id} kind={kind} id={id} vars={vars} colors={colors} />
      ))}
      <Text onPress={() => goHash('/settings')} style={[styles.link, { color: colors.on }]}>
        {t('legal.backSettings')}
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 28, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  note: { fontFamily: fonts.ui, fontSize: 13, marginBottom: 6 },
  block: { marginTop: 20, gap: 8 },
  h2: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700' },
  p: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  link: { marginTop: 28, fontFamily: fonts.ui, fontSize: 15, fontWeight: '600' },
})
