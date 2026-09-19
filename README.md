# Did I

For the question you keep asking tonight. Did I take the
evening pills. Did I lock the back door. Tap DID. Nope if
it is not that night.

No account. This phone keeps the list. Collaborators clone
from GitHub:

https://github.com/Aaronlb912/did-i

## What you get

Tags hold the questions. Extra tags do not cost coins.
Tonight is the tap. Shop, coins, gems, cheer, and streak
are in the app. No real money.

First visit is a few short plates, then a name on this
phone. Bottom keys: Home and Questions.

Chrome can install this from the address bar, or from
Install on Settings when the browser offers it. After that
it works offline. Remind when it is due is on Settings.
Pings use this browser, not a server. They fire if the app
was opened today. Android and desktop Chrome first. An
iPhone can install. Pings there are weak.

Settings: Click when I hit DID is a short click, off by
default. Hide badges still hides the little marks. Number
lock is optional and stays on this phone. Settings can load
Hayes Street, or add test tags: Practice night, Shop try,
and Try now.

## Run it locally

Node is enough for the browser app.

```
npm install
npm start
```

Vite serves it on port 48741.

## Android

Same list, wrapped with Capacitor. App id
`com.aaronbryant.didi`.

Needs JDK 21 and the Android SDK (platform 36, build-tools
36). Set `JAVA_HOME` to the JDK 21 folder, then:

```
npm run cap:apk
```

That builds the web app, syncs it into Android, and makes a
debug APK at
`android/app/build/outputs/apk/debug/app-debug.apk`.
Copy that file to a phone and install it. The APK itself is
not in git.

If you already have an emulator or a phone on adb:

```
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.aaronbryant.didi/.MainActivity
```

First open is the home screen after you put your name on
this phone. Remind when it is due is on Settings. That ping
does not need a browser tab left open.

## Drop into a React app

Copy `src/lib/` into your `src/`. Site pages stay in
`src/site/` and are not part of the drop-in.

```
import { Tonight, sampleBoard, emptyBoard } from './lib'

<Tonight value={book} onChange={setBook} />
```

`Tonight` does not write localStorage. Persist in the host.
Pass `now` if you need a frozen clock.

Old JSON still loads. New fields fill in blank. `inkNote` is
one of those. `clickSound` is another.

## Sample

Hayes Street, apt 3. Jordan Hale, jordan@hayes-street.example.
Evening pills, back door, Sunday bins, water bill, fern, lease
paper. Settings, Enter, or Name loads it. It is not the
starting list.

## Unfinished

iOS needs a Mac and Xcode. There is no iOS binary in this
repo.

The debug APK is not in git. Build it with `npm run cap:apk`.

`npm run expo` is leftover Expo wiring. Expo Go is not the
phone app. The Android binary is Capacitor.

No live server. Data stays on the device. Ship screenshots
and a public demo only when asked.
