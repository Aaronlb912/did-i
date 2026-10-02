import { useMemo } from 'react'
import { View } from 'react-native'
import { svgParts } from '../lib/svg-parts.js'

// Black on white whatever the theme: some scanners miss a light-on-dark code.
const DARK = '#000000'
const LIGHT = '#ffffff'
const QUIET = 2

function qrPath(text) {
  try {
    const { create } = require('qrcode/lib/core/qrcode')
    const { size, data } = create(text, { errorCorrectionLevel: 'M' }).modules
    let d = ''
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (data[y * size + x]) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`
      }
    }
    return { d, side: size + QUIET * 2 }
  } catch {
    return null
  }
}

export function QrCode({ value, size = 200, label }) {
  const parts = svgParts()
  const drawn = useMemo(() => (value ? qrPath(value) : null), [value])
  if (!parts || !drawn) return null
  const { Svg, Path } = parts
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size, backgroundColor: LIGHT, borderRadius: 12, overflow: 'hidden' }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${drawn.side} ${drawn.side}`}>
        <Path d={drawn.d} fill={DARK} />
      </Svg>
    </View>
  )
}
