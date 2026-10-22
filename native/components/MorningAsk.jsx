import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { MORNING_CAP } from '../../src/lib/morning-ask.js'
import { AppTextInput, DidButton } from './ui.jsx'
import { HangTimePick } from './HangTimePick.jsx'
import { fonts } from '../theme.js'

// The morning ask's body, inside a sheet on Tonight: type a question for
// today, Add, repeat. An optional time reminds today, like any question's time.
// onAdd(text, at) returns '' when added, or an error key to show.
export function MorningAsk({ colors, count, focus, onAdd }) {
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
  if (full) return <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('morning.full', { n: MORNING_CAP })}</Text>
  return (
    <View style={styles.body}>
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
      <HangTimePick
        value={at}
        onChange={(next) => {
          setAt(next)
          if (error) setError('')
        }}
        colors={colors}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.meta, { color: colors.ink }]}>
          {t(`morning.${error}`)}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <DidButton small label={t('morning.add')} colors={colors} onPress={add} disabled={!text.trim()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingTop: 2 },
  meta: { fontFamily: fonts.ui, fontSize: 14 },
  field: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.ui, fontSize: 17 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
})
