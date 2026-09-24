import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const HEADER_BAR = 44
export const HEADER_FADE = 30
const HEADER_DROP = 4
const CONTENT_GAP = 12

/** Top of the floating header row, measured from the top of the screen. */
export function useHeaderTop() {
  return useSafeAreaInsets().top + HEADER_DROP
}

/** How far screen content starts below the top so it clears the floating header. */
export function useHeaderSpace() {
  return useHeaderTop() + HEADER_BAR + CONTENT_GAP
}
