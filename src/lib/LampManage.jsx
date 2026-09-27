import { t } from './i18n.js'
import { SetCap, SetCard, SetRow } from './set-bits.jsx'

// Stop asking and Delete, shared by the question page and its edit page.
export function LampManage({ lamp, onArchive, onRemove }) {
  if (!lamp) return null
  return (
    <>
      <SetCap>{t('lamp.secManage')}</SetCap>
      <SetCard>
        <SetRow
          label={lamp.archived ? t('lamp.askAgain') : t('lamp.stop')}
          sub={lamp.archived ? t('lamp.askAgainSub') : t('lamp.stopSub')}
          onClick={onArchive}
        />
        <SetRow label={t('lamp.delete')} sub={t('lamp.deleteSub')} danger onClick={onRemove} />
      </SetCard>
    </>
  )
}

export function LampDeleteConfirm({ book, lamp, onDelete, onKeep }) {
  const taps = (book.answers || []).filter((item) => item.lampId === lamp.id).length
  return (
    <section className="di-face">
      <p className="di-face-plate">{t('lamp.delete')}</p>
      <h2 className="di-question">{t('lamp.deleteTitle')}</h2>
      <p className="di-detail-meta">
        {taps === 0 ? t('lamp.deleteNone') : taps === 1 ? t('lamp.deleteOne') : t('lamp.deleteSome', { n: taps })}
      </p>
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={onDelete}>
          {t('lamp.delete')}
        </button>
        <button className="di-key" type="button" onClick={onKeep}>
          {t('lamp.keep')}
        </button>
      </div>
    </section>
  )
}
