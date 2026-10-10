// Drains report_mail_queue: one daily summary email to every admin, only when there are new reports.
//
// Deploy:   supabase functions deploy report-mail
// Secrets:  supabase secrets set RESEND_API_KEY=... (REPORT_MAIL_FROM optional)
// Schedule: the report-mail pg_cron job in supabase/admin-mail.sql, daily at 13:00 UTC.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
const sender = Deno.env.get('REPORT_MAIL_FROM') || 'Did I <support@did-i.app>'
const LINK = 'https://did-i.app/app#/admin/reports'

// Only the cron job calls this, with the service_role key.
function fromCron(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const part = token.split('.')[1]
  if (!part) return false
  try {
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return claims?.role === 'service_role'
  } catch {
    return false
  }
}

type Row = {
  id: number
  kind: string
  reason: string
  made_at: string
  from_name: string
  about_name: string
}

function message(row: Row) {
  const lines = [
    `New report: ${row.kind}`,
    '',
    `Reason: ${(row.reason || '').slice(0, 300)}`,
    `From: ${row.from_name || 'someone'}`,
    `About: ${row.about_name || 'someone'}`,
    `Time: ${new Date(row.made_at).toISOString()}`,
    '',
    LINK,
  ]
  return lines.join('\n')
}

Deno.serve(async (req) => {
  if (!fromCron(req)) return new Response('not allowed', { status: 401 })
  if (!resendKey) return new Response('resend is not set up yet', { status: 503 })

  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

  const admins = await db.rpc('admin_emails')
  if (admins.error) return new Response(admins.error.message, { status: 500 })
  const to = (admins.data ?? []).map((r: { email: string }) => r.email).filter(Boolean)
  if (!to.length) return new Response('no admins', { status: 200 })

  const batch = await db.rpc('report_mail_batch', { lim: 50 })
  if (batch.error) return new Response(batch.error.message, { status: 500 })

  // One summary email a day, and none on days without new reports.
  const rows = (batch.data ?? []) as Row[]
  if (!rows.length) return Response.json({ sent: 0 })
  let err = ''
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: sender,
        to,
        subject: rows.length === 1 ? 'Did I: 1 new report' : `Did I: ${rows.length} new reports`,
        text: rows.map(message).join('\n\n----\n\n'),
      }),
    })
    if (!res.ok) err = `resend ${res.status}: ${(await res.text()).slice(0, 300)}`
  } catch (e) {
    err = String(e).slice(0, 300)
  }
  for (const row of rows) await db.rpc('report_mail_done', { row_id: row.id, err })

  return Response.json({ sent: err ? 0 : rows.length, failed: err ? rows.length : 0 })
})
