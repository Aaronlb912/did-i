import { AppRegistry } from 'react-native'
import { readShelf } from '../src/lib/board-shelf.js'
import { armNativePingsNow } from './shim/native.js'

// Started by PingRearmService after a reboot, update or clock / zone change
// with no widget placed. Always sets reminders again: a cleared alarm list
// looks fresh to pingsStale.
AppRegistry.registerHeadlessTask('DidIPingRearm', () => async () => {
  try {
    await armNativePingsNow(readShelf()?.boards || [])
  } catch {
    // Shelf or notifications not ready: the next app open sets them.
  }
})
