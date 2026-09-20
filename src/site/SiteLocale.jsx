import { t } from '../lib/i18n.js'
import { LOCALE_IDS, usePrefs, writePrefs } from '../lib/prefs.js'
import { SiteSelect } from './SiteSelect.jsx'

export function SiteLocale() {
  const prefs = usePrefs()
  const options = LOCALE_IDS.map((id) => ({ value: id, label: t(`lang.${id}`) }))

  return (
    <SiteSelect
      nav
      ariaLabel={t('settings.language')}
      value={prefs.locale}
      options={options}
      onChange={(locale) => writePrefs({ locale })}
    />
  )
}
