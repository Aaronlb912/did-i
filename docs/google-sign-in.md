# Sign in with Google

The code is in (`src/lib/google-sign-in*.js`, `AuthGoogleSignIn` on web and
native). The button stays hidden until `VITE_GOOGLE_AUTH` is `1` in
`env.client.js`. Phones need a new build after that (it adds a native module).

Native sign-in gets an ID token from Google and hands it to Supabase
(`signInWithIdToken`). The website uses Supabase's Google redirect.

## 1. Google Cloud (Aaron)

Use the Firebase project's Cloud project (**did-i-a235d**) so push and sign-in
share one project. https://console.cloud.google.com/apis/credentials?project=did-i-a235d

1. **OAuth consent screen**: External, app name **Did I**, support email
   `support@did-i.app`, authorized domain `did-i.app`, privacy
   `https://did-i.app/privacy`, terms `https://did-i.app/terms`. Scopes:
   `openid`, `email`, `profile` only. Publish it (Testing mode only lets test users in).
2. **Create credentials → OAuth client ID**, three times:
   - **Web application**, name `Did I web`.
     Authorized redirect URI: `https://lsvvxslgizihbktqoybt.supabase.co/auth/v1/callback`.
     Keep the client ID and client secret.
   - **iOS**, name `Did I iOS`, bundle ID `com.aaronbryant.didi`. Keep the client ID.
   - **Android**, name `Did I Android`, package `com.aaronbryant.didi`, SHA-1 of the
     **release** key (step 3). Add one more Android client per extra SHA-1 below.

## 2. Supabase (script)

Add to `.env.local` (never commit it, never paste these in chat):

```
GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_WEB_CLIENT_SECRET=...
GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=...apps.googleusercontent.com
```

Then run `npm run google:auth:setup`. It turns on the Google provider, lists all
client IDs as allowed audiences, and skips the nonce check the iOS SDK needs.

## 3. Android SHA-1 fingerprints

Google only accepts sign-in from an app signed with a key it knows. Register each
one as its own Android OAuth client (same package):

| Key | Where to get the SHA-1 |
| --- | --- |
| Release (upload) key on Expo | `npx eas-cli credentials -p android` → production → shows SHA1 |
| Play App Signing key | Play Console → Test and release → App integrity, after the first upload |
| Local debug key | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (`android/app/debug.keystore`) |

The GitHub APK without keystore secrets is signed with a throwaway key, so Google
sign-in will not work on it. Add the `ANDROID_KEYSTORE_*` secrets first
(`docs/native-rebuild.md`).

## 4. Turn it on in the app

In `env.client.js` (client IDs are public):

```js
VITE_GOOGLE_AUTH: '1',
VITE_GOOGLE_WEB_CLIENT_ID: '<web client id>',
VITE_GOOGLE_IOS_CLIENT_ID: '<ios client id>',
```

`app.config.js` turns the iOS client ID into the URL scheme the Google plugin needs.
The website picks the change up on its next deploy; phones on the next build.

## Check

- Web: Account → Sign in with Google → back on `/app`, signed in.
- iPhone and Android (release-signed build): the Google sheet opens, you land signed in.
- Same Google email as an existing email-code account signs into that account
  (Supabase links by verified email).
