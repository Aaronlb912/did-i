# Did I

A lamp board for the question you keep asking. Did I take the
evening pills. Did I lock the back door. Hit DID. Skip if
tonight is not that night.

For anyone who wants that tap without an account.

## Run the demo

```
npm install
npm start
```

Local URL: http://127.0.0.1:48741/

The demo keeps the board in this browser. Tray has JSON
download and load. Hayes Street is the sample.

## Drop into a React app

Copy `src/lib/` into your `src/`.

```
import { Tonight, sampleBoard, emptyBoard } from './lib'

<Tonight value={book} onChange={setBook} />
```

`Tonight` does not write localStorage. Persist in the host.
Pass `now` if you need a frozen clock.

## Sample

Hayes Street, apt 3. Jordan Hale. Evening pills, back door,
Sunday bins, water bill, fern, lease paper.
