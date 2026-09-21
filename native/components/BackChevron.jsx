import Svg, { Path } from 'react-native-svg'

export function BackChevron({ color = 'currentColor', size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <Path fill={color} d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </Svg>
  )
}
