# Did I

A lamp board for the question you keep asking. Did I take the
evening pills. Did I lock the back door. Hit DID. Skip if
tonight is not that night.

For anyone who wants that tap without an account.

## Run it

```
npm install
npm start
```

Local URL: http://127.0.0.1:48741/

That URL is the hall. Hang lamps and tap tonight. The board
stays in this browser. First visit is an empty board named
My hall. Rename it on the plate. Tray has JSON download and
load, Start empty, and the Hayes Street sample if you want
a fake apartment.

Site pages (not the app):

- Door: http://127.0.0.1:48741/#/door
- Name: http://127.0.0.1:48741/#/name
- How: http://127.0.0.1:48741/#/read
- Drop in: http://127.0.0.1:48741/#/into

`#/tonight` still opens the hall. A ping can open
`#/?face=lamp-id` so that lamp is on the plate.

Chrome can install this hall from the address bar, or from
Install in the tray when the browser offers it. After that it
works offline. Ask at lamp time is in the tray. Pings use this
browser, not a server. They fire if the hall was opened today.
Android and desktop Chrome first. An iPhone can install. Pings
there are weak.

Tray: Click on DID is a short click, off by default. Quiet
mode still hides the enamel marks.

## Phone (Android)

Same hall, wrapped with Capacitor. App id
`com.aaronbryant.didi`.

Needs JDK 17+ and Android SDK. Then:

```
npm run cap:apk
```

The debug APK lands at
`android/app/build/outputs/apk/debug/app-debug.apk`.
Copy that file to a phone and install it. First open is the
hall. Ask at lamp time is in the tray. That ping does not
need a browser tab left open.

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
paper. Tray, or Name, loads it. It is not the starting board.
