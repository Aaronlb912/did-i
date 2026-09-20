# did-i.app

One Vite build serves the marketing site and the app.

## URLs

| Path | What |
|------|------|
| `/` | Landing page |
| `/download` | Android and iPhone download picks |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |

The web app at `/app` is **off in production** unless you set
`VITE_WEB_APP_PUBLIC=true` on Vercel. Local dev serves `/app` by default
so you can test beside the marketing site.

When the web app is on, in-app screens use hash routes on `/app`
(`/app#/tonight`, etc.).

## Local

```
npm start
```

- http://127.0.0.1:48741/ (landing)
- http://127.0.0.1:48741/download (download)
- http://127.0.0.1:48741/app (app)
- http://127.0.0.1:48741/privacy (privacy)

The home page is a waitlist landing with a live phone demo. Emails land in
`public.waitlist` (see `supabase/waitlist.sql`).

## Deploy on Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
3. Environment variables (Project → Settings → Environment Variables):

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_LEGAL_EMAIL` = `support@did-i.app`
   - `VITE_WEB_APP_URL` = `https://did-i.app`
   - Do **not** set `VITE_WEB_APP_PUBLIC` unless you want `/app` live

   Use the same values as `.env.local`. Never commit `.env.local`. Gem packs
   sell through in-app purchases on native builds (`docs/iap.md`), not the web.

4. Add domain **did-i.app** under Project → Settings → Domains.
5. At your DNS host, point `did-i.app` at Vercel (A/CNAME records Vercel shows you).
   Remove old GitHub Pages A records if you used those.

`vercel.json` rewrites all paths to `index.html` so `/privacy` and `/app`
load the SPA. Static assets in `dist/assets/` are served as files first.

Manual deploy:

```
npm run build
```

Upload `dist/` anywhere with the same SPA fallback if not using Vercel.

## Android / native

The Capacitor app skips the marketing site and opens the app shell
directly. Store listing privacy URL: `https://did-i.app/privacy`.
