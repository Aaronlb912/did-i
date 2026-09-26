import { View } from 'react-native'
import { svgParts } from '../lib/svg-parts.js'

const ICONS = {
  add: 'M12 5v14M5 12h14',
  inbox: 'M4 13h4l1.5 3h5l1.5-3h4M5.5 5h13L20 13v6H4v-6L5.5 5Z',
  people:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-3.33 0-7 1.67-7 4v2h14v-2c0-2.33-3.67-4-7-4Zm8.25.5c-.6 0-1.17.05-1.7.14 1.2.84 1.95 1.94 1.95 3.36V19h5v-1.75c0-2.07-3.1-3.75-5.25-3.75Z',
  shop: 'M7 8V6a5 5 0 0 1 10 0v2h3.1c.5 0 .9.45.85.95l-1.2 12A1 1 0 0 1 18.76 22H5.24a1 1 0 0 1-.99-1.05l-1.2-12A.86.86 0 0 1 3.9 8H7Zm2 0h6V6a3 3 0 0 0-6 0v2Z',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  collection:
    'M12 2a9.5 9.5 0 0 0-9.2 11.9L12 22l9.2-8.1A9.5 9.5 0 0 0 12 2Zm-1.5 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-4.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  settings:
    'M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z',
  boards: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z',
}

export function MenuIcon({ name, color, size = 18, stroke = false }) {
  const parts = svgParts()
  if (!parts) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderWidth: 1.5,
          borderColor: color,
          borderRadius: 3,
        }}
      />
    )
  }
  const { Svg, Path } = parts
  const path = ICONS[name] || ICONS.grid
  if (stroke) {
    return (
      <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 24 24">
        <Path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    )
  }
  return (
    <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 24 24">
      <Path d={path} fill={color} />
    </Svg>
  )
}
