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
  // Line icons for the edit question rows. Draw these with stroke.
  calendar: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM4 10h16M8 3v4M16 3v4',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v5l3 2',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM11 18h2',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4',
  tag: 'M3 12V4h8l10 10-8 8-10-10ZM7.5 8h.01',
  flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  // Rising bars: how much a question matters (Priority). Not the flag, which means So far.
  priority: 'M6 20v-5M12 20V10M18 20V4',
  pause: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM10 9v6M14 9v6',
  play: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM10 8.5v7l5.5-3.5-5.5-3.5Z',
  trash: 'M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v5M14 11v5',
  copy: 'M9 9h11v11H9V9ZM5 15H4V4h11v1',
  pen: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  note: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8.5 8h7M8.5 12h7M8.5 16h4',
  folder: 'M3 7a2 2 0 0 1 2-2h4.5l2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-4 3.5-6 8-6s8 2 8 6',
  globe:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 9h17M3.5 15h17M12 3c2.2 2.4 3.5 5.6 3.5 9s-1.3 6.6-3.5 9c-2.2-2.4-3.5-5.6-3.5-9s1.3-6.6 3.5-9Z',
  moon: 'M20 14.2A8.2 8.2 0 0 1 9.8 4 7 7 0 1 0 20 14.2Z',
  motion: 'M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7',
  wallpaper: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  volume: 'M4 9v6h4l5 4V5L8 9H4ZM16.5 9a5 5 0 0 1 0 6M19 6.5a8.5 8.5 0 0 1 0 11',
  filter: 'M4 5h16l-6 7.5V19l-4 2v-8.5L4 5Z',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  shield: 'M12 3l7 3v6c0 4.8-3 7.8-7 9-4-1.2-7-4.2-7-9V6l7-3Z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9.3 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.5 2.2-2.5 4.1M12 17.2h.01',
  logout: 'M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9',
  warning: 'M12 3 22 20H2L12 3ZM12 10v5M12 17.5h.01',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  chart: 'M4 20h16M7 16v-5M12 16V6M17 16v-8',
  qr: 'M4 4h6v6H4V4ZM14 4h6v6h-6V4ZM4 14h6v6H4v-6ZM14 14h2v2h-2v-2ZM18 18h2v2h-2v-2ZM14 18h2M18 14h2',
  // Did we: two rings, linked. Draw with stroke.
  together: 'M4 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0ZM10 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0Z',
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
