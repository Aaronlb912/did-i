import { writePrefs } from './prefs.js'

/** Widget prefs only. Native `widget-setup` listens with `onPrefs` and refreshes the snapshot. */
export function applyWidgetPrefs(patch) {
  return writePrefs(patch)
}
