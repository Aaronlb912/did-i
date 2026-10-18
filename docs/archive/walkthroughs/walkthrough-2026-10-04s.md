# Walkthrough pass 20 (2026-10-04)

Fresh install, name left blank in onboarding. Covered: Terms from sign-in,
Account page, App PIN (short PIN, set, change/remove), reopening the app with
a PIN set.

## Findings

1. **The app PIN never asked.** On the phone, session storage was saved to
   disk, so "unlocked" survived closing the app. It now lasts one launch, like
   a browser tab.
2. **The PIN was skipped when no name was set.** The lock only applied if you
   had typed a name during onboarding (name is optional). Now a PIN always
   locks, on the phone and the web.
3. The PIN field on the lock screen showed the digits in a normal keyboard.
   It now hides them and opens the number pad.
4. The Account title "Sign in to keep your questions" was cut off in the
   header. The header now says Account; the sign-in card below explains.
5. Set PIN / Change PIN / Remove PIN were left-aligned list rows that touched
   each other. They are now buttons with space between them.

## Not changed

- The Terms say "the App" in one section and "the app" elsewhere. Legal text,
  so left as is.
- A forgotten PIN has no reset other than clearing app data. Added to
  docs/not-yet.md.
