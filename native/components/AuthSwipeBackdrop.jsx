import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
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

export function AuthSwipeBackdrop({ colors, behind = false }) {
  const demoDue = useMemo(
    () => [{ answer: { status: 'yes' } }, { answer: null }, { answer: null }],
    [],
  )

  if (behind) {
    return (
      <View style={[styles.behindFrame, { backgroundColor: colors.bg }]}>
        <Slot>
          <HallAmbient heat={2} hour={21} hallOn accent={colors.on} />
        </Slot>
        <View style={styles.behindCard}>
          <Slot>
          <SwipeCardHost
            demo
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
    )
  }

  return (
    <View style={[styles.frame, { backgroundColor: colors.bg }]}>
      <Slot>
        <HallAmbient heat={2} hour={21} hallOn accent={colors.on} />
      </Slot>
      <View style={styles.shell}>
        <Text style={[styles.mastTitle, { color: colors.ink }]}>{t('tonight.didI')}</Text>

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
            demo
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
    flex: 1,
    position: 'relative',
  },
  behindFrame: {
    flex: 1,
    position: 'relative',
  },
  behindCard: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  shell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  mastTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
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
    flex: 1,
    justifyContent: 'center',
    minHeight: 168,
    overflow: 'visible',
  },
})
