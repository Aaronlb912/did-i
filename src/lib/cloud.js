import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

const URL = env('VITE_SUPABASE_URL')
const KEY = env('VITE_SUPABASE_ANON_KEY')

let client = null
let built = false

export function cloudSetUp() {
  return Boolean(URL && KEY)
}

// The phone app says which device made each request (the same key as the
// devices table), so a silent wake (supabase/wake-push.sql) skips the phone
// that answered. Native only: the website keeps its usual request headers.
function fetchFromDevice(input, init = {}) {
  let device = ''
  try {
    device = localStorage.getItem('did-i-device') || ''
  } catch {
    device = ''
  }
  if (!device) return fetch(input, init)
  const headers = new Headers(init.headers || {})
  headers.set('x-didi-device', device.slice(0, 128))
  return fetch(input, { ...init, headers })
}

// Where a widget or watch posts an answer with its answer key. The anon key
// is public (it ships in the app); the answer key is what grants the write.
export function cloudEndpoint() {
  return cloudSetUp() ? { url: URL, anon: KEY } : null
}

export function cloud() {
  if (!cloudSetUp()) return null
  if (built) return client
  built = true
  try {
    client = createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: typeof document !== 'undefined' && !globalThis.__didIPlatform,
        storageKey: 'did-i-auth',
        // The phone keeps the session encrypted (native/lib/auth-store.js); the web keeps localStorage.
        ...(globalThis.__didIAuthStorage ? { storage: globalThis.__didIAuthStorage } : {}),
      },
      ...(globalThis.__didIPlatform === 'ios' || globalThis.__didIPlatform === 'android'
        ? { global: { fetch: fetchFromDevice } }
        : {}),
    })
  } catch {
    client = null
  }
  return client
}

export function cloudHost() {
  if (!URL) return ''
  try {
    return new global.URL(URL).host
  } catch {
    return URL
  }
}

export function supabaseProjectRef() {
  const m = URL.match(/https:\/\/([^.]+)\.supabase\.co/)
  return m ? m[1] : ''
}

export function supabaseSqlUrl() {
  const ref = supabaseProjectRef()
  return ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : ''
}
