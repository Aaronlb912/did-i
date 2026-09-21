import { makeMutable } from 'react-native-reanimated'

// Only one card can be dragged at a time, so the pull lives outside React.
// The rails read these straight off the UI thread; nothing re-renders mid drag.
export const railPull = makeMutable(0)
export const railLive = makeMutable(0)

export function restRails() {
  railPull.value = 0
  railLive.value = 0
}
