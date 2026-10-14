// Did I auth emails: one layout, every Supabase email type.
// Preview: node scripts/email-templates.mjs --preview out.html
// Apply:   node scripts/email-templates.mjs --apply   (needs SUPABASE_ACCESS_TOKEN in .env.local)
import { readFileSync, writeFileSync } from 'node:fs'

const INK = '#f4f6fa'
const SOFT = '#a5adb9'
const LINE = '#2b3140'
const ACCENT = '#c9f24d'
const BG = '#0e1014'

// Table layout and inline styles: what email clients actually render. Dark, like the app.
function layout({ preheader, title, body, footer }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BG}" class="bg">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:${BG}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
<tr><td style="padding:0 4px 18px;font:700 20px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK}" class="ink">
<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${ACCENT};box-shadow:inset -6px -3px 0 0 ${BG};vertical-align:-3px;margin-right:8px"></span>Did I</td></tr>
<tr><td class="card" style="background:#16191f;border:1px solid ${LINE};border-radius:20px;padding:32px 28px;font:400 16px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK}">
<h1 class="ink" style="margin:0 0 12px;font:800 24px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK}">${title}</h1>
${body}
</td></tr>
<tr><td class="soft" style="padding:18px 8px 0;font:400 13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${SOFT}">${footer}<br><br>Did I · for people who forget to open habit trackers · <a href="https://did-i.app" style="color:${SOFT}">did-i.app</a></td></tr>
</table></td></tr></table></body></html>`
}

const p = (text) => `<p class="soft" style="margin:0 0 18px;color:${SOFT}">${text}</p>`
const code = (token) => `<div class="code" style="margin:6px 0 20px;padding:18px 0;text-align:center;background:#0b0d10;border:1px solid ${LINE};border-radius:14px;font:700 34px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:10px;color:${INK}">${token}</div>`
const button = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 20px"><tr><td class="btn" style="background:${ACCENT};border-radius:999px"><a href="${href}" style="display:inline-block;padding:14px 26px;font:700 16px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0e1014;text-decoration:none">${label}</a></td></tr></table>`
const notMe = "If this wasn't you, you can ignore this email. Nobody can get in without the code."
const changed = "If you didn't make this change, reply to this email and we'll help you lock your account."

export const TEMPLATES = {
  magic_link: {
    subject: '{{ .Token }} is your Did I code',
    html: layout({ preheader: 'Type this code into Did I to sign in. It works for one hour.', title: 'Your sign-in code', body: p('Type this into Did I to sign in. It works for one hour.') + code('{{ .Token }}'), footer: notMe }),
  },
  confirmation: {
    subject: '{{ .Token }} is your Did I code',
    html: layout({ preheader: 'Type this code into Did I to finish signing up.', title: 'Welcome to Did I', body: p('Type this code into the app to finish setting up your account. It works for one hour.') + code('{{ .Token }}'), footer: notMe }),
  },
  reauthentication: {
    subject: '{{ .Token }} is your Did I check code',
    html: layout({ preheader: 'Type this code to confirm it is you.', title: 'Confirm it is you', body: p('Type this code into Did I to keep going. It works for a few minutes.') + code('{{ .Token }}'), footer: notMe }),
  },
  email_change: {
    subject: 'Confirm your new email for Did I',
    html: layout({ preheader: 'Confirm {{ .NewEmail }} as your Did I email.', title: 'Confirm your new email', body: p('Tap below to use <b>{{ .NewEmail }}</b> for your Did I account.') + button('{{ .ConfirmationURL }}', 'Confirm email'), footer: "If you didn't ask for this, ignore this email and nothing changes." }),
  },
  recovery: {
    subject: 'Reset your Did I password',
    html: layout({ preheader: 'Choose a new password for Did I.', title: 'Reset your password', body: p('Tap below to choose a new password.') + button('{{ .ConfirmationURL }}', 'Choose a new password'), footer: "If you didn't ask for this, ignore this email and your password stays the same." }),
  },
  invite: {
    subject: "You're invited to Did I",
    html: layout({ preheader: 'For people who forget to open habit trackers.', title: "You're invited to Did I", body: p('Did I brings the question to you, one at a time, at the time you set. Swipe Did or Not yet, keep your streak, and see how your week went.') + button('{{ .ConfirmationURL }}', 'Accept invite'), footer: "If you weren't expecting this, you can ignore it." }),
  },
  email_changed_notification: {
    subject: 'Your Did I email was changed',
    html: layout({ preheader: 'Your Did I email is now {{ .Email }}.', title: 'Your email was changed', body: p('Your Did I account email changed from {{ .OldEmail }} to <b>{{ .Email }}</b>.'), footer: changed }),
  },
  password_changed_notification: {
    subject: 'Your Did I password was changed',
    html: layout({ preheader: 'Your Did I password was just changed.', title: 'Your password was changed', body: p('The password for your Did I account was just changed.'), footer: changed }),
  },
  identity_linked_notification: {
    subject: 'A new way to sign in to Did I',
    html: layout({ preheader: '{{ .Provider }} can now sign you in to Did I.', title: 'New sign-in added', body: p('You can now sign in to Did I with {{ .Provider }} for {{ .Email }}.'), footer: changed }),
  },
  identity_unlinked_notification: {
    subject: 'A sign-in way was removed from Did I',
    html: layout({ preheader: '{{ .Provider }} no longer signs you in to Did I.', title: 'Sign-in removed', body: p('{{ .Provider }} was removed as a way to sign in to Did I for {{ .Email }}.'), footer: changed }),
  },
}

const SAMPLE = { '{{ .Token }}': '482915', '{{ .NewEmail }}': 'new@example.com', '{{ .Email }}': 'you@example.com', '{{ .OldEmail }}': 'old@example.com', '{{ .Provider }}': 'Google', '{{ .ConfirmationURL }}': '#' }
const fill = (s) => Object.entries(SAMPLE).reduce((out, [k, v]) => out.split(k).join(v), s)

const args = process.argv.slice(2)
if (args[0] === '--preview') {
  const out = args[1] || 'email-preview.html'
  writeFileSync(out, JSON.stringify(Object.fromEntries(Object.entries(TEMPLATES).map(([k, v]) => [k, { subject: fill(v.subject), html: fill(v.html) }]))))
  console.log(`wrote ${out}`)
}
if (args[0] === '--apply') {
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]))
  const ref = (env.SUPABASE_PROJECT_REF || (env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)/)?.[1] || '')
  const body = {}
  for (const [k, v] of Object.entries(TEMPLATES)) {
    body[`mailer_subjects_${k}`] = v.subject
    body[`mailer_templates_${k}_content`] = v.html
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, { method: 'PATCH', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  console.log(res.ok ? `email templates applied (${Object.keys(TEMPLATES).length})` : `failed ${res.status}: ${(await res.text()).slice(0, 300)}`)
}
