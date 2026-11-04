import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { clockWords } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { usePrefs } from '../../src/lib/prefs.js'
import {
  REMIND_MAX,
  addRemind,
  readReminds,
  removeRemind,
  restoreRemind,
} from '../../src/lib/remind-me.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { AppTextInput, DidButton, KeyButton } from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { confirmDone, confirmMiss, once } from '../lib/confirm.js'
import { showToast } from '../lib/toast-queue.js'
import { goBack } from '../navigation/hash.js'
import { cancelRemind, checkNativePings, scheduleRemind } from '../shim/native.js'
import { fonts } from '../theme.js'
import { ScreenShell } from './more.jsx'
import { answerRemind } from '../lib/remind-answer.js'

const SPEECH_LANG = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  it: 'it-IT',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
}
const CHIPS = [
  { key: '20', minutes: 20, label: 'remind.min20' },
  { key: '40', minutes: 40, label: 'remind.min40' },
  { key: '60', minutes: 60, label: 'remind.hour1' },
  { key: 'custom', minutes: 0, label: 'remind.custom' },
]

function clockOf(at) {
  const date = new Date(at)
  const pad = (value) => String(value).padStart(2, '0')
  const time = clockWords(`${pad(date.getHours())}:${pad(date.getMinutes())}`)
  return date.toDateString() === new Date().toDateString() ? time : t('tonight.untilTomorrow', { time })
}

function Pulse({ colors, on, still }) {
  const grow = useSharedValue(0)
  useEffect(() => {
    if (!on || still) {
      grow.value = 0
      return undefined
    }
    grow.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }), -1, false)
    return () => {
      grow.value = 0
    }
  }, [on, still, grow])
  const ring = useAnimatedStyle(() => ({
    opacity: on ? 0.6 - grow.value * 0.6 : 0,
    transform: [{ scale: 1 + grow.value * 0.5 }],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { borderColor: colors.on }, on && still && styles.ringStill, ring]}
    />
  )
}

export function RemindScreen({ book, route }) {
  const colors = useHallColors(book)
  const prefs = usePrefs()
  const reduce = useReduceMotion()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [notHeard, setNotHeard] = useState(false)
  const [denied, setDenied] = useState(false)
  const [typing, setTyping] = useState(false)
  const [chip, setChip] = useState('20')
  const [custom, setCustom] = useState('')
  const [pending, setPending] = useState(readReminds)
  const [miss, setMiss] = useState('')
  const heard = useRef('')
  const waitPerm = useRef(false)
  const input = useRef(null)
  const stopTimer = useRef(null)
  const clearStop = () => {
    if (stopTimer.current) clearTimeout(stopTimer.current)
    stopTimer.current = null
  }
  const refresh = useCallback(() => setPending(readReminds()), [])

  const listen = useCallback(async () => {
    setNotHeard(false)
    setMiss('')
    try {
      const asked = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!asked.granted) {
        setDenied(true)
        setTyping(true)
        return
      }
      setDenied(false)
      heard.current = ''
      setText('')
      setListening(true)
      // If the recognizer never sends end or error, stop waiting.
      clearStop()
      stopTimer.current = setTimeout(() => {
        try {
          ExpoSpeechRecognitionModule.abort()
        } catch {
          // Nothing was listening.
        }
        setListening(false)
      }, 30000)
      ExpoSpeechRecognitionModule.start({ lang: SPEECH_LANG[prefs.locale] || 'en-US', interimResults: true })
    } catch {
      clearStop()
      setListening(false)
      setNotHeard(true)
    }
  }, [prefs.locale])

  useSpeechRecognitionEvent('result', (event) => {
    const said = event.results?.[0]?.transcript || ''
    if (said) {
      heard.current = said
      setText(said)
    }
  })
  useSpeechRecognitionEvent('end', () => {
  clearStop()
    setListening(false)
    if (!heard.current) setNotHeard(true)
  })
  useSpeechRecognitionEvent('error', (event) => {
  clearStop()
    setListening(false)
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      setDenied(true)
      setTyping(true)
    } else if (!heard.current) setNotHeard(true)
  })

  // The widget and the app shortcut open this screen already listening.
  const listenOnOpen = route?.listen === '1'
  // A second mic tap while this is open sets a new focusAt.
  const listenAt = route?.focusAt
  useEffect(() => {
    if (listenOnOpen) listen()
    return () => {
      clearStop()
      try {
        ExpoSpeechRecognitionModule.abort()
      } catch {
        // Nothing was listening.
      }
    }
  }, [listenOnOpen, listenAt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typing) input.current?.focus?.()
  }, [typing])

  const minutes = chip === 'custom' ? Number(custom) : CHIPS.find((item) => item.key === chip).minutes
  const minutesOk = Number.isInteger(minutes) && minutes >= 5 && minutes <= 720
  const full = pending.length >= REMIND_MAX
  const words = text.trim()
  const canSave = Boolean(words) && minutesOk && !full && !listening

  async function save() {
    setMiss('')
    await once('remind-save', async () => {
      const out = addRemind(words, minutes)
      if (out.miss) {
        setMiss(t(out.miss))
        return
      }
      const set = await scheduleRemind(out.item).catch(() => ({ miss: 'remind.notifOff' }))
      if (set?.miss) {
        removeRemind(out.item.id)
        refresh()
        waitPerm.current = true
        setMiss(t(set.miss))
        return
      }
      confirmDone(t('remind.saved', { time: clockOf(out.item.at) }))
      goBack()
    })
  }

  // The notification dialog can close after the first Save gave up. If it was
  // allowed, drop the error and save again.
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (next !== 'active' || !waitPerm.current) return
      if ((await checkNativePings().catch(() => '')) !== 'granted') return
      waitPerm.current = false
      setMiss('')
      saveRef.current()
    })
    return () => sub.remove()
  }, [])

  // A note that already rang: answer it here (tapping the note opens this screen).
  async function answer(item, action) {
    await once(`remind-answer:${item.id}`, () => answerRemind(item.id, action).catch(() => confirmMiss(t('confirm.miss'))))
    if (action === 'did') confirmDone(t('confirm.saved'))
    refresh()
  }

  function remove(item) {
    const gone = removeRemind(item.id)
    cancelRemind(item).catch(() => {})
    refresh()
    if (!gone) return
    const now = Date.now()
    showToast({
      id: 'undo:remind',
      kind: 'undo',
      rev: now,
      label: t('remind.removed'),
      hint: item.text,
      until: now + 8000,
      total: 8000,
      onPress: async () => {
        restoreRemind(gone)
        const set = await scheduleRemind(gone).catch(() => ({ miss: 'remind.notifOff' }))
        if (set?.miss) confirmMiss(t(set.miss))
        refresh()
      },
    })
  }

  const showText = Boolean(text) || typing || denied
  return (
    <ScreenShell book={book} title={t('remind.title')} colors={colors}>
      <View style={styles.mic}>
        <Pulse colors={colors} on={listening} still={reduce} />
        <Pressable
          onPress={listening ? () => ExpoSpeechRecognitionModule.stop() : listen}
          accessibilityRole="button"
          accessibilityLabel={listening ? t('remind.listening') : t('remind.mic')}
          style={[styles.micButton, { backgroundColor: listening ? colors.on : colors.panel2, borderColor: colors.on }]}
        >
          <View style={[styles.capsule, { backgroundColor: listening ? colors.bg : colors.on }]} />
          <View style={[styles.stand, { borderColor: listening ? colors.bg : colors.on }]} />
        </Pressable>
      </View>
      <Text style={[styles.say, { color: colors.ink }]} accessibilityLiveRegion="polite">
        {listening ? t('remind.listening') : denied ? t('remind.micOff') : notHeard ? t('remind.notHeard') : text ? '' : t('remind.say')}
      </Text>

      {notHeard && !listening ? (
        <View style={styles.stack}>
          <DidButton colors={colors} label={t('remind.again')} onPress={listen} />
          {typing ? null : <KeyButton colors={colors} label={t('remind.type')} onPress={() => setTyping(true)} />}
        </View>
      ) : null}

      {showText ? (
        <AppTextInput
          ref={input}
          colors={colors}
          value={text}
          onChangeText={(value) => {
            heard.current = value
            setText(value)
          }}
          placeholder={t('remind.say')}
          maxLength={120}
          returnKeyType="done"
          blurOnSubmit
          accessibilityLabel={t('remind.say')}
          style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg }]}
        />
      ) : null}

      <View style={styles.chips}>
        {CHIPS.map((item) => (
          <View key={item.key} style={styles.chip}>
            <KeyButton colors={colors} label={t(item.label)} picked={chip === item.key} onPress={() => setChip(item.key)} />
          </View>
        ))}
      </View>
      {chip === 'custom' ? (
        <AppTextInput
          colors={colors}
          value={custom}
          onChangeText={(value) => setCustom(value.replace(/\D/g, '').slice(0, 3))}
          placeholder={t('remind.minutes')}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel={t('remind.minutes')}
          style={[styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg }]}
        />
      ) : null}

      {chip === 'custom' && custom && !minutesOk ? <Text style={[styles.note, { color: colors.inkSoft }]}>{t('remind.minutesRange')}</Text> : null}
      {full ? <Text style={[styles.note, { color: colors.inkSoft }]}>{t('remind.full')}</Text> : null}
      {miss ? <Text style={[styles.note, { color: colors.miss }]}>{miss}</Text> : null}
      {miss === t('remind.notifOff') ? (
        <KeyButton colors={colors} label={t('pings.openSettings')} onPress={() => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss')))} />
      ) : null}
      <DidButton colors={colors} label={t('remind.save')} onPress={save} disabled={!canSave} />

      <Text style={[styles.head, { color: colors.inkSoft }]} accessibilityRole="header">
        {t('remind.pending')}
      </Text>
      {pending.length ? (
        pending.map((item) => (
          <View key={item.id} style={[styles.row, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
            <Text style={[styles.rowText, { color: colors.ink }]}>{item.text}</Text>
            <Text style={[styles.rowTime, { color: colors.inkSoft }]}>{clockOf(item.at)}</Text>
            {item.at <= Date.now() ? (
              <>
                <KeyButton colors={colors} label={t('widget.tonight.nope')} accessibilityLabel={`${t('widget.tonight.nope')}: ${item.text}`} onPress={() => answer(item, 'nope')} />
                <KeyButton colors={colors} label={t('widget.tonight.did')} accessibilityLabel={`${t('widget.tonight.did')}: ${item.text}`} onPress={() => answer(item, 'did')} />
              </>
            ) : null}
            <KeyButton colors={colors} label={t('remind.remove')} accessibilityLabel={`${t('remind.remove')}: ${item.text}`} onPress={() => remove(item)} />
          </View>
        ))
      ) : (
        <Text style={[styles.note, { color: colors.inkSoft }]}>{t('remind.empty')}</Text>
      )}
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  mic: { alignItems: 'center', justifyContent: 'center', height: 150, marginTop: 8 },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 3 },
  ringStill: { opacity: 0.5 },
  micButton: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  capsule: { width: 22, height: 36, borderRadius: 11 },
  stand: { width: 38, height: 18, borderBottomLeftRadius: 19, borderBottomRightRadius: 19, borderWidth: 3, borderTopWidth: 0, marginTop: -6 },
  say: { fontFamily: fonts.uiSemi, fontSize: 17, textAlign: 'center', marginBottom: 12, minHeight: 24 },
  stack: { gap: 8, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.ui, fontSize: 17, minHeight: 48, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { minWidth: '45%', flexGrow: 1 },
  note: { fontFamily: fonts.ui, fontSize: 15, marginBottom: 12 },
  head: { fontFamily: fonts.uiBold, fontSize: 14, marginTop: 24, marginBottom: 8 },
  row: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8, marginBottom: 8 },
  rowText: { fontFamily: fonts.uiSemi, fontSize: 16 },
  rowTime: { fontFamily: fonts.ui, fontSize: 14 },
})
