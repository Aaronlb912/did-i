# Sign in with Apple

Email codes stay the default. Apple is optional and only shows when
`VITE_APPLE_AUTH` is `1` in `env.client.js` (and EAS production env after you
ship a build with the flag).

## 1. Apple Developer

1. [Identifiers](https://developer.apple.com/account/resources/identifiers/list) →
   **com.aaronbryant.didi** → enable **Sign In with Apple** → Save.
2. **Identifiers** → **+** → **Services IDs**:
   - Description: `Did I web sign-in`
   - Identifier: `com.aaronbryant.didi.signin` (use this as `APPLE_SERVICES_ID`)
   - Enable **Sign In with Apple** → Configure → Primary App ID
     **com.aaronbryant.didi**
   - Domains (one per line): `did-i.app` and
     `lsvvxslgizihbktqoybt.supabase.co` (Apple rejects some comma-only
     pastes; use the portal text areas, not comma lists)
   - Return URLs:
     - `https://lsvvxslgizihbktqoybt.supabase.co/auth/v1/callback`
     - `https://did-i.app/app`
3. **Keys** → **+** → enable **Sign In with Apple** (can be a new key; not the
   push-only key). Download the `.p8` once.

## 2. Supabase

In `.env.local` (not committed). Live key: **`ZBZYW8K8NZ`**, file
`AuthKey_ZBZYW8K8NZ.p8` at repo root.

```
APPLE_SERVICES_ID=com.aaronbryant.didi.signin
APPLE_SIGNIN_KEY_ID=ZBZYW8K8NZ
APPLE_SIGNIN_KEY_PATH=C:\Users\aaron\Documents\did-i\AuthKey_ZBZYW8K8NZ.p8
APPLE_TEAM_ID=2ZUKFKSSV8
SUPABASE_ACCESS_TOKEN=<dashboard token — regenerate if setup returns 401>
```

Then:

```powershell
npm run auth:setup
npm run apple:auth:setup
```

`apple:auth:setup` turns on the Apple provider, sets the Services ID first,
adds `com.aaronbryant.didi` as an additional client ID (native), and refreshes
redirect URLs.

The Apple **client secret JWT expires in six months**. Re-run
`npm run apple:auth:setup` before it lapses (calendar reminder).

## 3. Show the button in the app

In `env.client.js`:

```js
VITE_APPLE_AUTH: '1',
```

For EAS production, add the same name/value in project environment variables.

Rebuild iOS after `usesAppleSignIn` / `expo-apple-authentication` change.

## 4. Prove it

- **iPhone (store or dev client):** Account → **Sign in with Apple** under email.
- **Web:** `did-i.app/app` → Account → same button → Apple → back with session.
- App Review: note Apple sign-in works alongside `support@did-i.app` email codes.

## Code map

- `src/lib/apple-sign-in.js` — web OAuth
- `src/lib/apple-sign-in.native.js` — iOS `signInWithIdToken`
- `src/lib/AuthAppleSignIn.jsx` — web UI
- `native/components/AuthAppleSignIn.jsx` — Apple system button
