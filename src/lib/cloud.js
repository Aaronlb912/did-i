import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

const URL = env('VITE_SUPABASE_URL')
const KEY = env('VITE_SUPABASE_ANON_KEY')

let client = null
let built = false

export function cloudSetUp() {
  return Boolean(URL && KEY)
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
      },
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
