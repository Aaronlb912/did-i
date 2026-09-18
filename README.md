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

- Door: http://127.0.0.1:48741/#/
- Name: http://127.0.0.1:48741/#/name
- How: http://127.0.0.1:48741/#/read
- Tonight: http://127.0.0.1:48741/#/tonight
- Drop in: http://127.0.0.1:48741/#/into

The board stays in this browser. Tray has JSON download and
load. Print tonight makes a fridge slip. Hayes Street is the
sample.

## Drop into a React app

Copy `src/lib/` into your `src/`.

```
import { Tonight, sampleBoard, emptyBoard } from './lib'

<Tonight value={book} onChange={setBook} />
```

`Tonight` does not write localStorage. Persist in the host.
Pass `now` if you need a frozen clock.

Old JSON still loads. New fields fill in blank. `inkNote` is
one of those.

## Sample

Hayes Street, apt 3. Jordan Hale, jordan@hayes-street.example.
Evening pills, back door, Sunday bins, water bill, fern, lease
paper.
