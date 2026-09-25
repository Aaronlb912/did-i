// Public client config baked into web and native builds.
// The Supabase anon key is not a secret; row access is gated by RLS.
// Override locally with .env.local when you need a different project.

export const CLIENT_ENV = {
  VITE_SUPABASE_URL: 'https://lsvvxslgizihbktqoybt.supabase.co',
  VITE_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdnZ4c2xnaXppaGJrdHFveWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzIyMjQsImV4cCI6MjEwNTQ0ODIyNH0.sE2rayvQLwlx2g3fSjraQG0loYXnYd7i7Qz-klDh29c',
  VITE_LEGAL_EMAIL: 'support@did-i.app',
  VITE_WEB_APP_URL: 'https://did-i.app',
  VITE_APPLE_AUTH: '1',
  // Google sign-in (docs/google-sign-in.md). Client IDs are public. Supabase has
  // the Google provider on (npm run google:auth:setup).
  VITE_GOOGLE_AUTH: '1',
  VITE_GOOGLE_WEB_CLIENT_ID: '761721517775-cjaehfam8tdu14ek739omgbf2pj8n1hk.apps.googleusercontent.com',
  VITE_GOOGLE_IOS_CLIENT_ID: '761721517775-esbnndhoso5jb6n7i5tvp4ac90mks7ar.apps.googleusercontent.com',
}

export function clientEnv(name) {
  const value = CLIENT_ENV[name]
  return value == null ? '' : String(value).trim()
}
