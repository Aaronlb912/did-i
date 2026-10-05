# Walkthrough pass 28 (2026-10-04)

Fresh install. Covered: Settings bottom (Crash reports, Phone privacy,
Legal, Clear this folder), language switch to Japanese, Japanese Home,
menu and Settings.

## Findings

1. In Japanese, Settings still showed English: People, Widget, "Colors on
   the widget", "Open questions only", Crash reports, Phone privacy
   settings, and more. A scan found 94 strings the app uses that were never
   translated in most languages (sign-in, Account, PIN, widget, shop misses,
   pills, schedule hints). All 94 are now translated in de, es, fr, it, ja,
   ko, pt and zh. The 68 left are only used by the website.
2. The 12-hour clock always wrote English "AM"/"PM", so Japanese read
   "9:00 AM". The format now follows the language (午前9:00, 오전 9:00,
   9:00 a. m., 9 h 00 du matin, and so on).

## Checked and fine

- Clear this folder asks first, names the folder, and offers Never mind.
