import { inEnglish, t } from './i18n.js'
import { legalVars } from './legal.js'
export { PRIVACY_SECTIONS, TERMS_SECTIONS } from './legal-sections.js'

function paras(text) {
  return String(text || '')
    .split('\n\n')
    .filter(Boolean)
    .map((chunk, index) => (
      <p className="di-about-p" key={index}>
        {chunk}
      </p>
    ))
}

export function LegalArticle({ kind, sections }) {
  const vars = { ...legalVars(), date: t('legal.date') }

  return (
    <>
      <p className="di-face-plate">{t(`legal.${kind}.kicker`)}</p>
      <h1 className="di-question di-legal-title">{t(`legal.${kind}.title`)}</h1>
      <p className="di-legal-updated">{t('legal.effective', vars)}</p>
      <p className="di-set-note">{t('legal.notLawyer')}</p>
      {inEnglish() ? null : <p className="di-set-note">{t('legal.translated')}</p>}

      {sections.map((id) => (
        <section className="di-help-block" key={id} id={id}>
          <h2>{t(`legal.${kind}.${id}.title`)}</h2>
          {paras(t(`legal.${kind}.${id}.body`, vars))}
        </section>
      ))}
    </>
  )
}
