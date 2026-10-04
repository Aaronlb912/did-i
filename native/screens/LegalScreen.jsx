import { useEffect } from 'react'
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../src/lib/legal-sections.js'
import { legalVars } from '../../src/lib/legal.js'
import { inEnglish, t } from '../../src/lib/i18n.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { DidButton, KeyButton, Meta } from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { goBack, goHash } from '../navigation/hash.js'
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

export function LegalScreen({ kind, book }) {
  const colors = useHallColors(book)
  const sections = kind === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS
  const vars = { ...legalVars(), date: t('legal.date') }
  const otherPath = kind === 'privacy' ? '/terms' : '/privacy'
  const otherLabelKey = kind === 'privacy' ? 'legal.termsShort' : 'legal.privacyShort'

  return (
    <BoardShell
      book={book}
      title={t(`legal.${kind}.title`)}
      date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))}
      colors={colors}
      back
      showCogs={false}
    >
      <Meta colors={colors}>{t('legal.effective', vars)}</Meta>
      <Meta colors={colors}>{t('legal.notLawyer')}</Meta>
      {inEnglish() ? null : <Meta colors={colors}>{t('legal.translated')}</Meta>}
      {sections.map((id) => (
        <Section key={id} kind={kind} id={id} vars={vars} colors={colors} />
      ))}
      <View style={styles.actions}>
        <DidButton colors={colors} label={t('nav.back')} small onPress={() => goBack()} />
        <KeyButton colors={colors} label={t(otherLabelKey)} onPress={() => goHash(otherPath)} />
      </View>
    </BoardShell>
  )
}

// Before sign-in there is no navigator, so the terms open here, plain, with
// Back (and the phone's back) returning to sign-in.
export function LegalPlain({ kind, colors, onBack }) {
  const insets = useSafeAreaInsets()
  const sections = kind === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS
  const vars = { ...legalVars(), date: t('legal.date') }
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack()
      return true
    })
    return () => sub.remove()
  }, [onBack])
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
    >
      <View style={styles.actions}>
        <KeyButton colors={colors} label={t('nav.back')} onPress={onBack} />
      </View>
      <Text style={[styles.title, { color: colors.ink }]}>{t(`legal.${kind}.title`)}</Text>
      <Meta colors={colors}>{t('legal.effective', vars)}</Meta>
      <Meta colors={colors}>{t('legal.notLawyer')}</Meta>
      {inEnglish() ? null : <Meta colors={colors}>{t('legal.translated')}</Meta>}
      {sections.map((id) => (
        <Section key={id} kind={kind} id={id} vars={vars} colors={colors} />
      ))}
      <View style={styles.actions}>
        <DidButton colors={colors} label={t('nav.back')} small onPress={onBack} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 30, fontWeight: '700', marginTop: 16, marginBottom: 4 },
  block: { marginTop: 20, gap: 8 },
  h2: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700' },
  p: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 28 },
})
