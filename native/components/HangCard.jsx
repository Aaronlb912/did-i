import { forwardRef, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { fonts } from '../theme.js'
import { WaveLead } from './DidLead.jsx'
import { AppTextInput } from './ui.jsx'

const SHAKE = [-8, 8, -5, 5, -2, 0]

// The question written on the card it becomes on Tonight: the tag up top,
// "Did I" fixed, the blank to finish, and a line that says when it comes up.
// `stamp` slams a label onto the card once it is added; `shake` ticks on a miss.
export const HangCard = forwardRef(function HangCard(
  {
    tag,
    lead = true,
    blank,
    onBlank,
    meta,
    wave,
    stamp,
    shake,
    focused,
    onFocus,
    onBlur,
    autoFocus,
    colors,
    // A Did we card leads with "Did we" instead.
    leadText,
    placeholder,
    // Tapping the first words picks Did I, Did we or Did you.
    onLeadPress,
    leadColor,
  },
  inputRef,
) {
  const reduce = useReduceMotion()
  const lift = useRef(new Animated.Value(0)).current
  const slam = useRef(new Animated.Value(0)).current
  const jolt = useRef(new Animated.Value(0)).current
  const landed = Boolean(stamp)
  const [textW, setTextW] = useState(0)
  const mark = Boolean(lead && String(blank || '').trim() && !/[?？]$/.test(String(blank).trim()))

  useEffect(() => {
    if (!landed) return undefined
    if (reduce) {
      slam.setValue(1)
      return undefined
    }
    const run = Animated.parallel([
      Animated.sequence([
        Animated.timing(lift, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(lift, { toValue: 0, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(140),
        Animated.spring(slam, { toValue: 1, friction: 6, tension: 160, useNativeDriver: true }),
      ]),
    ])
    run.start()
    return () => run.stop()
  }, [landed, reduce, lift, slam])

  useEffect(() => {
    if (!shake || reduce) return undefined
    jolt.setValue(0)
    const run = Animated.sequence(
      SHAKE.map((toValue) =>
        Animated.timing(jolt, { toValue, duration: 55, easing: Easing.linear, useNativeDriver: true }),
      ),
    )
    run.start()
    return () => run.stop()
  }, [shake, reduce, jolt])

  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
  const rise = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] })
  const stampScale = slam.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] })
  const tagFade = slam.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  const edge = landed || focused ? colors.onDeep : colors.line

  return (
    <Animated.View
      style={[
        ...faceCardStyle(colors),
        styles.card,
        { borderColor: edge },
        { transform: [{ translateX: jolt }, { translateY: rise }, { scale }] },
      ]}
    >
      {landed ? (
        // Centered over the card, so it reads as a stamp on the question.
        <View pointerEvents="none" style={styles.stampLayer}>
          <Animated.Text
            accessibilityLiveRegion="polite"
            style={[
              faceCardStyles.stampDid,
              styles.stamp,
              {
                color: colors.on,
                borderColor: colors.onDeep,
                backgroundColor: colors.panel,
                opacity: slam,
                transform: [{ scale: stampScale }, { rotate: '-6deg' }],
              },
            ]}
          >
            {stamp}
          </Animated.Text>
        </View>
      ) : null}
      <Animated.Text
        numberOfLines={1}
        style={[faceCardStyles.kicker, { color: colors.on, opacity: landed ? tagFade : 1 }]}
      >
        {tag}
      </Animated.Text>
      {/* Did I, the question and its ? read as one line, as on Home. */}
      <View style={lead ? styles.leadRow : null}>
      {mark ? (
        // Measures the typed words, so the blank ends where they do and the ? sits right after.
        <Text
          style={[faceCardStyles.title, styles.measure]}
          onLayout={(event) => setTextW(event.nativeEvent.layout.width)}
          accessible={false}
          importantForAccessibility="no"
        >
          {String(blank)}
        </Text>
      ) : null}
      {lead && onLeadPress && !landed ? (
        // The first words are a button: Did I, Did we or Did you.
        <Pressable
          onPress={onLeadPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('lead.change', { lead: leadText || t('tonight.didI') })}
          style={styles.leadHit}
        >
          <WaveLead
            text={leadText || t('tonight.didI')}
            wave={wave}
            colors={leadColor ? { ...colors, on: leadColor } : colors}
            style={faceCardStyles.title}
          />
          <Text style={[styles.leadChev, { color: leadColor || colors.on }]}>▾</Text>
        </Pressable>
      ) : lead ? (
        <WaveLead text={leadText || t('tonight.didI')} wave={wave} colors={colors} style={[faceCardStyles.title, styles.leadOnly]} />
      ) : null}
      <AppTextInput
        colors={colors}
        ref={inputRef}
        value={blank}
        onChangeText={onBlank}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={!landed}
        autoFocus={autoFocus}
        placeholder={placeholder || (lead ? t('first.ownHint') : t('hang.questionPh'))}
        accessibilityLabel={lead ? leadText || t('tonight.didI') : t('hang.question')}
        autoCapitalize={lead ? 'none' : 'sentences'}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        multiline
        maxLength={120}
        style={[
          faceCardStyles.title,
          styles.blank,
          { color: colors.ink, borderBottomColor: landed ? 'transparent' : focused ? colors.on : colors.line },
          lead ? styles.leadBlank : null,
          // The width is measured after each letter, so while typing it keeps one
          // letter of room: a new letter used to land in a box too narrow for it,
          // wrap for a frame, then jump back once measured (a flicker on iOS).
          mark && textW ? { flexGrow: 0, flexBasis: 'auto', minWidth: 0, maxWidth: '100%', width: textW + (focused ? TYPE_ROOM : 4) } : null,
        ]}
      />
      {mark ? <Text style={[faceCardStyles.title, styles.mark, { color: colors.ink }]}>?</Text> : null}
      </View>
      {meta ? (
        <Text style={[styles.meta, { color: colors.inkSoft }]} numberOfLines={2}>
          {meta}
        </Text>
      ) : null}
    </Animated.View>
  )
})

// About one wide letter at the title size (26).
const TYPE_ROOM = 28

const styles = StyleSheet.create({
  card: { justifyContent: 'flex-start', minHeight: 0, marginTop: 4 },
  // Lifts Did I onto the typed words' baseline (checked on Android).
  leadHit: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingBottom: 3.5 },
  leadOnly: { paddingBottom: 3.5 },
  leadChev: { fontSize: 26, marginTop: 2 },
  leadRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 8 },
  leadBlank: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 140 },
  // Same bottom room as the blank's padding and underline, so the ? shares its baseline.
  mark: { paddingBottom: 7.5, marginLeft: -6 },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0 },
  // The underline says "you can type here"; it lights up while typing.
  blank: { padding: 0, paddingTop: 0, paddingBottom: 6, minHeight: 32, borderBottomWidth: 1.5 },
  stampLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stamp: {
    position: 'relative',
    top: undefined,
    left: undefined,
    fontSize: 24,
    borderWidth: 2.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  meta: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
})
