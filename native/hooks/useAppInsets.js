import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HALL_PATHS } from '../navigation/hash.js'
import { useScreenRoute } from '../navigation/screen-route.js'

export const NAV_TAB_HEIGHT = 36
export const NAV_PAD = 3
export const NAV_GAP = 6
export const NAV_CLEARANCE = 14

export function useAppInsets() {
  const insets = useSafeAreaInsets()
  // The tab bar lives on the hall only; pushed screens cover it.
  const path = useScreenRoute().path
  const navBar = HALL_PATHS.has(path) ? NAV_TAB_HEIGHT + NAV_PAD * 2 : 0
  const bottom = navBar + insets.bottom + (navBar ? NAV_GAP + NAV_CLEARANCE : NAV_GAP)
  return { insets, navBar, bottom }
}
