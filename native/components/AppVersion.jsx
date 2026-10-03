import * as Application from 'expo-application'
import * as Updates from 'expo-updates'
import { t } from '../../src/lib/i18n.js'
import { Meta } from './ui.jsx'

// Which build and which over-the-air update this phone is running, so people
// (and support) can tell what they have.
export function appVersionLines() {
  const v = Application.nativeApplicationVersion || '?'
  const build = Application.nativeBuildVersion || '?'
  let update = t('help.versionNoUpdate')
  try {
    if (Updates.updateId && !Updates.isEmbeddedLaunch) {
      const when = Updates.createdAt ? new Date(Updates.createdAt).toLocaleString() : ''
      update = t('help.versionUpdate', { id: String(Updates.updateId).slice(0, 8), when })
    }
  } catch {
    // Updates off (a dev build): the build line is enough.
  }
  return [t('help.version', { v, build }), update]
}

export function AppVersion({ colors }) {
  const [build, update] = appVersionLines()
  return (
    <Meta colors={colors}>
      {build}
      {'\n'}
      {update}
    </Meta>
  )
}
