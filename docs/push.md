# Push

Set up and running as of 2026-09-20.

Firebase project `did-i-a235d`, Android app `com.aaronbryant.didi`,
owned by abryantdev@gmail.com. `android/app/google-services.json` is in
place; Expo's Android build picks it up once that file
exists.

## What runs without anybody touching it

A Did I sent to a friend, or a friend request, fires a trigger that
drops a row in `push_queue`. `pg_cron` calls the `push` edge function
every minute. The function signs a JWT with the Firebase service
account, swaps it for a Google access token, and posts each nudge to
FCM. Tokens Firebase calls dead get cleared off the device row.

The three FCM secrets live in Supabase secrets, not in the repo. The
service account JSON is at `C:\Users\aaron\Documents\did-i-secrets\`
and belongs nowhere near git.

The function has `verify_jwt` on, so only the cron job holding the
service role key can drain the queue. A stranger hitting the URL gets
401.

## What was proved, and how

- Google OAuth from the service account: the function reached FCM, so
  the JWT signing and token swap work.
- FCM actually answered: a deliberately fake token came back
  `INVALID_ARGUMENT`, which is the right answer to a fake token.
- Dead tokens get cleared: that fake token was removed from the device
  row in the same run.
- The cron drains on its own: a queued row was gone within a minute,
  with two successful runs and no failures.
- The phone registers: logcat shows the listeners attached and the
  registration event delivered, with no error.

## The one thing not proved end to end

A notification actually landing on a phone. That needs a signed-in
device, because the app only stores its token once there is an account
to store it against. Sign in on the phone, allow notifications, then
have a second account send you a Did I with the app closed.

If it does not arrive, look here first:

```sql
select id, title, body, made_at, sent_at from public.push_queue
order by made_at desc limit 20;
```

A row with `sent_at` filled and nothing on the phone means Firebase
refused the token. The function returns a `trouble` object naming the
reason, which is the fastest way to tell a dead token from a bad key.

## iPhone

The **sender** (`push` function + `apns` block) and **app** (`native/shim/push.js`,
`expo-notifications`) are wired for iOS. What is left is **Firebase + Apple account
setup** and a **new EAS iOS build** after `GoogleService-Info.plist` is in place.

Step-by-step: **`docs/push-ios.md`**.

Remote push needs a **real iPhone** and a **paid** Apple Developer account. It does
not behave like the Android emulator.

## Two bugs this shook out

The plugin is a proxy that forwards every property to native, so
returning it from an `async function` made the runtime call `.then()` on
it and the app threw `PushNotifications.then() is not implemented on
android`. It is wrapped in an object now.

Listeners were being attached after the permission prompt, and logcat
showed `No listeners found for event registration`, meaning the very
first token was dropped. Listeners go on first now.

And a third, found while answering a question about iPhones: the sender
asked for a notification channel called `did-i` that nothing ever
created. Android throws away a notification aimed at a channel that does
not exist and does not log a reason. Every push would have vanished on
Android 8 and later. The app creates the channel before registering now.

## Checking it

`push_queue` fills whether or not Firebase is wired up, so a row landing
there means the app side works and only the sending is missing.

```sql
select id, title, body, made_at, sent_at from public.push_queue
order by made_at desc limit 20;
```

A row with `sent_at` filled and no notification on the phone means
Firebase rejected the token. The function clears tokens Firebase calls
dead, so a device row with a null `push_token` after a run is the app
having been removed or reinstalled.

## What it says

The notification shows who it is from and the question, because a nudge
you cannot read is useless. It never says anything about who else is in
a family, and a cheer only ever says a cheer arrived.
