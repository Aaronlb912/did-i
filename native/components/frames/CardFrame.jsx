// A frame is a layer around a card. It never changes the card's size or
// layout: the art is absolutely positioned, ignores touches, and reaches up
// to PAD (48) px past the card on every side. The parent must not clip
// (no overflow: 'hidden' within ~48px of the card), or the art is cut off.
//
// Frames with material behind the card (stitch, wood, deco, marble, gold,
// silver, glass, aurora, comic, polaroid) draw it under the card, so the card
// itself must have an opaque background.
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { FRAME_ART } from './art.jsx'
import { STILL_CLOCK, svgAll, useFrameClock } from './runtime.jsx'

function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
  if (!m) return 0
  const n = parseInt(m[1], 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/** The few colors frames read from the app palette. */
export function framePalette(colors = {}) {
  const card = colors.card || colors.panel || '#16191f'
  const light = luminance(card) > 0.6
  return {
    accent: colors.on,
    card,
    line: colors.line,
    ink: colors.ink,
    freeze: colors.freeze || colors.on,
    // Stars and snow that sit outside the card need to read on a light page too.
    sky: light ? colors.inkDim || colors.ink : '#dcebff',
    snow: light ? colors.inkDim || colors.ink : '#ffffff',
    light,
  }
}

/**
 * Props: id, colors (app palette), active (animate or hold still), streak,
 * answered, total, weekLit [7 bools, Monday first], frozenRecently, date,
 * radius (the card's corner radius, default 24), children, style.
 */
export function CardFrame(props) {
  return props.still ? <FrameBody {...props} clock={STILL_CLOCK} /> : <LiveFrame {...props} />
}

function LiveFrame(props) {
  const art = props.id ? FRAME_ART[props.id] : null
  const clock = useFrameClock(Boolean(art && art.animated && props.active))
  return <FrameBody {...props} clock={clock} />
}

function FrameBody({
  id,
  colors,
  active = false,
  streak = 0,
  answered = 0,
  total = 0,
  weekLit,
  frozenRecently,
  date,
  radius = 24,
  fixedSize,
  clock,
  children,
  style,
}) {
  const art = id ? FRAME_ART[id] : null
  const [size, setSize] = useState(fixedSize || null)
  const animated = Boolean(art && art.animated && active && !clock.still)
  const c = useMemo(() => framePalette(colors), [colors])

  const onLayout = (event) => {
    const { width, height } = event.nativeEvent.layout
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height })
  }

  if (!art) return <View style={style}>{children}</View>

  const ready = size && size.w > 0 && size.h > 0 && svgAll()
  const f = ready
    ? { w: size.w, h: size.h, R: radius, c, clock, active: animated, still: Boolean(clock.still), p: { streak, answered, total, weekLit, frozenRecently, date } }
    : null
  const Under = art.under
  const Over = art.over

  return (
    <View style={style} onLayout={onLayout}>
      {f && Under ? (
        <View pointerEvents="none" style={styles.fill}>
          <Under f={f} />
        </View>
      ) : null}
      {children}
      {f && Over ? (
        <View pointerEvents="none" style={styles.fill}>
          <Over f={f} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
})
