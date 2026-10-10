// Drains report_mail_queue: one plain email per new report to every admin.
//
// Deploy:   supabase functions deploy report-mail
// Secrets:  supabase secrets set RESEND_API_KEY=... (REPORT_MAIL_FROM optional)
// Schedule: the report-mail pg_cron job in supabase/admin-mail.sql, every 5 minutes.

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

  let sent = 0
  let failed = 0
  for (const row of (batch.data ?? []) as Row[]) {
    let err = ''
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: sender,
          to,
          subject: `Did I report: ${row.kind}`,
          text: message(row),
        }),
      })
      if (!res.ok) err = `resend ${res.status}: ${(await res.text()).slice(0, 300)}`
    } catch (e) {
      err = String(e).slice(0, 300)
    }
    await db.rpc('report_mail_done', { row_id: row.id, err })
    if (err) failed += 1
    else sent += 1
  }

  return Response.json({ sent, failed })
})
