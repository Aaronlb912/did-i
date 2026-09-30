// One line icon per achievement, drawn with a 2px stroke in a 24x24 box.
// Shared by the phone (react-native-svg) and the web (inline svg) grids.
import { markInfo } from './achievements.js'

const PATHS = {
  moon: 'M20 14.2A8.2 8.2 0 0 1 9.8 4 7 7 0 1 0 20 14.2Z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v5l3 2',
  star: 'M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5Z',
  flame: 'M12 3c.8 3.2 4.5 4.8 4.5 9.2a4.5 4.5 0 0 1-9 0c0-2.2 1.2-3.4 2.1-4.6.4 1.3 1.2 2 2.1 2-.8-2.2-.4-4.6.3-6.6Z',
  calendar: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM4 10h16M8 3v4M16 3v4',
  back: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  door: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14.5 12h.01',
  plus: 'M12 5v14M5 12h14',
  note: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8.5 8h7M8.5 12h7M8.5 16h4',
  shield: 'M12 3l7 3v6c0 4.8-3 7.8-7 9-4-1.2-7-4.2-7-9V6l7-3Z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  folder: 'M3 7a2 2 0 0 1 2-2h4.5l2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  target: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9ZM12 11.5v1',
  flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  coin: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4.2 0 1.1-1.1 1.9-2.5 1.9-1.1 0-2-.4-2.5-1.2M12 6.5V8M12 16v1.5',
  together: 'M4 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0ZM10 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0Z',
}

const BY_MARK = {
  'first-open': 'moon',
  'first-did': 'check',
  'honest-skip': 'eye',
  'late-ok': 'clock',
  'hall-on': 'star',
  'heat-3': 'flame',
  'heat-5': 'flame',
  'showed-3': 'calendar',
  'showed-7': 'calendar',
  'come-back': 'back',
  'seven-door': 'door',
  'hung-five': 'plus',
  'month-bill': 'note',
  'quiet-week': 'shield',
}

export function markIconPath(id) {
  return PATHS[BY_MARK[id] || markInfo(id)?.icon] || PATHS.star
}

export const LOCK_PATH = PATHS.lock
