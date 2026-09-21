import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { showBottomNav } from '../../src/lib/app-nav.js'
import { readRoute } from '../navigation/hash.js'

export const NAV_TAB_HEIGHT = 36
export const NAV_PAD = 3
export const NAV_GAP = 6
export const NAV_CLEARANCE = 14

export function useAppInsets() {
  const insets = useSafeAreaInsets()
  const path = readRoute().path
  const navBar = showBottomNav(path) ? NAV_TAB_HEIGHT + NAV_PAD * 2 : 0
  const bottom = navBar + insets.bottom + (navBar ? NAV_GAP + NAV_CLEARANCE : NAV_GAP)
  return { insets, navBar, bottom }
}
