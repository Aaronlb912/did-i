import { forwardRef, useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, TextInput } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { fonts } from '../theme.js'
import { WaveLead } from './DidLead.jsx'

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
  },
  inputRef,
) {
  const reduce = useReduceMotion()
  const lift = useRef(new Animated.Value(0)).current
  const slam = useRef(new Animated.Value(0)).current
  const jolt = useRef(new Animated.Value(0)).current
  const landed = Boolean(stamp)

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
        <Animated.Text
          accessibilityLiveRegion="polite"
          style={[
            faceCardStyles.stampDid,
            styles.stamp,
            {
              color: colors.on,
              borderColor: colors.onDeep,
              opacity: slam,
              transform: [{ scale: stampScale }, { rotate: '-6deg' }],
            },
          ]}
        >
          {stamp}
        </Animated.Text>
      ) : null}
      <Animated.Text
        numberOfLines={1}
        style={[faceCardStyles.kicker, { color: colors.on, opacity: landed ? tagFade : 1 }]}
      >
        {tag}
      </Animated.Text>
      {lead ? (
        <WaveLead text={t('tonight.didI')} wave={wave} colors={colors} style={faceCardStyles.title} />
      ) : null}
      <TextInput
        ref={inputRef}
        value={blank}
        onChangeText={onBlank}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={!landed}
        autoFocus={autoFocus}
        placeholder={lead ? t('first.ownHint') : t('hang.questionPh')}
        placeholderTextColor={colors.inkDim}
        selectionColor={colors.on}
        accessibilityLabel={lead ? t('tonight.didI') : t('hang.question')}
        autoCapitalize={lead ? 'none' : 'sentences'}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        multiline
        maxLength={120}
        style={[
          faceCardStyles.title,
          styles.blank,
          { color: colors.ink, borderBottomColor: landed ? 'transparent' : focused ? colors.on : colors.line },
        ]}
      />
      {meta ? (
        <Text style={[styles.meta, { color: colors.inkSoft }]} numberOfLines={2}>
          {meta}
        </Text>
      ) : null}
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  card: { justifyContent: 'flex-start', minHeight: 0, marginTop: 4 },
  // The underline says "you can type here"; it lights up while typing.
  blank: { padding: 0, paddingTop: 0, paddingBottom: 6, minHeight: 32, borderBottomWidth: 1.5 },
  stamp: {
    left: undefined,
    right: 16,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  meta: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
  },
})
