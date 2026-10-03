import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { svgGradient } from '../lib/svg-parts.js'

const FADE = 28

// No svg (the fallback, or the web visual check): no fade, the row still scrolls.
function Fade({ side, color }) {
  const parts = svgGradient()
  if (!parts) return null
  const { Svg, Defs, LinearGradient, Stop, Rect } = parts
  const id = `fade-${side}`
  return (
    <View pointerEvents="none" style={[styles.fade, side === 'left' ? styles.left : styles.right]}>
      <Svg width={FADE} height="100%">
        <Defs>
          <LinearGradient id={id} x1={side === 'left' ? '0' : '1'} y1="0" x2={side === 'left' ? '1' : '0'} y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={FADE} height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  )
}

// A sideways ScrollView that fades the edge with more past it, so people
// can tell the row keeps going. fade is the color behind the row.
export function FadeScroll({ fade, style, children, onScroll, onLayout, onContentSizeChange, ...props }) {
  const [x, setX] = useState(0)
  const [width, setWidth] = useState(0)
  const [inner, setInner] = useState(0)
  const more = inner - width
  return (
    <View style={style}>
      <ScrollView
        {...props}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          setX(e.nativeEvent.contentOffset.x)
          onScroll?.(e)
        }}
        onLayout={(e) => {
          setWidth(e.nativeEvent.layout.width)
          onLayout?.(e)
        }}
        onContentSizeChange={(w, h) => {
          setInner(w)
          onContentSizeChange?.(w, h)
        }}
      >
        {children}
      </ScrollView>
      {fade && more > 2 && x > 2 ? <Fade side="left" color={fade} /> : null}
      {fade && more > 2 && x < more - 2 ? <Fade side="right" color={fade} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: 0, bottom: 0, width: FADE },
  left: { left: 0 },
  right: { right: 0 },
})
