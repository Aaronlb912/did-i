import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import { feelTap } from '../../src/lib/native.js'
import { didYouNewsLines, dismissPeopleNews, usePeoplePulse } from '../../src/lib/people.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useHeaderBottom } from '../hooks/useHeaderSpace.js'
import { headerLift } from './HeaderButton.jsx'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'

const SHOW_MS = 10000

// A did you that lands while the app is open. The menu badge stays after
// this goes, so closing it loses nothing.
export function DidYouBanner({ path, colors }) {
  const account = useAccount()
  const { news } = usePeoplePulse(account.user)
  const reduce = useReduceMotion()
  const top = useHeaderBottom() + 8
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(-10)).current
  const lines = news ? didYouNewsLines(news) : null
  // Already looking at the inbox; tonight still gets told what just landed.
  const here = Boolean(lines && news.kind !== 'added' && path === lines.go)
  const newsId = news?.id || ''

  useEffect(() => {
    if (!newsId) return undefined
    if (here) {
      dismissPeopleNews()
      return undefined
    }
    if (reduce) {
      fade.setValue(1)
      slide.setValue(0)
    } else {
      fade.setValue(0)
      slide.setValue(-10)
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start()
    }
    const timer = setTimeout(dismissPeopleNews, SHOW_MS)
    return () => clearTimeout(timer)
  }, [newsId, here, reduce, fade, slide])

  if (!lines || here) return null

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top, opacity: fade, transform: [{ translateY: slide }] }]}
    >
      <View
        accessibilityLiveRegion="polite"
        style={[styles.card, { backgroundColor: colors.panel3, borderColor: colors.on }]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            feelTap()
            dismissPeopleNews()
            goHash(lines.go)
          }}
          style={({ pressed }) => [styles.go, pressed && { backgroundColor: colors.panel2 }]}
        >
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
            {lines.title}
          </Text>
          {lines.body ? (
            <Text style={[styles.body, { color: colors.inkSoft }]} numberOfLines={1}>
              {lines.body}
            </Text>
          ) : null}
          <Text style={[styles.cta, { color: colors.on }]}>
            {lines.go === '/inbox' ? t('didyou.open') : t('didyou.seeTonight')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('didyou.dismiss')}
          hitSlop={8}
          onPress={dismissPeopleNews}
          style={({ pressed }) => [
            styles.x,
            { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel },
          ]}
        >
          <Text style={[styles.xText, { color: colors.inkSoft }]}>×</Text>
        </Pressable>
      </View>
    </Animated.View>
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
  body: { fontFamily: fonts.ui, fontSize: 13 },
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
})
