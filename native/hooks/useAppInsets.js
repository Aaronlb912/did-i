import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HALL_PATHS } from '../navigation/hash.js'
import { useScreenRoute } from '../navigation/screen-route.js'

const GAP = 6
// The system tab bar on the hall. Both platforms draw it over the page: iOS
// floats it, and the Material navigation bar sits over the bottom of the
// page with the gesture bar under it, so the page has to clear both.
const TAB_BAR = Platform.OS === 'ios' ? 62 : 80

/**
 * bottom: how far page content keeps clear of the bottom edge.
 * overlayBottom: the same for layers drawn over the whole app (toasts, cheers),
 * which also have to clear the whole tab bar.
 */
export function useAppInsets() {
  const insets = useSafeAreaInsets()
  // The tab bar lives on the hall only; pushed screens cover it.
  const tabbed = HALL_PATHS.has(useScreenRoute().path)
  const bottom = tabbed ? TAB_BAR + insets.bottom + GAP : insets.bottom + GAP
  return { insets, bottom, overlayBottom: bottom }
}
