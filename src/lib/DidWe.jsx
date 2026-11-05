import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { readAmount, togetherLine, wePutAmount, weTrackAmount, weWeekTotals } from './social-amounts.js'
import { BoardShell } from './BoardShell.jsx'
import { pullAndMerge, SHELF_IN } from './cloud-sync.js'
import {
  WE_GOALS,
  useWeTonight,
  weAnswer,
  weCheerStageIfDone,
  weAsk,
  weBest,
  weClaim,
  weEdit,
  weFile,
  weGoal,
  weKnownPeople,
  weLeave,
  weClose,
  weNotTonightLine,
  weMake,
  noteAsked,
  reportWe,
  weMine,
  weMonth,
  weNextMilestone,
  weNudge,
  weReply,
  weStreak,
  weTimeReady,
  weTonight,
  weWaiting,
  weRestart,
} from './did-we.js'
import { WE_LINK_MISS, joinWeLink, lookUpWeLink, saveWebWeLink } from './did-you-links.js'
import { refreshWeNights } from './we-nights.js'
import { needsName, saveName } from './people.js'
import { readPrefs } from './prefs.js'
import { weFaceRow, weRuleKey, weStatus } from './we-look.js'
import { clockWords } from './hall-pages.js'
import { shelfTopics } from './board-json.js'
import { readShelf } from './board-shelf.js'
import { t, tMiss } from './i18n.js'
import { fireCheer, normalizePurse } from './purse.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { SetCap, SetCard, SetField, SetSheet, SetSwitch } from './set-bits.jsx'
import { BuddyArt } from './BuddyArt.jsx'
import { LeadSwitch } from './LeadSwitch.jsx'
import { useWeCheer } from './we-cheer.js'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

function initials(name) {
  const parts = String(name || '').replace(/^@/, '').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

const FACES_SHOWN = 5

// One person: their buddy if they wear one, else their initials.
function WePerson({ person, card, big = false }) {
  return (
    <span
      className={[
        'di-we-face',
        big ? 'is-big' : '',
        person.status === 'did' ? 'is-lit' : '',
        card.mode === 'turns' && card.turn === person.id ? 'is-turn' : '',
        person.state === 'asked' ? 'is-asked' : '',
      ].join(' ')}
      title={person.name}
    >
      {person.buddy ? <BuddyArt id={person.buddy} className="di-we-face-buddy" /> : initials(person.name)}
    </span>
  )
}

function personLine(person, card) {
  if (person.state === 'asked') return t('we.pAsked')
  const bits = []
  if (card.mode === 'turns' && card.turn === person.id) bits.push(t('we.tonightsTurn'))
  if (person.status === 'did') bits.push(t('we.pDid'))
  else if (person.status === 'nope') bits.push(t('we.pNope'))
  else bits.push(t('we.pWaiting'))
  return bits.join(' · ')
}

// The first five faces, then +N. Click for everyone on the card.
export function WeFaces({ card, cheer }) {
  const [open, setOpen] = useState(false)
  const { shown, more } = weFaceRow(card, FACES_SHOWN)
  const listed = card.people || []

  return (
    <>
      <button
        type="button"
        className="di-we-faces"
        aria-label={`${t('we.onCard')}: ${t('we.countLine', { n: card.dids, total: card.total })}`}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
      >
        {shown.map(({ person: p, dot }) => (
          <span key={p.id} className="di-we-slot">
            <WePerson person={p} card={card} />
            {card.due ? <span className={`di-we-dot is-${dot}`} aria-hidden="true" /> : null}
          </span>
        ))}
        {more ? <span className="di-we-slot"><span className="di-we-face">{t('we.more', { n: more })}</span></span> : null}
      </button>
      {open ? (
        <SetSheet title={t('we.onCard')} onClose={() => setOpen(false)}>
          <p className="di-we-q">{card.question}</p>
          <ul className="di-we-people">
            {listed.map((p) => (
              <li key={p.id}>
                <WePerson person={p} card={card} big />
                <span>
                  <strong>{p.me ? t('we.you') : p.name}</strong>
                  <em>{personLine(p, card)}</em>
                </span>
                {cheer?.can && !p.me && p.state === 'in' && p.status === 'did' ? (
                  <button className="di-key" type="button" disabled={Boolean(cheer.busy)} onClick={() => cheer.cheer(p)}>
                    {t('we.cheer')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {card.shows === 'count' && card.total > listed.length ? (
            <p className="di-set-note">{t('we.pCountOnly', { n: card.total - listed.length })}</p>
          ) : null}
          <p className="di-set-note">{weStatusLine(card)}</p>
          {cheer?.note ? <p className="di-set-note">{cheer.note}</p> : null}
          {cheer?.miss ? (
            <p className="di-miss" role="alert">
              {cheer.miss}
            </p>
          ) : null}
        </SetSheet>
      ) : null}
    </>
  )
}

export function weStatusLine(card) {
  const { key, vars } = weStatus(card, readPrefs().locale)
  return t(key, vars)
}

// Did we asks waiting on you, for the inbox. Nothing when there are none.
export function WeAsks() {
  const account = useAccount()
  const { cards, reload } = useWeTonight(account.user)
  const [busy, setBusy] = useState('')
  const [miss, setMiss] = useState('')
  const asks = cards.filter((card) => card.myState === 'asked')
  if (!asks.length) return null

  async function reply(card, yes) {
    setBusy(card.id)
    const out = await weReply(card.id, yes)
    setBusy('')
    setMiss(out.miss ? tMiss(out.miss) : '')
    reload()
  }

  return (
    <section className="di-fam-strip di-we-strip">
      <p className="di-face-plate">{t('we.asksTitle')}</p>
      <ol className="di-fam-list">
        {asks.map((card) => (
          <li className="di-fam-row" key={card.id}>
            <span className="di-fam-copy">
              <em>{card.askedBy ? t('we.askedBy', { name: card.askedBy }) : t('we.asked')}</em>
              <strong>{card.question}</strong>
              <em>
                {t(`we.mode.${card.mode}`)} · {t(`we.shows.${card.shows}`)}
              </em>
            </span>
            <button
              className="di-did di-did-small"
              type="button"
              disabled={busy === card.id}
              onClick={() => reply(card, true)}
            >
              {t('we.join')}
            </button>
            <button className="di-key" type="button" disabled={busy === card.id} onClick={() => reply(card, false)}>
              {t('we.noThanks')}
            </button>
          </li>
        ))}
      </ol>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
    </section>
  )
}

// Answering, shared by the strip and the Tonight card. Tapping the answer you
// already gave takes it back.
export function useWeAnswer(reload, book) {
  const [busy, setBusy] = useState('')
  const [miss, setMiss] = useState('')
  const [note, setNote] = useState('')

  async function run(id, job) {
    setBusy(id)
    const out = await job()
    setBusy('')
    setMiss(out?.miss ? tMiss(out.miss) : '')
    reload()
    return out
  }

  async function answer(card, status) {
    const mine = weMine(card)
    const takeBack = mine?.status === status
    const out = await run(card.id, () => weAnswer(card.id, takeBack ? null : status))
    if (takeBack && !out.miss) {
      // The widget still shows the old answer and would put it back on the
      // next merge. Fresh nights, then the shelf event redraws it (native).
      await refreshWeNights().catch(() => {})
      window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: readShelf() }))
    }
    if (out.miss || !out.finished) return
    const purse = normalizePurse(book)
    if (purse.cheerOn) fireCheer(purse.cheerOn, weCheerStageIfDone(card))
    const paid = await weClaim(card.id)
    if (paid.coins > 0) {
      setNote(t('we.coins', { n: paid.coins }))
      pullAndMerge().catch(() => {})
    }
  }

  return { busy, miss, note, setNote, run, answer }
}

export function weOpenForMe(cards, now = new Date()) {
  return (cards || []).filter(
    (card) => card.myState === 'in' && card.due && !card.done && !weMine(card)?.status && weTimeReady(card, now),
  )
}

// The Tonight card for a Did we, once your own questions are through.
export function WeFace({ cards, ans }) {
  const open = weOpenForMe(cards)
  if (!open.length) return null
  const card = open[0]
  return (
    <section className="di-face di-we-face-card">
      <p className="di-face-plate">
        {t('we.title')}
        {open.length > 1 ? ` · ${open.length}` : ''}
      </p>
      <h2 className="di-question">{card.question}</h2>
      <WeFaces card={card} />
      <p className="di-detail-meta">{weStatusLine(card)}</p>
      <div className="di-hang-actions">
        <button className="di-key" type="button" disabled={ans.busy === card.id} onClick={() => ans.answer(card, 'nope')}>
          {t('we.nope')}
        </button>
        <button
          className="di-did di-did-small"
          type="button"
          disabled={ans.busy === card.id}
          onClick={() => ans.answer(card, 'did')}
        >
          {t('we.did')}
        </button>
      </div>
    </section>
  )
}

// Your shared questions, for People. Each opens its page. Nothing when none.
export function WeList() {
  const account = useAccount()
  const { cards } = useWeTonight(account.user)
  const live = cards.filter((card) => card.myState === 'in')
  if (!live.length) return null
  return (
    <ol className="di-fam-list di-we-list">
      {live.map((card) => {
        const streak = weStreak(card)
        const goal = weGoal(card)
        return (
          <li className={card.done ? 'di-fam-row di-we-row is-done' : 'di-fam-row di-we-row'} key={card.id}>
            <button className="di-fam-copy di-we-open" type="button" onClick={() => goHash('/we', { id: card.id })}>
              <strong>{card.question}</strong>
              <WeFaces card={card} />
              <em>
                {card.folder ? `${card.folder} · ` : ''}
                {card.due ? weStatusLine(card) : weNotTonightLine(card, readPrefs().locale)}
                {streak > 0 ? ` · ${t('we.streak', { n: streak })}` : ''}
                {goal ? ` · ${t('we.goalLine', { n: goal.done, goal: goal.goal })}` : ''}
              </em>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

// Did, Nope and nudge on a card's page. Tapping your answer again takes it back.
function WeActs({ card, ans, cheer }) {
  if (!card.due) return null
  const mine = weMine(card)
  const nudgeable = !card.done ? weWaiting(card).filter((p) => !p.nudged) : []
  // Someone already said did: no nudge, a cheer instead.
  const cheerable = cheer?.can ? (card.people || []).filter((p) => !p.me && p.state === 'in' && p.status === 'did') : []
  return (
    <>
      <div className="di-hang-actions">
        <button
          className={mine?.status === 'did' ? 'di-did di-did-small is-on' : 'di-did di-did-small'}
          type="button"
          aria-pressed={mine?.status === 'did'}
          disabled={ans.busy === card.id}
          onClick={() => ans.answer(card, 'did')}
        >
          {mine?.status === 'did' ? t('we.youDid') : t('we.did')}
        </button>
        <button
          className={mine?.status === 'nope' ? 'di-key is-pick' : 'di-key'}
          type="button"
          aria-pressed={mine?.status === 'nope'}
          disabled={ans.busy === card.id}
          onClick={() => ans.answer(card, 'nope')}
        >
          {t('we.nope')}
        </button>
        {nudgeable.map((p) => (
          <button
            key={p.id}
            className="di-key"
            type="button"
            disabled={ans.busy === card.id}
            onClick={async () => {
              const out = await ans.run(card.id, () => weNudge(card.id, p.id))
              if (!out?.miss) ans.setNote(t('confirm.nudged', { name: p.name }))
            }}
          >
            {t('we.nudge', { name: p.name })}
          </button>
        ))}
        {cheerable.map((p) => (
          <button
            key={'cheer-' + p.id}
            className="di-key"
            type="button"
            disabled={Boolean(cheer.busy)}
            onClick={() => cheer.cheer(p)}
          >
            {t('we.cheerName', { name: p.name })}
          </button>
        ))}
      </div>
      {cheer?.note ? <p className="di-set-note di-we-note">{cheer.note}</p> : null}
      {cheer?.miss ? (
        <p className="di-miss" role="alert">
          {cheer.miss}
        </p>
      ) : null}
      {ans.note ? <p className="di-set-note di-we-note">{ans.note}</p> : null}
      {ans.miss ? (
        <p className="di-miss" role="alert">
          {ans.miss}
        </p>
      ) : null}
    </>
  )
}

export function usePeople() {
  const [people, setPeople] = useState(null)
  useEffect(() => {
    let alive = true
    weKnownPeople().then((rows) => alive && setPeople(rows || []))
    return () => {
      alive = false
    }
  }, [])
  return people
}

export function Pick({ items, value, onPick, label, multi }) {
  return (
    <div className="di-hang-chips" role="group" aria-label={label}>
      {items.map((item) => {
        const on = multi ? value.includes(item.id) : value === item.id
        return (
          <button
            key={item.id}
            className={on ? 'di-key is-pick' : 'di-key'}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(multi ? (on ? value.filter((v) => v !== item.id) : [...value, item.id]) : item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function PeoplePick({ people, picked, onPick, skip = [] }) {
  if (people === null) return <p className="di-set-note">{t('we.loadingPeople')}</p>
  const open = people.filter((p) => !skip.includes(p.id))
  if (!open.length) {
    return (
      <>
        <p className="di-set-note">{t('we.noPeople')}</p>
        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={() => goHash('/people')}>
            {t('we.findPeople')}
          </button>
        </div>
      </>
    )
  }
  return <Pick multi label={t('we.who')} value={picked} onPick={onPick} items={open.map((p) => ({ id: p.id, label: p.name }))} />
}

function RulesForm({ draft, setDraft }) {
  const set = (key) => (value) => setDraft({ ...draft, [key]: value })
  return (
    <>
      <label className="di-field">
        <span>{t('we.question')}</span>
        <input
          value={draft.question}
          maxLength={200}
          placeholder={t('we.questionHint')}
          onChange={(event) => set('question')(event.target.value)}
        />
      </label>
      <SetCap>{t('we.howDone')}</SetCap>
      <Pick label={t('we.howDone')} value={draft.mode} onPick={set('mode')} items={['all', 'any', 'most', 'turns'].map((id) => ({ id, label: t(`we.mode.${id}`) }))} />
      <p className="di-set-note">{t(`we.modeNote.${draft.mode}`)}</p>
      <SetCap>{t('we.whatShows')}</SetCap>
      <Pick label={t('we.whatShows')} value={draft.shows} onPick={set('shows')} items={['waiting', 'all', 'count'].map((id) => ({ id, label: t(`we.shows.${id}`) }))} />
      <p className="di-set-note">{t(`we.showsNote.${draft.shows}`)}</p>
      <SetCap>{t('we.when')}</SetCap>
      <Pick
        label={t('we.when')}
        value={draft.cadence}
        onPick={set('cadence')}
        items={[
          { id: 'daily', label: t('we.daily') },
          { id: 'weekly', label: t('we.someDays') },
        ]}
      />
      {draft.cadence === 'weekly' ? (
        <Pick
          multi
          label={t('we.someDays')}
          value={draft.weekdays}
          onPick={(days) => set('weekdays')([...days].sort())}
          items={DAYS.map((day) => ({ id: day, label: t(`we.day.${day}`) }))}
        />
      ) : null}
      <SetCap>{t('we.challenge')}</SetCap>
      <Pick
        label={t('we.challenge')}
        value={draft.goal || 0}
        onPick={(n) => set('goal')(n || null)}
        items={[{ id: 0, label: t('we.noEnd') }, ...WE_GOALS.map((n) => ({ id: n, label: t('we.nights', { n }) }))]}
      />
      <SetCap>{t('hang.secSchedule')}</SetCap>
      <label className="di-field">
        <span>{t('hang.timeRow')}</span>
        <input type="time" value={draft.askAfter || ''} onChange={(event) => set('askAfter')(event.target.value)} />
      </label>
      <p className="di-set-note">{t('we.timeHint')}</p>
      <label className="di-field di-we-check">
        <input
          type="checkbox"
          checked={draft.remind !== false}
          onChange={(event) => set('remind')(event.target.checked)}
        />
        <span>{t('hang.reminder')}</span>
      </label>
      <SetCap>{t('hang.secOrganize')}</SetCap>
      <label className="di-field">
        <span>{t('hang.notes')}</span>
        <textarea
          value={draft.note || ''}
          maxLength={300}
          placeholder={t('we.notePh')}
          onChange={(event) => set('note')(event.target.value)}
        />
      </label>
    </>
  )
}

// Your own folder and topics for a card. Suggestions come from your shelf.
function FilingFields({ folder, topics, onFolder, onTopics }) {
  const shelf = readShelf().boards.filter((book) => !book.archived)
  const titles = [...new Set(shelf.map((book) => String(book.title || '').trim()).filter(Boolean))]
  return (
    <>
      <label className="di-field">
        <span>{t('hang.tag')}</span>
        <input
          list="di-we-folders"
          value={folder || ''}
          maxLength={60}
          placeholder={t('we.noFolder')}
          onChange={(event) => onFolder(event.target.value)}
        />
        <datalist id="di-we-folders">
          {titles.map((title) => (
            <option key={title} value={title} />
          ))}
        </datalist>
      </label>
      <label className="di-field">
        <span>{t('hang.kind')}</span>
        <input
          value={topics || ''}
          maxLength={200}
          placeholder={shelfTopics(shelf).slice(0, 3).join(', ')}
          onChange={(event) => onTopics(event.target.value)}
        />
      </label>
      <p className="di-set-note">{t('we.folderHint')}</p>
    </>
  )
}

const BLANK = {
  question: '',
  mode: 'all',
  shows: 'waiting',
  cadence: 'daily',
  weekdays: [],
  goal: null,
  askAfter: '',
  remind: true,
  note: '',
  folder: '',
  topics: '',
}

export function Shell({ book, title, plate = t('we.title'), children }) {
  const clock = new Date()
  return (
    <BoardShell book={book} now={clock} title={title} date={formatBoardDate(boardDate(clock, book.dayFoldHour))}>
      <section className="di-page di-set di-people di-we">
        <p className="di-face-plate">{plate}</p>
        {children}
      </section>
    </BoardShell>
  )
}

function NeedAccount({ book, lead = false, note = '' }) {
  return (
    <Shell book={book} title={t('we.title')}>
      {lead ? <LeadSwitch mode="we" question="" /> : null}
      <p className="di-set-note">{note || t('we.needAccount')}</p>
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => goHash('/account')}>
          {t('we.signIn')}
        </button>
      </div>
    </Shell>
  )
}

export function WeNew({ book, start = '', withId = '' }) {
  const account = useAccount()
  if (account.ready && !account.user) return <NeedAccount book={book} lead />
  return <WeNewForm book={book} start={start} withId={withId} />
}

// start fills the question from an idea; withId picks a person.
function WeNewForm({ book, start = '', withId = '' }) {
  const people = usePeople()
  const [draft, setDraft] = useState(() => ({ ...BLANK, question: start ? `${t('we.title')} ${start}` : '' }))
  const [picked, setPicked] = useState(withId ? [withId] : [])
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  // Track an amount, the same switch as the card page; saved once the card exists.
  const [track, setTrack] = useState(false)
  const [unit, setUnit] = useState('')
  // Made, but the amount did not save: say so and offer the card, never make it twice.
  const [madeId, setMadeId] = useState('')

  async function make() {
    if (draft.cadence === 'weekly' && !draft.weekdays.length) return setMiss(t('we.missDays'))
    setBusy(true)
    const out = await weMake({ ...draft, ask: picked })
    if (out.miss && !out.id) {
      setBusy(false)
      return setMiss(tMiss(out.miss))
    }
    noteAsked(picked)
    if (track) {
      const tracked = await weTrackAmount(out.id, true, unit.trim())
      if (tracked.miss) {
        setBusy(false)
        setMadeId(out.id)
        return setMiss(t('weAmount.trackLater'))
      }
    }
    setBusy(false)
    // Made, but the time, note or folder did not save: say so, offer the card.
    if (out.miss) {
      setMadeId(out.id)
      return setMiss(tMiss(out.miss))
    }
    goHash('/we', { id: out.id })
  }

  return (
    <Shell book={book} title={t('we.newTitle')}>
      <LeadSwitch mode="we" question={draft.question} />
      <p className="di-set-note">{t('we.newLead')}</p>
      <SetCap>{t('we.who')}</SetCap>
      <PeoplePick people={people} picked={picked} onPick={setPicked} />
      <RulesForm draft={draft} setDraft={setDraft} />
      <FilingFields
        folder={draft.folder}
        topics={draft.topics}
        onFolder={(folder) => setDraft((was) => ({ ...was, folder }))}
        onTopics={(topics) => setDraft((was) => ({ ...was, topics }))}
      />
      <SetCard>
        <SetSwitch label={t('weAmount.track')} sub={t('weAmount.trackSub')} on={track} onClick={() => setTrack((on) => !on)} />
        {track ? (
          <SetField
            label={t('weAmount.unit')}
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder={t('weAmount.unitPh')}
            maxLength={24}
          />
        ) : null}
      </SetCard>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      <div className="di-hang-actions">
        {madeId ? (
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/we', { id: madeId })}>
            {t('we.open')}
          </button>
        ) : (
          <button
            className="di-did di-did-small"
            type="button"
            disabled={busy || !draft.question.trim() || !picked.length}
            onClick={make}
          >
            {t('we.make')}
          </button>
        )}
      </div>
    </Shell>
  )
}

function monthIso(back) {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() - back)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const WE_IDEAS = ['we.idea.dog', 'we.idea.date', 'we.idea.gym', 'we.idea.call', 'we.idea.vitamins', 'we.idea.kitchen']

// The Did we home: asks, tonight's shared questions, all of yours, the month
// together, and a start button. Reached from the menu.
// A Did we link opened on the website (did-i.app/d/CODE, then /app#/we?link=).
// Join here and the card opens, ready to answer tonight. Signed out, the code
// is kept and sign-in brings you back (src/App.jsx).
function WeLinkJoin({ book, code }) {
  const [found, setFound] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  // No name yet: the friend request would say "Someone", so ask for one first.
  const [needName, setNeedName] = useState(false)
  const [myName, setMyName] = useState('')

  useEffect(() => {
    let alive = true
    lookUpWeLink(code).then((next) => {
      if (alive) setFound(next)
    })
    needsName().then((on) => {
      if (alive) setNeedName(on)
    }).catch(() => {})
    return () => {
      alive = false
    }
  }, [code])

  async function join(addFriend) {
    setMiss('')
    if (addFriend && needName) {
      if (!myName.trim()) return setMiss(t('friendAsk.nameFirst'))
      setBusy(true)
      const saved = await saveName(myName)
      setBusy(false)
      if (saved.miss) return setMiss(tMiss(saved.miss))
      setNeedName(false)
    }
    setBusy(true)
    const out = await joinWeLink(code, addFriend)
    setBusy(false)
    if (out.miss) return setMiss(t(WE_LINK_MISS[out.miss] || 'didYouLink.reach'))
    refreshWeNights().catch(() => {})
    goHash('/we', { id: out.card })
  }

  const name = found?.name || t('weLink.someone')
  return (
    <Shell book={book} title={t('we.title')}>
      {found === undefined ? <p className="di-set-note">{t('we.loading')}</p> : null}
      {found === null || found?.full || found?.miss ? (
        <p className="di-set-note">
          {t(found?.full ? 'weLink.full' : found?.miss ? 'didYouLink.reach' : 'didYouLink.bad')}
        </p>
      ) : null}
      {found && !found.miss && !found.full ? (
        <>
          <h2 className="di-page-title">{t('weLink.asked', { name })}</h2>
          <p className="di-set-note">{found.question}</p>
          <p className="di-set-note">{t('weLink.people', { n: found.people })}</p>
          {found.name && needName ? (
            <SetCard>
              <SetField
                label={t('people.name')}
                value={myName}
                placeholder={t('people.namePh')}
                maxLength={40}
                autoComplete="name"
                onChange={(event) => setMyName(event.target.value)}
              />
            </SetCard>
          ) : null}
          <div className="di-hang-actions">
            {found.name ? (
              <button className="di-did di-did-small" type="button" disabled={busy} onClick={() => join(true)}>
                {t('weLink.joinAdd', { name })}
              </button>
            ) : null}
            <button
              className={found.name ? 'di-key' : 'di-did di-did-small'}
              type="button"
              disabled={busy}
              onClick={() => join(false)}
            >
              {found.name ? t('weLink.join') : t('weLink.joinPlain')}
            </button>
          </div>
        </>
      ) : null}
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      <div className="di-hang-actions">
        <button className="di-key" type="button" onClick={() => goHash('/we')}>
          {t('didYouLink.no')}
        </button>
      </div>
    </Shell>
  )
}

// Paused: nobody answered 3 nights. Any member can restart it.
function WePaused({ card, onDone }) {
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  if (!card.paused || card.myState !== 'in') return null
  async function restart() {
    setBusy(true)
    const out = await weRestart(card.id)
    setBusy(false)
    setMiss(out.miss ? tMiss(out.miss) : '')
    if (!out.miss) onDone()
  }
  return (
    <div className="di-hang-actions">
      <span className="di-set-note">{t('we.paused')}</span>
      <button className="di-key" type="button" disabled={busy} onClick={restart}>
        {t('we.restart')}
      </button>
      {miss ? (
        <span className="di-miss" role="alert">
          {miss}
        </span>
      ) : null}
    </div>
  )
}

// This week's combined amounts for the cards on screen, one query. Only
// cards that track an amount come back.
function useWeTotals(ids, tick = 0) {
  const key = ids.filter(Boolean).join(',')
  const [sums, setSums] = useState(() => new Map())
  useEffect(() => {
    if (!key) return undefined
    let alive = true
    weWeekTotals(key.split(',')).then((res) => {
      if (alive) setSums(res.totals)
    })
    return () => {
      alive = false
    }
  }, [key, tick])
  return sums
}

// The maker turns an amount on (with a unit) or off; after a Did, anyone on
// the card adds their own. Only the total is shown to the others.
function WeAmount({ card, sum, didTonight, onDone }) {
  const [open, setOpen] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  const [note, setNote] = useState('')

  async function run(job, after) {
    setBusy(true)
    const out = await job()
    setBusy(false)
    if (out.miss) return setMiss(tMiss(out.miss))
    setMiss('')
    setOpen('')
    setNote(after)
    onDone()
  }

  function save() {
    if (open === 'unit') return run(() => weTrackAmount(card.id, true, text.trim()), t('confirm.saved'))
    const amount = readAmount(text)
    if (Number.isNaN(amount)) return setMiss(t('weAmount.bad'))
    return run(() => wePutAmount(card.id, amount), t('confirm.saved'))
  }

  if (!card.mine && !(sum && didTonight)) return null
  return (
    <>
      {open ? (
        <form
          className="di-note-box"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <label className="di-field">
            <span>{open === 'unit' ? t('weAmount.unit') : t('weAmount.yoursLabel')}</span>
            <input
              value={text}
              autoFocus
              maxLength={open === 'unit' ? 24 : 9}
              inputMode={open === 'unit' ? undefined : 'decimal'}
              placeholder={open === 'unit' ? t('weAmount.unitPh') : '0'}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="submit" disabled={busy}>
              {t('we.save')}
            </button>
            <button className="di-key" type="button" onClick={() => setOpen('')}>
              {t('settings.neverMind')}
            </button>
          </div>
        </form>
      ) : (
        <div className="di-hang-actions">
          {sum && didTonight ? (
            <button
              className="di-key"
              type="button"
              onClick={() => {
                setText(sum.mine == null ? '' : String(sum.mine))
                setOpen('amount')
              }}
            >
              {sum.mine == null ? t('weAmount.add') : t('weAmount.yours', { n: sum.mine, unit: sum.unit })}
            </button>
          ) : null}
          {card.mine ? (
            <button
              className="di-key"
              type="button"
              disabled={busy}
              onClick={() => {
                if (sum) return run(() => weTrackAmount(card.id, false), t('weAmount.stopped'))
                setText('')
                return setOpen('unit')
              }}
            >
              {sum ? t('weAmount.stop') : t('weAmount.track')}
            </button>
          ) : null}
        </div>
      )}
      {note ? <p className="di-set-note" role="status">{note}</p> : null}
      {miss ? <p className="di-miss" role="alert">{miss}</p> : null}
    </>
  )
}

export function WeHome({ book, onChange, link = '' }) {
  const account = useAccount()
  const { cards, reload } = useWeTonight(account.user)
  const ans = useWeAnswer(reload, book)
  const cheer = useWeCheer(book, onChange)
  // Hooks run before any early return so their order never changes.
  const mine = cards.filter((card) => card.myState === 'in')
  const sums = useWeTotals(mine.map((card) => card.id))
  if (link && account.ready && !account.user) {
    saveWebWeLink(link)
    return <NeedAccount book={book} note={t('weLink.webSignIn')} />
  }
  if (link && account.user) return <WeLinkJoin book={book} code={link} />
  if (account.ready && !account.user) return <NeedAccount book={book} />
  const month = new Date().toISOString().slice(0, 7)
  const nights = mine.reduce((sum, card) => sum + weMonth(card, month).done, 0)
  const longest = mine.map((card) => ({ card, n: weStreak(card) })).sort((a, b) => b.n - a.n)[0]

  return (
    <Shell book={book} title={t('we.title')}>
      <h2 className="di-page-title">{t('we.title')}</h2>
      <p className="di-set-note">{t('we.homeLead')}</p>
      <WeAsks />
      {!mine.length ? (
        <div className="di-we-face-card di-we-home-row">
          <h3>{t('we.emptyFriend')}</h3>
          <p className="di-set-note">{t('we.empty')}</p>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="button" onClick={() => goHash('/we/new')}>
              {t('we.newButton')}
            </button>
          </div>
          <div className="di-we-ideas">
            {WE_IDEAS.map((key) => (
              <button key={key} className="di-key" type="button" onClick={() => goHash('/we/new', { start: t(key) })}>
                {t('we.title')} {t(key)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {mine.map((card) => {
        const me = weMine(card)
        const open = card.due && !card.done && !me?.status && weTimeReady(card)
        return (
          <div className={card.due && card.done ? 'di-we-home-row is-done' : 'di-we-home-row'} key={card.id}>
            <button className="di-fam-copy di-we-open" type="button" onClick={() => goHash('/we', { id: card.id })}>
              <WeFaces card={card} />
              <strong>{card.question}</strong>
              <span className="di-we-status">
                {card.paused ? t('we.paused') : card.due ? weStatusLine(card) : weNotTonightLine(card, readPrefs().locale)}
              </span>
              {card.folder || weStreak(card) > 0 || togetherLine(sums.get(card.id)) ? (
                <em>
                  {[card.folder, weStreak(card) > 0 ? t('we.streak', { n: weStreak(card) }) : '', togetherLine(sums.get(card.id))]
                    .filter(Boolean)
                    .join(' · ')}
                </em>
              ) : null}
            </button>
            <WePaused card={card} onDone={reload} />
            {open ? (
              <div className="di-hang-actions">
                <button className="di-did di-did-small" type="button" onClick={() => ans.answer(card, 'did')}>
                  {t('we.did')}
                </button>
                <button className="di-key" type="button" onClick={() => ans.answer(card, 'nope')}>
                  {t('we.nope')}
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
      {mine.length ? (
        <>
          <SetCap>{t('we.monthTogether')}</SetCap>
          <p className="di-we-big">{t(nights === 1 ? 'we.nightsDoneOne' : 'we.nightsDone', { n: nights })}</p>
          {longest?.n ? (
            <p className="di-set-note">{t(longest.n === 1 ? 'we.longestOne' : 'we.longest', { question: longest.card.question, n: longest.n })}</p>
          ) : null}
        </>
      ) : null}
      {ans.note ? <p className="di-set-note di-we-note">{ans.note}</p> : null}
      {ans.miss ? (
        <p className="di-miss" role="alert">
          {ans.miss}
        </p>
      ) : null}
      {mine.length ? (
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/we/new')}>
            {t('we.new')}
          </button>
        </div>
      ) : null}
    </Shell>
  )
}

export function WeCard({ book, cardId, onChange }) {
  const account = useAccount()
  if (account.ready && !account.user) return <NeedAccount book={book} />
  return <WeCardPage book={book} cardId={cardId} onChange={onChange} />
}

function WeCardPage({ book, cardId, onChange }) {
  const cheer = useWeCheer(book, onChange)
  const people = usePeople()
  const [card, setCard] = useState(undefined)
  const [edit, setEdit] = useState(null)
  const [asking, setAsking] = useState([])
  const [sure, setSure] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  const ans = useWeAnswer(() => load(), book)
  const [sumTick, setSumTick] = useState(0)
  const sums = useWeTotals(card ? [card.id] : [], sumTick)
  const [filing, setFiling] = useState({ folder: '', topics: '' })
  useEffect(() => {
    if (card) setFiling({ folder: card.folder || '', topics: card.topics || '' })
  }, [card?.id, card?.folder, card?.topics])

  async function load() {
    const out = await weTonight()
    if (out.miss) setMiss(tMiss(out.miss))
    setCard(out.cards.find((c) => c.id === cardId) || null)
  }

  useEffect(() => {
    load()
  }, [cardId])

  if (card === undefined) {
    return (
      <Shell book={book} title={t('we.title')}>
        <p className="di-set-note">{t('we.loading')}</p>
      </Shell>
    )
  }
  if (!card) {
    return (
      <Shell book={book} title={t('we.title')}>
        <p className="di-set-note">{miss || t('we.gone')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/tonight')}>
            {t('we.backTonight')}
          </button>
        </div>
      </Shell>
    )
  }

  const streak = weStreak(card)
  const next = weNextMilestone(streak)
  const month = weMonth(card)
  const lastIso = monthIso(1)
  const last = weMonth(card, lastIso, `${lastIso}-31`)
  const goal = weGoal(card)
  const sum = sums.get(card.id) || null

  async function save() {
    setBusy(true)
    const out = await weEdit(card.id, edit)
    setBusy(false)
    if (out.miss) return setMiss(tMiss(out.miss))
    setEdit(null)
    setMiss('')
    load()
  }

  async function ask() {
    setBusy(true)
    for (const id of asking) {
      const out = await weAsk(card.id, id)
      if (out.miss) {
        setMiss(tMiss(out.miss))
        break
      }
    }
    setBusy(false)
    setAsking([])
    load()
  }

  async function leave() {
    const out = await weLeave(card.id)
    if (out.miss) return setMiss(tMiss(out.miss))
    goHash('/tonight')
  }

  async function close() {
    setClosing(false)
    const out = await weClose(card.id)
    if (out.miss) return setMiss(tMiss(out.miss))
    goHash('/we')
  }

  return (
    <Shell book={book} title={t('we.title')}>
      <h2 className="di-page-title">{card.question}</h2>
      <WeFaces card={card} cheer={cheer} />
      <p className={card.due && card.done ? 'di-we-status is-done' : 'di-we-status'}>
        {card.due ? weStatusLine(card) : weNotTonightLine(card, readPrefs().locale)}
      </p>
      <WePaused card={card} onDone={load} />
      <p className="di-set-note">
        {t('we.howCounts')}: {t(weRuleKey(card.mode))} · {t(`we.shows.${card.shows}`)}
        {card.askAfter ? ` · ${t('we.fromTime', { time: clockWords(card.askAfter) })}` : ''}
      </p>
      {card.note ? <p className="di-set-note">{card.note}</p> : null}
      <WeActs card={card} ans={ans} cheer={cheer} />

      <SetCap>{t('we.together')}</SetCap>
      <p className="di-we-big">{t('we.streak', { n: streak })}</p>
      <p className="di-set-note">
        {t('we.best', { n: weBest(card) })}
        {next ? ` · ${(next - streak === 1 ? t('we.nextCoinsOne') : t('we.nextCoins', { n: next - streak }))}` : ''}
      </p>
      {sum ? <p className="di-set-note">{togetherLine(sum) || t('weAmount.none')}</p> : null}
      <WeAmount card={card} sum={sum} didTonight={card.due && weMine(card)?.status === 'did'} onDone={() => setSumTick((n) => n + 1)} />
      <p className="di-set-note">{t(month.due === 1 ? 'we.thisMonthOne' : 'we.thisMonth', { n: month.done, due: month.due })}</p>
      {last.due ? <p className="di-set-note">{t('we.lastMonth', { n: last.done, due: last.due })}</p> : null}
      {goal ? (
        <p className="di-set-note">
          {goal.finished ? t('we.goalDone', { goal: goal.goal }) : t('we.goalLine', { n: goal.done, goal: goal.goal })}
        </p>
      ) : null}

      <SetCap>{t('we.people')}</SetCap>
      <ul className="di-we-people">
        {(card.people || []).map((p) => (
          <li key={p.id}>
            {p.me ? t('we.you') : p.name}
            {p.state === 'asked' ? ` · ${t('we.invited')}` : ''}
            {card.mode === 'turns' && card.turn === p.id ? ` · ${t('we.tonightsTurn')}` : ''}
          </li>
        ))}
      </ul>
      {card.shows === 'count' ? <p className="di-set-note">{t('we.countOnly', { total: card.total })}</p> : null}

      <SetCap>{t('we.yourFiling')}</SetCap>
      <FilingFields
        folder={filing.folder}
        topics={filing.topics}
        onFolder={(folder) => setFiling((was) => ({ ...was, folder }))}
        onTopics={(topics) => setFiling((was) => ({ ...was, topics }))}
      />
      {filing.folder !== (card.folder || '') || filing.topics !== (card.topics || '') ? (
        <div className="di-hang-actions">
          <button
            className="di-key"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const out = await weFile(card.id, filing.folder, filing.topics)
              setBusy(false)
              if (out.miss) return setMiss(tMiss(out.miss))
              load()
            }}
          >
            {t('we.save')}
          </button>
        </div>
      ) : null}

      <SetCap>{t('we.askMore')}</SetCap>
      <PeoplePick people={people} picked={asking} onPick={setAsking} skip={(card.people || []).map((p) => p.id)} />
      {asking.length ? (
        <div className="di-hang-actions">
          <button className="di-key" type="button" disabled={busy} onClick={ask}>
            {t('we.sendAsk')}
          </button>
        </div>
      ) : null}

      {card.mine ? (
        edit ? (
          <>
            <RulesForm draft={edit} setDraft={setEdit} />
            <div className="di-hang-actions">
              <button className="di-did di-did-small" type="button" disabled={busy || !edit.question.trim()} onClick={save}>
                {t('we.save')}
              </button>
              <button className="di-key" type="button" onClick={() => setEdit(null)}>
                {t('settings.neverMind')}
              </button>
            </div>
          </>
        ) : (
          <div className="di-hang-actions">
            <button
              className="di-key"
              type="button"
              onClick={() =>
                setEdit({
                  question: card.question,
                  mode: card.mode,
                  shows: card.shows,
                  cadence: card.cadence,
                  weekdays: card.weekdays || [],
                  goal: card.goal || null,
                  askAfter: card.askAfter || '',
                  remind: card.remind !== false,
                  note: card.note || '',
                })
              }
            >
              {t('we.edit')}
            </button>
          </div>
        )
      ) : null}

      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      {sure ? (
        <div className="di-we-sure" role="alertdialog" aria-label={t('we.leaveTitle')}>
          <p>
            <strong>{t('we.leaveTitle')}</strong>
          </p>
          <p className="di-set-note">{t('we.leaveBody')}</p>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="button" onClick={leave}>
              {t('we.leave')}
            </button>
            <button className="di-key" type="button" onClick={() => setSure(false)}>
              {t('settings.neverMind')}
            </button>
          </div>
        </div>
      ) : closing ? (
        <div className="di-we-sure" role="alertdialog" aria-label={t('we.closeTitle')}>
          <p>
            <strong>{t('we.closeTitle')}</strong>
          </p>
          <p className="di-set-note">{t('we.closeBody')}</p>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="button" onClick={close}>
              {t('we.close')}
            </button>
            <button className="di-key" type="button" onClick={() => setClosing(false)}>
              {t('settings.neverMind')}
            </button>
          </div>
        </div>
      ) : reporting ? (
        <div className="di-we-sure" role="alertdialog" aria-label={t('we.reportTitle')}>
          <p>
            <strong>{t('we.reportTitle')}</strong>
          </p>
          <p className="di-set-note">{t('we.reportBody')}</p>
          <div className="di-hang-actions">
            <button
              className="di-did di-did-small"
              type="button"
              onClick={async () => {
                setReporting(false)
                const out = await reportWe(card.id)
                if (out.miss) return setMiss(tMiss(out.miss))
                // Reporting blocks them, which takes you off this card.
                return goHash('/we')
              }}
            >
              {t('we.report')}
            </button>
            <button className="di-key" type="button" onClick={() => setReporting(false)}>
              {t('settings.neverMind')}
            </button>
          </div>
        </div>
      ) : (
        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={() => setSure(true)}>
            {t('we.leave')}
          </button>
          {card.mine ? (
            <button className="di-key" type="button" onClick={() => setClosing(true)}>
              {t('we.close')}
            </button>
          ) : null}
          <button className="di-key" type="button" onClick={() => setReporting(true)}>
            {t('we.report')}
          </button>
        </div>
      )}
    </Shell>
  )
}
