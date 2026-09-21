import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Matches the floating nav pill in AppShell.jsx.
export const NAV_TAB_HEIGHT = 36
export const NAV_PAD = 3
export const NAV_GAP = 6
export const NAV_CLEARANCE = 14

export function useAppInsets() {
  const insets = useSafeAreaInsets()
  const navBar = NAV_TAB_HEIGHT + NAV_PAD * 2
  const bottom = navBar + insets.bottom + NAV_GAP + NAV_CLEARANCE
  return { insets, navBar, bottom }
}
