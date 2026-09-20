# did-i.app

One Vite build serves the marketing site and the app.

## URLs

| Path | What |
|------|------|
| `/` | Landing page |
| `/app` | Did I (PWA start URL) |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |

Hash routes still work for the app (`/#/tonight`, etc.) when someone
bookmarks an in-app screen.

## Local

```
npm start
```

- http://127.0.0.1:48741/ — landing
- http://127.0.0.1:48741/app — app
- http://127.0.0.1:48741/privacy — privacy

## Deploy

```
npm run build
```

Upload `dist/` to your host, or use GitHub Pages (`.github/workflows/pages.yml`).

### GitHub Pages + did-i.app

1. Repo **Settings → Pages → Build and deployment**: GitHub Actions.
2. Secrets (Settings → Secrets → Actions): `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_LEGAL_EMAIL`.
3. At your DNS host for `did-i.app`, add four **A** records pointing at GitHub:

   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

   Or **CNAME** `www` → `aaronlb912.github.io` if you only use `www.did-i.app`.

4. In GitHub **Settings → Pages → Custom domain**, enter `did-i.app`.
   `public/CNAME` in the repo should match.

Push to `master` (or `main`) runs the workflow and deploys `dist/`.

**SPA fallback** so `/privacy` loads `index.html`:

- Netlify / Cloudflare Pages: `public/_redirects` is included
- GitHub Pages: `public/404.html` is a copy of `index.html`
- Vercel: add `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` if needed

Set env at build time:

- `VITE_LEGAL_EMAIL`
- `VITE_WEB_APP_URL=https://did-i.app`
- Supabase and Stripe vars if accounts are live

## Android / native

The Capacitor app skips the marketing site and opens the app shell
directly. Store listing privacy URL: `https://did-i.app/privacy`.
