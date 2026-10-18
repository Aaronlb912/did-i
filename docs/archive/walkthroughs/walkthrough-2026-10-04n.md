# Walkthrough pass 15 (2026-10-04)

Fresh install, typed question "water the plants", then added "feed the cat"
from the menu.

Covered: Add from the menu with a typed question, Questions list, search with
no match and a match, delete with confirm, Notifications settings.

## Findings

1. The main button on Notifications read "Remind when it is due". It is the
   button that asks the phone for permission, so it now says "Turn on
   notifications" (9 languages).
2. English still had lowercase times: "At 9pm", "4am", "5 and 9am", "a 1am
   tap". Now 9:00 PM / 4:00 AM / 5:00 and 9:00 AM / 1:00 AM, like the rest of
   the app. No lowercase am/pm left in English.

## Checked and fine

- Search with no match says "No questions match that." and hides Select.
- Delete asks first ("It has no answers yet.") and the list updates.
