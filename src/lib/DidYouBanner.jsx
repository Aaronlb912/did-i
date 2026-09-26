import { useEffect } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { t } from './i18n.js'
import { didYouNewsLines, dismissPeopleNews, usePeoplePulse } from './people.js'

const SHOW_MS = 10000

// A did you that lands while the app is open. The menu badge stays after
// this goes, so closing it loses nothing.
export function DidYouBanner({ path }) {
  const account = useAccount()
  const { news } = usePeoplePulse(account.user)
  const lines = news ? didYouNewsLines(news) : null
  // Already looking at the inbox; tonight still gets told what just landed.
  const here = Boolean(lines && news.kind !== 'added' && path === lines.go)

  useEffect(() => {
    if (!news) return undefined
    if (here) {
      dismissPeopleNews()
      return undefined
    }
    const timer = window.setTimeout(dismissPeopleNews, SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [news, here])

  if (!lines || here) return null

  return (
    <div className="di-didyou-banner" role="status" aria-live="polite">
      <button
        type="button"
        className="di-didyou-banner-go"
        onClick={() => {
          dismissPeopleNews()
          goHash(lines.go)
        }}
      >
        <strong>{lines.title}</strong>
        {lines.body ? <span>{lines.body}</span> : null}
        <em>{lines.go === '/inbox' ? t('didyou.open') : t('didyou.seeTonight')}</em>
      </button>
      <button
        type="button"
        className="di-key di-didyou-banner-x"
        aria-label={t('didyou.dismiss')}
        onClick={dismissPeopleNews}
      >
        ×
      </button>
    </div>
  )
}
