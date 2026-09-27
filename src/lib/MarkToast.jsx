import { useEffect } from 'react'
import { markText } from './achievements.js'
import { t } from './i18n.js'

export function MarkToast({ mark, onClose }) {
  useEffect(() => {
    if (!mark) return undefined
    const timer = window.setTimeout(() => onClose?.(), 5200)
    return () => window.clearTimeout(timer)
  }, [mark, onClose])

  if (!mark) return null

  return (
    <p className="di-undo di-mark-toast di-screws-print-hide" role="status">
      <span className="di-mark-copy">
        <em>{t('marks.new')}</em>
        <strong>{t(markText(mark.id, 'name'))}</strong>
        {mark.id ? <span>{t(markText(mark.id, 'line'))}</span> : null}
      </span>
      <button className="di-key" type="button" onClick={onClose}>
        {t('marks.ok')}
      </button>
    </p>
  )
}
