import { t } from './i18n.js'

export function WaitPlate({ row, onClose, onOpenLamp }) {
  if (!row) return null
  const after = row.lamp.askAfter || t('wait.later')
  return (
    <section className="di-wait">
      <p className="di-face-plate">{t('wait.kicker')}</p>
      <h2 className="di-question">{row.lamp.question}</h2>
      <p className="di-detail-meta">{t('wait.after', { time: after })}</p>
      <div className="di-hang-actions">
        {onOpenLamp ? (
          <button className="di-did di-did-small" type="button" onClick={onOpenLamp}>
            {t('wait.thisQuestion')}
          </button>
        ) : null}
        <button className="di-key" type="button" onClick={onClose}>
          {t('wait.sit')}
        </button>
      </div>
    </section>
  )
}
