// Signing in to the App Store Server API and the Play Developer API, for the
// refund functions (apple-notify, play-voided). Same secrets as gem-iap.

export const APP_ID = 'com.aaronbryant.didi'

function b64url(bytes: Uint8Array | string) {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
  let s = ''
  for (const b of raw) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// The middle of a JWS, read without checking it: callers ask the store again.
export function jwsPayload(jws: string) {
  const part = String(jws || '').split('.')[1] || ''
  const pad = part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4)
  return JSON.parse(atob(pad))
}

export function pemBytes(pem: string) {
  const body = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
}

export async function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, key: CryptoKey, algo: AlgorithmIdentifier | EcdsaParams) {
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const sig = new Uint8Array(await crypto.subtle.sign(algo, key, new TextEncoder().encode(input)))
  return `${input}.${b64url(sig)}`
}

// Apple: the transaction as the App Store has it now, from production or the
// sandbox. null when Apple does not know it or is not set up.
export async function appleTransaction(transactionId: string): Promise<Record<string, unknown> | null> {
  const keyId = Deno.env.get('APPLE_IAP_KEY_ID') || ''
  const issuer = Deno.env.get('APPLE_IAP_ISSUER_ID') || ''
  const pem = Deno.env.get('APPLE_IAP_PRIVATE_KEY') || ''
  if (!keyId || !issuer || !pem || !/^\d{6,32}$/.test(transactionId)) return null
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const now = Math.floor(Date.now() / 1000)
  const jwt = await signJwt(
    { alg: 'ES256', kid: keyId, typ: 'JWT' },
    { iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1', bid: APP_ID },
    key,
    { name: 'ECDSA', hash: 'SHA-256' },
  )
  for (const host of ['api.storekit.itunes.apple.com', 'api.storekit-sandbox.itunes.apple.com']) {
    const res = await fetch(`https://${host}/inApps/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    if (res.status === 404 || (res.status === 401 && host.startsWith('api.storekit.'))) continue
    if (!res.ok) return null
    const { signedTransactionInfo } = await res.json()
    return jwsPayload(String(signedTransactionInfo || ''))
  }
  return null
}

// Google: an access token for the Play Developer API, '' when not set up.
export async function playToken(): Promise<string> {
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') || ''
  if (!raw) return ''
  const account = JSON.parse(raw)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemBytes(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const now = Math.floor(Date.now() / 1000)
  const assertion = await signJwt(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 600,
    },
    key,
    { name: 'RSASSA-PKCS1-v1_5' },
  )
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) return ''
  const { access_token } = await res.json()
  return String(access_token || '')
}
