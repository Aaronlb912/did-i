// Sign in with Apple: take Did I off the person's Apple ID when they delete
// their account (App Store rule 5.1.1(v)). The phone asks Apple for a fresh
// authorization code just before delete_me and posts it here with the
// person's session. The code is traded for a refresh token and the token is
// revoked at once, so nothing is stored and old accounts work too.
//
// Deploy:  supabase functions deploy apple-revoke
//   (verify_jwt true in supabase/config.toml: the platform checks the token,
//   and the function reads the account from it too.)
// Secrets:
//   APPLE_TEAM_ID, APPLE_SIGNIN_KEY_ID, APPLE_SIGNIN_P8 (the Sign in with
//   Apple .p8 text; see docs/apple-sign-in.md).
//   APPLE_SIGNIN_CLIENT_ID is optional: the app's bundle id by default, which
//   is what a code from the iPhone sign-in sheet is issued for.
//
// Only the caller's own token: the id token Apple returns for the code has to
// be the Apple identity linked to the calling account, or nothing is revoked.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP_ID, jwsPayload, pemBytes, signJwt } from '../_shared/store-auth.ts'

const APPLE = 'https://appleid.apple.com'

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Apple's client secret: a short ES256 token signed with the Sign in with
// Apple key. '' when the secrets are not set.
async function clientSecret(clientId: string) {
  const team = Deno.env.get('APPLE_TEAM_ID') || ''
  const keyId = Deno.env.get('APPLE_SIGNIN_KEY_ID') || ''
  const pem = Deno.env.get('APPLE_SIGNIN_P8') || ''
  if (!team || !keyId || !pem) return ''
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const now = Math.floor(Date.now() / 1000)
  return signJwt(
    { alg: 'ES256', kid: keyId, typ: 'JWT' },
    { iss: team, iat: now, exp: now + 600, aud: APPLE, sub: clientId },
    key,
    { name: 'ECDSA', hash: 'SHA-256' },
  )
}

async function appleForm(path: string, fields: Record<string, string>) {
  return fetch(`${APPLE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(8000),
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ miss: 'signin' }, 401)
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return json({ miss: 'signin' }, 401)
  const apple = (userData.user.identities || []).find((one) => one.provider === 'apple')
  const appleSub = String(apple?.identity_data?.sub || apple?.id || '')
  if (!appleSub) return json({ miss: 'notApple' }, 400)

  let code = ''
  try {
    const text = await req.text()
    if (text.length > 4_000) return json({ miss: 'bad' }, 413)
    code = String(JSON.parse(text)?.code || '')
  } catch {
    return json({ miss: 'bad' }, 400)
  }
  if (!code || code.length > 1_000) return json({ miss: 'bad' }, 400)

  const clientId = Deno.env.get('APPLE_SIGNIN_CLIENT_ID') || APP_ID
  let secret = ''
  try {
    secret = await clientSecret(clientId)
  } catch {
    return json({ miss: 'setup' }, 503)
  }
  if (!secret) return json({ miss: 'setup' }, 503)

  try {
    const traded = await appleForm('/auth/token', {
      client_id: clientId,
      client_secret: secret,
      code,
      grant_type: 'authorization_code',
    })
    if (!traded.ok) return json({ miss: 'apple' }, 502)
    const tokens = await traded.json()
    const refresh = String(tokens?.refresh_token || '')
    if (!refresh) return json({ miss: 'apple' }, 502)
    // Apple sent this over TLS in answer to our own call, so it is read, not verified.
    const who = String(jwsPayload(String(tokens?.id_token || ''))?.sub || '')
    // The token belongs to whoever just used Face ID, so it is revoked either way.
    // Nothing is revoked for this account's Apple identity without the match.
    const revoked = await appleForm('/auth/revoke', {
      client_id: clientId,
      client_secret: secret,
      token: refresh,
      token_type_hint: 'refresh_token',
    })
    if (who !== appleSub) return json({ miss: 'notYours' }, 403)
    if (!revoked.ok) return json({ miss: 'apple' }, 502)
  } catch {
    return json({ miss: 'apple' }, 502)
  }
  return json({ ok: true })
})
