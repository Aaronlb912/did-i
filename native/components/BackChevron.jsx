import { Text } from 'react-native'
import { svgParts } from '../lib/svg-parts.js'

export function BackChevron({ color = 'currentColor', size = 22 }) {
  const parts = svgParts()
  if (!parts) {
    return <Text style={{ color, fontSize: size, lineHeight: size, width: size }}>‹</Text>
  }
  const { Svg, Path } = parts
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path fill={color} d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </Svg>
  )
}

/** The Material back arrow for the Android top app bar. */
export function BackArrow({ color = 'currentColor', size = 24 }) {
  const parts = svgParts()
  if (!parts) {
    return <Text style={{ color, fontSize: size, lineHeight: size, width: size }}>←</Text>
  }
  const { Svg, Path } = parts
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path fill={color} d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </Svg>
  )
}
