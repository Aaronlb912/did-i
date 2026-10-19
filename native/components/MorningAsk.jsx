import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { MORNING_CAP } from '../../src/lib/morning-ask.js'
import { AppTextInput, DidButton, KeyButton } from './ui.jsx'
import { HangTimePick } from './HangTimePick.jsx'
import { fonts } from '../theme.js'

// The morning card on Tonight: type a question for today, Add, repeat.
// An optional time reminds today, like any question's time.
// onAdd(text, at) returns '' when added, or an error key to show.
export function MorningAsk({ colors, count, focus, onAdd, onOff }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [at, setAt] = useState('')
  const field = useRef(null)
  useEffect(() => {
    if (!focus) return undefined
    const timer = setTimeout(() => field.current?.focus?.(), 300)
    return () => clearTimeout(timer)
  }, [focus])
  const full = count >= MORNING_CAP
  const add = () => {
    if (!text.trim()) return
    const miss = onAdd(text, at)
    setError(miss)
    if (!miss) {
      setText('')
      setAt('')
    }
  }
  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{t('morning.title')}</Text>
      {full ? (
        <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('morning.full', { n: MORNING_CAP })}</Text>
      ) : (
        <AppTextInput
          ref={field}
          colors={colors}
          value={text}
          onChangeText={(next) => {
            setText(next)
            if (error) setError('')
          }}
          onSubmitEditing={add}
          submitBehavior="submit"
          returnKeyType="done"
          maxLength={200}
          placeholder={t('morning.placeholder')}
          accessibilityLabel={t('morning.title')}
          style={[styles.field, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.panel2 }]}
        />
      )}
      {full ? null : (
        <HangTimePick
          value={at}
          onChange={(next) => {
            setAt(next)
            if (error) setError('')
          }}
          colors={colors}
        />
      )}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.meta, { color: colors.ink }]}>
          {t(`morning.${error}`)}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {full ? null : <DidButton small label={t('morning.add')} colors={colors} onPress={add} disabled={!text.trim()} />}
        <KeyButton label={t('morning.off')} colors={colors} onPress={onOff} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginHorizontal: 16, marginBottom: 8 },
  title: { fontFamily: fonts.uiSemi, fontSize: 16 },
  meta: { fontFamily: fonts.ui, fontSize: 14 },
  field: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.ui, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
})
