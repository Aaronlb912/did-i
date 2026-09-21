# Preview on iPhone (from Windows)

Did I uses native modules (MMKV, IAP, notifications), so **Expo Go will not
work**. You need a **development build** on the phone and Metro on your PC.

## One-time setup

### 1. Expo account

You already have project id `030275bb-f42d-47fd-9f6c-4d3c6a76ecc8` in
`app.json`. Log in:

```bash
npx eas-cli login
```

### 2. Apple Developer

An Apple Developer account ($99/year) is required to install a dev build on
a physical iPhone. EAS can manage credentials when you run the first build.

### 3. Register your iPhone

```bash
npm run ios:device
```

Open the link on the iPhone, install the profile, then confirm in the
terminal. EAS needs your device UDID for internal installs.

### 4. Build the iOS dev client

```bash
npm run ios:build
```

First run asks about Apple credentials; let EAS create them unless you
already have certs. When the build finishes, open the install link **on the
iPhone** and install **Did I**.

This build is good until you add or change a native dependency. JS-only
changes reload from Metro.

### 5. Env on the phone

`.env.local` is baked in at build time through `app.config.js`. Set at least:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_LEGAL_EMAIL` (optional for legal screens)

Rebuild after changing env vars.

## Every dev session

### 1. Start Metro with tunnel

```bash
npm run expo:dev
```

`--tunnel` lets the iPhone reach your Windows PC even when Wi‑Fi is picky.
LAN-only works if phone and PC share the same network; use
`npm run expo` instead.

### 2. Open the app on the iPhone

Launch **Did I** (the dev build, not Expo Go). It should connect to Metro
and load the bundle.

If it does not connect:

- Shake the phone → **Enter URL manually** → paste the `exp://` URL from the
  terminal
- Or scan the QR code in the terminal with the iPhone camera

### 3. Reload

Save a file in the repo; the app reloads. Shake → **Reload** if it sticks.

## Scripts

| Command | What |
|---------|------|
| `npm run expo:dev` | Metro + dev client + tunnel |
| `npm run expo` | Metro + dev client (LAN) |
| `npm run ios:build` | EAS development build for iPhone |
| `npm run ios:device` | Register this iPhone with EAS |

## Troubleshooting

**“Unable to load script”** — Metro is not running, or the phone cannot reach
the PC. Use `npm run expo:dev` (tunnel).

**Build fails on credentials** — Run `eas credentials` or answer the prompts
on the next `ios:build`.

**Gems / IAP** — Store purchases need the dev build on a real device and
server setup in `docs/iap.md`. Everything else works in the dev client.

**Android instead** — You already have `android/` checked in. On a device or
emulator: `npm run android:build` then `npm run expo:dev`.
