import { useContext } from 'react'
import { Platform } from 'react-native'
import { HeaderHeightContext } from '@react-navigation/elements'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** The bar row: the iOS navigation bar, or the Material 3 top app bar. */
export const HEADER_BAR = Platform.OS === 'ios' ? 44 : 64

/** Bottom edge of the header row, measured from the top of the screen. */
export function useHeaderBottom() {
  return useSafeAreaInsets().top + HEADER_BAR
}

/**
 * How far a page that does not scroll sits below the iOS navigation bar, which
 * floats over it. Android's top app bar is in the page flow, so it is 0 there.
 */
export function useHeaderInset() {
  const height = useContext(HeaderHeightContext)
  return Platform.OS === 'ios' ? height || 0 : 0
}
