import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'
import { HallAmbient } from './HallAmbient.jsx'
import { Jewel } from './Jewel.jsx'
import { NightMeter } from './NightMeter.jsx'
import { Slot } from './Slot.jsx'
import { SwipeCardHost } from './SwipeCardHost.jsx'

const JEWELS = [
  { id: 'pills', labelKey: 'ideas.pills.start', face: true },
  { id: 'door', labelKey: 'ideas.door.start', face: false },
  { id: 'water', labelKey: 'ideas.water.start', face: false },
]

/** The sign-in hero: the Did I mark, a swipe-once sample card, no fields. */
export function AuthSwipeBackdrop({ colors, onMarkLongPress }) {
  const demoDue = useMemo(
    () => [{ answer: { status: 'yes' } }, { answer: null }, { answer: null }],
    [],
  )

  return (
    <View style={[styles.frame, { backgroundColor: colors.bg }]}>
      <Slot>
        <HallAmbient heat={2} hour={21} hallOn accent={colors.on} />
      </Slot>
      <View style={styles.shell}>
        <Pressable
          onLongPress={onMarkLongPress}
          disabled={!onMarkLongPress}
          accessibilityRole={onMarkLongPress ? 'button' : 'text'}
        >
          <Text style={[styles.mastTitle, { color: colors.ink }]}>{t('tonight.didI')}</Text>
        </Pressable>
        <Text style={[styles.tagline, { color: colors.inkSoft }]}>{t('auth.tagline')}</Text>

        <Slot>
          <NightMeter due={demoDue} colors={colors} />
        </Slot>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.jewels}
          contentContainerStyle={styles.jewelsIn}
        >
          {JEWELS.map((item) => (
            <Jewel
              key={item.id}
              label={t(item.labelKey)}
              face={item.face}
              colors={colors}
              disabled
              onPress={() => {}}
            />
          ))}
        </ScrollView>

        <View style={styles.slot}>
          <Slot>
          <SwipeCardHost
            demoOnce
            cardKey="auth-demo"
            colors={colors}
            kicker={t('ideas.pills.kind')}
            title={t('auth.demoQuestion')}
            stampDid={t('tonight.swipeDid')}
            stampNope={t('tonight.swipeNope')}
            onDid={() => {}}
            onNope={() => {}}
          />
          </Slot>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
  },
  shell: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  mastTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.ui,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  jewels: {
    maxHeight: 52,
    marginBottom: 10,
  },
  jewelsIn: {
    gap: 8,
    paddingRight: 8,
  },
  slot: {
    minHeight: 168,
    overflow: 'visible',
  },
})
