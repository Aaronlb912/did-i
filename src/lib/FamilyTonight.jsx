import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { sharedLastLine } from './every-copy.js'
import { t } from './i18n.js'
import { answerFamilyLamp, familyLampMeta } from './people.js'

// What a family put on you, sitting on your own tonight. Answering here
// writes to the family, not to your shelf, so it never touches your
// streak or your coins.
// family: useFamilyTonight from Tonight, so the count chip shares the read.
export function FamilyTonight({ family }) {
  const { rows, reload } = family
  const [busy, setBusy] = useState('')
  const [miss, setMiss] = useState('')

  if (!rows.length) return null

  const open = rows.filter((row) => !row.answer)
  const families = [...new Map(rows.map((row) => [row.family.id, row.family])).values()]

  // This one goes over the network. If it does not land, say so, or the
  // tap looks like it worked and the family never sees it.
  async function tap(row, status) {
    setBusy(row.lamp.id)
    const { miss: why } = await answerFamilyLamp(row.family.id, row.lamp.id, row.night, status)
    setBusy('')
    if (why) {
      setMiss(t('famNight.offline'))
      return
    }
    setMiss('')
    reload()
  }

  return (
    <section className="di-fam-strip" id="di-fam-strip">
      <div className="di-fam-bar">
        <p className="di-face-plate">
          {open.length ? t('famNight.left', { n: open.length }) : t('famNight.clear')}
        </p>
        {families.map((family) => (
          <button
            key={family.id}
            className="di-fam-go"
            type="button"
            onClick={() => goHash('/family', { id: family.id })}
          >
            {family.name}
          </button>
        ))}
      </div>
      <ol className="di-fam-list">
        {rows.map((row) => {
          const done = row.answer && row.answer.status !== 'skip'
          const noped = row.answer && row.answer.status === 'skip'
          return (
            <li className={done ? 'di-fam-row is-done' : 'di-fam-row'} key={row.lamp.id}>
              <span className="di-fam-copy">
                <strong>{row.lamp.question}</strong>
                <em>
                  {row.family.name}
                  {row.lamp.cadence !== 'daily' ? ` · ${familyLampMeta(row.lamp)}` : ''}
                  {row.lamp.cadence === 'every' ? ` · ${sharedLastLine(row.last, row.night, row.lastName)}` : ''}
                </em>
              </span>
              {/* Both stay tappable after an answer, so a mistake is one
                  tap to fix rather than something you live with. */}
              <button
                className={done ? 'di-did di-did-small is-on' : 'di-did di-did-small'}
                type="button"
                disabled={busy === row.lamp.id}
                aria-pressed={done}
                onClick={() => tap(row, 'yes')}
              >
                {done ? t('famNight.did') : t('famNight.do')}
              </button>
              <button
                className={noped ? 'di-key is-pick' : 'di-key'}
                type="button"
                disabled={busy === row.lamp.id}
                aria-pressed={noped}
                onClick={() => tap(row, 'skip')}
              >
                {t('famNight.nope')}
              </button>
            </li>
          )
        })}
      </ol>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
    </section>
  )
}
