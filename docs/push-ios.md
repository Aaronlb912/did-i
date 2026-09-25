# iOS push (remote)

Remote nudges use the same `push_queue` → `push` edge function → **FCM** path as
Android. Firebase talks to **APNs** once Apple credentials are linked in Firebase.

The app code is ready when these account steps are done and you ship a new iOS
build.

## 1. Firebase — add the iOS app

Project: **did-i-a235d** (same as Android).

1. [Firebase console](https://console.firebase.google.com/) as **abryantdev@gmail.com**
   (in Chrome this is often `/u/2/` if you have several Google accounts) →
   project **did-i-a235d** → Project settings → **Your apps** → **Add app** →
   **iOS** (already registered: `com.aaronbryant.didi`).
2. Bundle ID: **`com.aaronbryant.didi`** (must match `app.json`).
3. Download **`GoogleService-Info.plist`**.
4. Put it at the **repo root**:

   ```
   did-i/GoogleService-Info.plist
   ```

   `app.config.js` picks it up when the file exists. It stays out of git, but
   `.easignore` (which EAS reads instead of `.gitignore`) lets EAS upload it,
   so `npm run ios:build:store` from this folder carries it. Keep `.easignore`
   in step with `.gitignore` when you add ignores.

   GitHub **iOS IPA** writes the file from the `GOOGLE_SERVICES_PLIST` secret
   (base64 of the plist) before prebuild.

   If the file is missing locally, run `npm run ios:plist:pull`.

## 2. Apple — APNs authentication key

EAS may already have created **Expo Push Notifications Key** in the developer
portal. Firebase still needs the **`.p8` file** (Apple only lets you download
it once). If you do not have that file on disk, create a second key for Firebase
instead of revoking the Expo one.

1. [Apple Developer](https://developer.apple.com/account/resources/authkeys/list) →
   **Keys** → **+** (or reuse an existing APNs key if you still have its `.p8`).
2. Name it (e.g. `Did I Firebase Push`), enable **Apple Push Notifications service (APNs)**.
3. Download the **`.p8`** (once). Note **Key ID** and your **Team ID** (10
   characters, top right of the developer account page).

## 3. Firebase — link APNs to FCM

1. Firebase → Project settings → **Cloud Messaging** → **Apple app configuration**.
2. Under **APNs Authentication Key** → **production** row → **Upload**, add the
   `.p8`, Key ID, and Team ID. One key covers Sandbox & Production; uploading
   production is enough for App Store builds.

Until this is done, FCM returns errors like `THIRD_PARTY_AUTH_ERROR` for iPhone
tokens.

## 4. Apple — Push capability on the app ID

EAS + `expo-notifications` usually enable **Push Notifications** on
`com.aaronbryant.didi` when you build. If a build complains about entitlements,
open **Identifiers** in the developer portal and turn on Push for that App ID, then
rebuild.

## 5. New iOS build

`GoogleService-Info.plist` is baked in at **build** time, not at runtime.

```powershell
npm run ios:build:store:first
# or after credentials exist:
npm run ios:build:store
```

Install on a **real iPhone** (simulator does not get remote push the same way).

## 6. Prove it

1. Sign in on the phone, allow notifications when asked.
2. In Supabase, confirm a token on your device row:

   ```sql
   select device_key, left(push_token, 20) as token_prefix, last_seen_at
   from public.devices
   where user_id = auth.uid();
   ```

3. From a second account, send a Did I or friend request with the app closed.
4. If nothing arrives, check `push_queue` and the function response `trouble`
   field (see `docs/push.md`).

## What changed in the repo

- `app.config.js`: `GoogleService-Info.plist`, `UIBackgroundModes`, notification
  plugin background flag.
- `native/shim/push.js`: iOS sound/badge in the handler, token listener, Android
  `did-i` channel before register (matches FCM `channel_id`).
