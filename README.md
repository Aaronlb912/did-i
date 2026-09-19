# Did I

For the question you keep asking tonight. Did I take the
evening pills. Did I lock the back door. Tap DID. Nope if
it is not that night.

No account. This phone keeps the list.

## Run it

```
npm install
npm start
```

Local URL: http://127.0.0.1:48741/

First visit is a few short plates, then a name on this
phone. Bottom keys: Home and Questions. Extra tags do not
cost coins. Shop, coins, gems, cheer, week, streak, stats,
feed, and marks are still in the app.

GitHub is the copy for collaborators:
https://github.com/Aaronlb912/did-i

App pages:

- Home: http://127.0.0.1:48741/#/
- Tonight: http://127.0.0.1:48741/#/tonight
- Enter: http://127.0.0.1:48741/#/enter
- About: http://127.0.0.1:48741/#/about
- Add: http://127.0.0.1:48741/#/add
- Questions: http://127.0.0.1:48741/#/lamps
- One question: http://127.0.0.1:48741/#/lamp?id=
- Find: http://127.0.0.1:48741/#/search
- Answers: http://127.0.0.1:48741/#/feed
- So far: http://127.0.0.1:48741/#/stats
- Seven nights: http://127.0.0.1:48741/#/week
- Nights in a row: http://127.0.0.1:48741/#/streaks
- Tags: http://127.0.0.1:48741/#/me
- Settings: http://127.0.0.1:48741/#/settings
- When it is due: http://127.0.0.1:48741/#/pings
- Coming up: http://127.0.0.1:48741/#/later
- What to ask: http://127.0.0.1:48741/#/ideas
- Help: http://127.0.0.1:48741/#/help
- First night: http://127.0.0.1:48741/#/first
- Marks: http://127.0.0.1:48741/#/marks
- Shop: http://127.0.0.1:48741/#/shop
- First plates: http://127.0.0.1:48741/#/welcome

Site pages (not the app):

- Door: http://127.0.0.1:48741/#/door
- Name: http://127.0.0.1:48741/#/name
- How: http://127.0.0.1:48741/#/read
- Drop in: http://127.0.0.1:48741/#/into

`#/tonight` is the tap plate. A ping can open
`#/tonight?face=id` so that question is on the plate.
`#/?face=id` still does the same.

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

## Phone (Android)

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

This PC also has the Android emulator and an AVD named
`did-i`. After `npm run cap:apk`:

```
emulator -avd did-i
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.aaronbryant.didi/.MainActivity
```

First open is the home screen after you put your name on
this phone. Remind when it is due is on Settings. That ping
does not need a browser tab left open.

iOS needs a Mac and Xcode. This Windows machine cannot
build that binary.

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

No iOS binary from this machine. No live server. Data stays
on the device. Ship screenshots and a public demo only when
asked.
