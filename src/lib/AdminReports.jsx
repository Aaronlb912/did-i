import { useEffect, useState } from 'react'
import { BoardShell } from './BoardShell.jsx'
import { t, tMiss } from './i18n.js'
import { adminAct, adminReports } from './people.js'
import { usePrefs } from './prefs.js'

// Private: reached only by typing #/admin/reports. Not in any menu. The
// server decides who may see it (is_admin() in supabase/admin.sql).
const REMOVABLE = new Set(['photo', 'did_you_link', 'we_link'])

function whenText(iso) {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? '' : at.toLocaleString()
}

export function AdminReports({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const [rows, setRows] = useState(null)
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState('')
  const [rowMiss, setRowMiss] = useState({})

  useEffect(() => {
    let alive = true
    adminReports().then((out) => {
      if (!alive) return
      setRows(out.rows)
      if (out.miss === 'out') setMiss(t('admin.signIn'))
      else if (out.miss === 'admin') setMiss(t('admin.notAllowed'))
      else if (out.miss) setMiss(tMiss(out.miss))
    })
    return () => {
      alive = false
    }
  }, [])

  async function act(row, kind) {
    const name = row.about_name || t('people.someone')
    if (kind === 'remove' && !window.confirm(t('admin.removeAsk'))) return
    if (kind === 'ban' && !window.confirm(t('admin.banAsk', { name }))) return
    setBusy(row.id)
    setRowMiss((m) => ({ ...m, [row.id]: '' }))
    const out = await adminAct(row.id, kind)
    setBusy('')
    if (out.miss) {
      setRowMiss((m) => ({ ...m, [row.id]: t('admin.fail') }))
      return
    }
    setRows((list) =>
      (list || []).map((r) => {
        if (r.id === row.id) return { ...r, status: out.status, about_banned: r.about_banned || kind === 'ban' }
        if (kind === 'ban' && r.about_id && r.about_id === row.about_id) return { ...r, about_banned: true }
        return r
      }),
    )
  }

  return (
    <BoardShell book={book} now={clock} title={t('admin.title')}>
      <section className="di-page di-set di-admin">
        <h2 className="di-page-title">{t('admin.title')}</h2>
        {miss ? <p className="di-set-note" role="alert">{miss}</p> : null}
        {rows === null ? <p className="di-set-note">{t('family.loading')}</p> : null}
        {rows && !rows.length && !miss ? <p className="di-set-note">{t('admin.none')}</p> : null}
        <ul className="di-admin-list">
          {(rows || []).map((row) => {
            const open = row.status === 'open'
            const off = busy === row.id
            return (
              <li key={row.id} className="di-admin-row" data-status={row.status}>
                <p className="di-admin-head">
                  <strong>{t(`admin.kind.${row.kind}`)}</strong>
                  <span>{t(`admin.status.${row.status}`)}</span>
                  <em>{whenText(row.made_at)}</em>
                </p>
                <p className="di-admin-reason">{row.reason}</p>
                <p className="di-admin-who">
                  {t('admin.from', { name: row.from_name || row.from_id || t('people.someone') })}
                  {' · '}
                  {t('admin.about', { name: row.about_name || row.about_id || t('people.someone') })}
                  {row.about_banned ? ` · ${t('admin.isBanned')}` : ''}
                </p>
                {open ? (
                  <div className="di-hang-actions">
                    <button className="di-did di-did-small" type="button" disabled={off} onClick={() => act(row, 'dismiss')}>
                      {t('admin.dismiss')}
                    </button>
                    {REMOVABLE.has(row.kind) ? (
                      <button className="di-did di-did-small" type="button" disabled={off} onClick={() => act(row, 'remove')}>
                        {t('admin.remove')}
                      </button>
                    ) : null}
                    {row.about_id && !row.about_banned ? (
                      <button className="di-did di-did-small" type="button" disabled={off} onClick={() => act(row, 'ban')}>
                        {t('admin.ban')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {rowMiss[row.id] ? <p className="di-miss" role="alert">{rowMiss[row.id]}</p> : null}
              </li>
            )
          })}
        </ul>
      </section>
    </BoardShell>
  )
}
