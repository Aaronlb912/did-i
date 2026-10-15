import { useEffect, useState } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useFadeIn } from '../lib/motion.jsx'
import { personTint } from '../../src/lib/person-tint.js'
import { fonts } from '../theme.js'
import { BuddyArt } from './BuddyArt.jsx'

function nameOf(person) {
  return String(person?.display_name || person?.name || '').replace(/^@/, '').trim()
}

function lettersOf(person, max = 2) {
  if (person?.initials && max > 1) return String(person.initials)
  const words = nameOf(person).split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const picked = words.length > 1 && max > 1 ? [words[0], words[words.length - 1]] : [words[0]]
  return picked.map((w) => Array.from(w)[0] || '').join('').toUpperCase()
}

/**
 * One person, the same way everywhere: their photo if they have one, else
 * the buddy they wear with a small initial badge in their own color, else
 * a letter tile. `label` puts their name under it.
 * person: { user_id|id, display_name|name, avatar_url|avatar, buddy_on|buddy, initials }
 */
export function PersonAvatar({ person, colors, size = 46, done = false, tint, round = false, faded = false, label = false, ring }) {
  const [broken, setBroken] = useState(false)
  // A photo eases in over the tile when it lands, never a snap.
  const [loaded, setLoaded] = useState(false)
  const fade = useFadeIn(loaded)
  const rawUrl = person?.avatar_url ?? person?.avatar
  // A new photo fades in too, not only the first one.
  useEffect(() => setLoaded(false), [rawUrl])
  const url = !broken && typeof rawUrl === 'string' ? rawUrl.trim() : ''
  const buddy = String(person?.buddy_on ?? person?.buddy ?? '')
  const lit = tint || colors.on
  const radius = round ? size / 2 : Math.round(size * 0.28)
  const badge = Math.max(12, Math.round(size * 0.4))
  const key = String(person?.user_id || person?.id || nameOf(person))
  const showBuddy = !url && Boolean(buddy)
  const edge = ring || (done ? lit : colors.line)

  const face = (
    <View style={{ width: size, height: size, opacity: faded ? 0.5 : 1 }}>
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: done && !url ? lit : colors.panel2,
            borderColor: edge,
            borderWidth: done || ring ? 2 : 1,
          },
        ]}
      >
        {url ? (
          <Animated.Image
            source={{ uri: url }}
            onLoad={() => setLoaded(true)}
            style={{ width: '100%', height: '100%', borderRadius: radius - 1, opacity: fade }}
            accessibilityIgnoresInvertColors
            onError={() => setBroken(true)}
          />
        ) : showBuddy ? (
          // The real drawing: the plain blob version lost who was who at chip size.
          <BuddyArt id={buddy} width={size * 0.8} height={size * 0.96} />
        ) : (
          <Text
            style={[styles.letters, { color: done ? colors.bg : colors.ink, fontSize: Math.round(size * 0.36) }]}
            numberOfLines={1}
          >
            {lettersOf(person)}
          </Text>
        )}
      </View>
      {showBuddy ? (
        <View
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: badge / 2,
              backgroundColor: personTint(colors, key),
              borderColor: colors.panel,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.bg, fontSize: Math.round(badge * 0.58) }]} numberOfLines={1}>
            {lettersOf(person, 1)}
          </Text>
        </View>
      ) : null}
    </View>
  )

  if (!label) return face
  return (
    <View style={[styles.labelled, { width: Math.max(size + 16, 64) }]}>
      {face}
      <Text style={[styles.name, { color: colors.inkSoft }]} numberOfLines={1}>
        {nameOf(person) || '?'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letters: { fontFamily: fonts.display, fontWeight: '700' },
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.uiSemi },
  labelled: { alignItems: 'center', gap: 4 },
  name: { fontFamily: fonts.ui, fontSize: 12, textAlign: 'center' },
})
