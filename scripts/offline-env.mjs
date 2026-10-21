// Imported first by check.mjs: env.client.js holds the live project, so
// without this every test that touches cloud code called production.
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test'
