import { useEffect, useState } from 'react'
import { needsDiagnosticsAsk, setDiagnosticsAnswer } from './diagnostics.js'
import { t } from './i18n.js'

export function DiagnosticsAsk() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (needsDiagnosticsAsk()) setOpen(true)
  }, [])

  if (!open) return null

  function answer(yes) {
    setDiagnosticsAnswer(yes)
    setOpen(false)
  }

  return (
    <div className="di-set-veil" role="dialog" aria-modal="true" aria-labelledby="diagnostics-title">
      <section
        className="di-set-sheet"
        onClick={(event) => event.stopPropagation()}
        role="document"
      >
        <p className="di-set-cap">{t('diagnostics.kicker')}</p>
        <h2 className="di-page-title" id="diagnostics-title">{t('diagnostics.title')}</h2>
        <p className="di-set-note">{t('diagnostics.body')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => answer(true)}>
            {t('diagnostics.yes')}
          </button>
          <button className="di-key" type="button" onClick={() => answer(false)}>
            {t('diagnostics.no')}
          </button>
        </div>
      </section>
    </div>
  )
}
