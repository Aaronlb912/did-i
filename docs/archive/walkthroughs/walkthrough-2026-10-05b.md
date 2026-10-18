# Walkthrough pass 29 (2026-10-04)

Fresh install with the phone's app language set to Spanish. Covered: sign-in,
first night, Home in Spanish.

## Findings

1. The "Need an idea?" chips stayed in English ("take the evening pills") on
   first night, Add and the empty Questions list, even though the question
   hint above them was Spanish. The ideas now follow the app language the
   same way the hint does: "Did I" stays, the words after it and the short
   name are translated ("Did I sacar la basura?", Basura). Short names that
   were still English in Spanish, Korean, Portuguese and Chinese are
   translated too.
2. The swipe hint row ("Desliza a la izquierda: nope / Desliza a la derecha:
   DID") ran off the right edge. It now wraps.

## Checked and fine

- A new install follows the phone's language for the whole app.
