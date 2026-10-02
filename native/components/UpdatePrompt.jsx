import { useEffect, useState } from 'react'
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Application from 'expo-application'
import { readAppVersion, updateState, UPDATE_SNOOZE_MS } from '../../src/lib/app-update.js'
import { t } from '../../src/lib/i18n.js'
import { feelTap } from '../../src/lib/native.js'
import { APP_STORE_URL, PLAY_STORE_URL } from '../../src/lib/store-skus.js'
import { HALL_PATHS } from '../navigation/hash.js'
import { useHeaderBottom } from '../hooks/useHeaderSpace.js'
import { headerLift } from './HeaderButton.jsx'
import { fonts } from '../theme.js'

const SNOOZE_KEY = 'did-i-update-snooze'
const CHECK_EVERY_MS = 60 * 60 * 1000

function snoozedUntil() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY)) || 0
  } catch {
    return 0
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + UPDATE_SNOOZE_MS))
  } catch {
    // ok
  }
}

function openStore() {
  feelTap()
  Linking.openURL(Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL).catch(() => {})
}

// Asks the store row on open and when the app comes back, at most hourly.
function useUpdateState() {
  const [state, setState] = useState('')
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return undefined
    const current = Application.nativeApplicationVersion || ''
    if (!current) return undefined
    let last = 0
    let alive = true
    const check = () => {
      if (Date.now() - last < CHECK_EVERY_MS) return
      last = Date.now()
      readAppVersion(Platform.OS)
        .then((row) => {
          if (alive && row) setState(updateState(current, row))
        })
        .catch(() => {})
    }
    check()
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check()
    })
    return () => {
      alive = false
      sub.remove()
    }
  }, [])
  return state
}

// "A new version is out" on Tonight, until "Not now" (back in a day). Below
// the minimum version the whole app is covered instead, with no way past.
export function UpdatePrompt({ path, colors }) {
  const state = useUpdateState()
  const top = useHeaderBottom() + 8
  const [hidden, setHidden] = useState(() => snoozedUntil() > Date.now())

  if (state === 'must') {
    return (
      <View style={[styles.cover, { backgroundColor: colors.bg }]} accessibilityViewIsModal>
        <Text style={[styles.mustTitle, { color: colors.ink }]}>{t('update.mustTitle')}</Text>
        <Text style={[styles.mustBody, { color: colors.inkSoft }]}>{t('update.mustBody')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={openStore}
          style={({ pressed }) => [styles.mustGo, { backgroundColor: pressed ? colors.panel2 : colors.on }]}
        >
          <Text style={[styles.mustGoText, { color: colors.bg }]}>{t('update.go')}</Text>
        </Pressable>
      </View>
    )
  }
  if (state !== 'offer' || hidden || !HALL_PATHS.has(path)) return null

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top }]}>
      <View
        accessibilityLiveRegion="polite"
        style={[styles.card, { backgroundColor: colors.panel3, borderColor: colors.on }]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={openStore}
          style={({ pressed }) => [styles.go, pressed && { backgroundColor: colors.panel2 }]}
        >
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
            {t('update.title')}
          </Text>
          <Text style={[styles.cta, { color: colors.on }]}>{t('update.go')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('update.later')}
          hitSlop={8}
          onPress={() => {
            snooze()
            setHidden(true)
          }}
          style={({ pressed }) => [
            styles.x,
            { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel },
          ]}
        >
          <Text style={[styles.xText, { color: colors.inkSoft }]}>×</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  card: {
    ...headerLift,
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderWidth: 1,
    borderRadius: 18,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  go: { flex: 1, minWidth: 0, gap: 3, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
  title: { fontFamily: fonts.uiBold, fontSize: 15 },
  cta: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  x: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xText: { fontFamily: fonts.ui, fontSize: 20, lineHeight: 22 },
  cover: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  mustTitle: { fontFamily: fonts.uiBold, fontSize: 22, textAlign: 'center' },
  mustBody: { fontFamily: fonts.ui, fontSize: 15, textAlign: 'center', maxWidth: 320 },
  mustGo: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999 },
  mustGoText: { fontFamily: fonts.uiBold, fontSize: 16 },
})
