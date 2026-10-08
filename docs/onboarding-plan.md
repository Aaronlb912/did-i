# Fresh install: getting started (plan, 2026-10-08)

## What happens today (traced in code)

1. Launch, then the boot screen.
2. **The sign-in screen is skipped on a fresh install.** `needsAuth` returns false when no account was ever used (`src/lib/auth-gate.js:45`). Sign-in only appears for someone whose session ran out.
3. So the first thing a new person sees is the **"create a question" form** (`/first`, `native/screens/more.jsx:1275`).
   - The only way to sign in is a small "I have an account" button on that form. It goes to the Account screen.
4. Two things that live only on the sign-in screen therefore never show:
   - the opening animation (`FirstSwipe`)
   - **the App Review reviewer sign-in** (long-press on the "Did I" title)

   The Account screen has no reviewer path, so **Apple's reviewer could not sign in with the notes we gave them**. That likely fed the "Information Needed" rejection.
5. After the form: the notification ask, then Tonight with the swipe intro. From here the top-right menu is always visible.

## The new flow

| # | Screen | What it shows | Menu | Way out |
|---|---|---|---|---|
| 1 | Opening | The first-swipe animation, once. A tap skips it. | no | it ends by itself |
| 2 | **Welcome** (the sign-in screen, now always first) | "Did I", the tagline, then the buttons:<br>**Continue with Apple**<br>**Continue with Google**<br>**Use email**<br>**Start without an account** (plain secondary button, not hidden)<br>Small text link at the bottom: **App Review sign-in** | **no** | any button |
| 3 | First questions | Pick starters or type your own. "Did I ..." prefilled. | no | Back to Welcome; Next |
| 4 | Pick a time | When to ask each night | no | Back; Done |
| 5 | Notification ask | "Get a nudge at night?" then the system prompt | no | Not now / Allow |
| 6 | Tonight | Swipe intro once, then the first card. **The menu appears here.** | yes | normal app |
| 7 | After night one | Done card: pin the widget | yes | |
| 8 | After night two (no account only) | "Keep your questions safe: sign in." | yes | |

### Who skips what
- **Signs in with an account that has questions:** 1 → 2 → Tonight. Skip 3 to 5, but still show the notification ask if never shown.
- **Signs in to an empty account:** 1 → 2 → 3 → 4 → 5 → 6.
- **Starts without an account:** 1 → 2 → 3 → 4 → 5 → 6, then the sign-in nudge after night two.
- **Reopens the app later:** straight to Tonight. Welcome only comes back after signing out.

### Rules
- **No menu, tab bar or back-to-app** on screens 1 to 5. The `locked` shell already hides the menu (`more.jsx:156`); the Welcome screen gets no header at all.
- **The reviewer path is visible, not a secret gesture.** A small "App Review sign-in" link opens the email and password form that already exists (`useAuthSignIn.showReviewer`). Keep the long-press as well. It's safe because it only works with the review account's password.
- **One decision per screen.** Welcome = how to start. Questions = what to ask. Time = when.
- **Every screen can go back** to the one before, until Tonight.

## Code changes (for when we build it)
1. `src/lib/auth-gate.js`: on a fresh install, gate until the person picks a button on Welcome (sign in, or "Start without an account", which already sets `did-i-auth-skip`). Remove the line 45 shortcut.
2. `native/screens/SignInScreen.jsx`:
   - Make "Start without an account" a full secondary button.
   - Add the "App Review sign-in" link.
   - Rename the start copy to welcome copy, in all 9 locales.
3. `native/AppShell.jsx`: after Welcome, an empty shelf goes to `/first` (already does, line 348); keep FirstSwipe before Welcome.
4. `native/screens/more.jsx` (FirstNight):
   - Remove the "I have an account" button, since Welcome covers it.
   - Back on step 1 returns to Welcome.
5. Sign-in nudge: wait until after night two, not night one.
6. `docs/app-store-connect.md` and the review Notes: "On the first screen, tap **App Review sign-in** at the bottom."
7. Tests in `scripts/check.mjs`: a fresh install gates to Welcome; skip goes to /first; no menu on gated screens.

Native code changes, so this needs a new build (1.3.2), which is also the build to resubmit to Apple.
