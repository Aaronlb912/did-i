# Did I Class: full spec

Status: spec, not built (2026-10-07). Screens: `docs/ideas/did-i-class.html`
(this spec is embedded at the bottom of that page; refresh it with
`node docs/ideas/embed-spec.mjs`). Short history: `docs/classes-plan.md`.

One line: **a teacher asks once, every student gets it on their phone as one
question, the teacher sees who did it, and nobody sees anyone else.**

Contents: 1 Who · 2 Student · 3 Teacher · 4 Onboarding · 5 Privacy, age,
safety · 6 Notifications · 7 Accessibility, language, states · 8 Plans,
price, billing · 9 Support, help, marketing · 10 Admin and moderation ·
11 How it is built · 12 Edge cases · 13 What it does not do · 14 Phases ·
15 Pilot plan · 16 Measuring · 17 Risks · 18 Build checklist · 19 Decided

---

## 1. Who it is for

| Role | Who | Where they work |
|---|---|---|
| **Student** | 13 and up: high school and college | Did I on their phone (tonight, widget, push) |
| **Teacher** | Owns the class, asks questions, sees the roster | Web (did-i.app/class) and a Teaching section in Did I |
| **Co-teacher / TA** | Invited by the teacher; can ask, remind, see the roster, give extensions; cannot delete the class, change billing or remove the owner | Same as teacher |
| **School admin** (phase 3) | Buys Pro for teachers, sees which teachers have it, no student data | Web only |
| **Did I staff** (you) | Reviews reports, freezes or removes classes | Private admin page |

Anyone can hold more than one role: a college TA is a student in one class
and a co-teacher in another. Each class shows in the right place.

**Not for:** under 13, parents watching their kids (that is Family),
employers watching staff. Parents get no access to a student's classes. The
sign-up, the join screen and the store listing say who it is for.

---

## 2. The student

### Joining
- **Three ways in:** a link (did-i.app/c/CODE), a QR code on the board or
  projector, or typing the code.
- **Codes:** 8 characters from letters and numbers that cannot be confused
  (no O/0, I/1), shown as `BIO-4KX7`. Wrong codes are limited per account per
  day (the family-code pattern) so codes cannot be guessed.
- **Before joining they see:** class name, the teacher's display name, number
  of students, and the plain promise: *"Your teacher sees only whether you
  answered class questions (Did, Didn't, Excused, Not yet). Not when, not
  your own questions, not your streak. Classmates see nothing about you."*
- **Age check:** a one-time "I'm 13 or older" if the account has not
  confirmed it. Under 13 cannot join, and the app says so kindly.
- **Name in class:** they choose how they show up in each class (prefilled
  with their display name, for example first name and last initial). No email,
  phone or friend ID is ever shared.
- **No account yet:** the link opens the store, then the app picks the code up
  on first launch (the invite-link pickup already does this). Joining works
  signed in only, so answers follow them to a new phone.
- **Teacher approval (optional):** with "Approve who joins" on, joins wait;
  the student sees "Waiting for your teacher to let you in".
- **Reminders nudge:** if notifications are off, the join screen asks once to
  turn them on, and explains it is the only way to get class questions on
  time.

### On their phone
- Class questions are **normal Did I questions** under the class's own tag
  (class color, class name as the tag). Same swipe, widget, reminders, and
  "Not yet can still become Did".
- They arrive at **the time the teacher picked**, with Did / Not yet buttons on
  the notification.
- **Due dates:** "by Friday" questions stay on tonight each night until
  answered or until the due date passes, then close as Didn't. There is no
  Late: a student either did it or didn't (decided 2026-10-08).
- **Repeating questions** use the existing weekday and every-N schedules.
- **A link** (optional) sits under the question. The domain shows before they
  tap ("opens docs.google.com"). Links open in the browser, never inside the
  app.
- **Anonymous check-ins** (v1): some questions say "Anonymous: your teacher
  sees only totals", for things like "Did today's lesson make sense?". The
  answer is never stored against their name on the teacher's side. The system
  still knows who has answered (so remind skips them) but never what they
  answered.
- **Streaks:** class questions count toward their own streak only if they
  turn on "Count toward my streak" for that class. Off by default.

### Their own record
- **Class history** (v1): per class, what they did, missed or
  were excused from this term, the same statuses the teacher sees.
- **"What my teacher sees"**: one tap shows their own row exactly as the
  teacher's roster shows it. No surprises.
- **Export:** their class answers are included in the existing "Save a copy".

### Control (the student is always in charge of their phone)
- **Mute a class** tonight or for a week (still answerable inside the tag; no
  pushes, not on the widget).
- **Quiet hours** always win; a class question asked inside them waits until
  they end.
- **Leave a class** any time. Its questions leave their tonight. The teacher
  sees "left", nothing more.
- **Report a class or a teacher** (spam, harassment, not a real class): it
  leaves the class and flags it for review.
- **Show my picture to the teacher:** off by default, per class.

---

## 3. The teacher

### Making a class
- Name, optional section ("Period 3", "Lecture A"), subject color, term dates,
  time zone (ask times follow the class zone).
- **No-class days:** mark holidays and breaks by hand or start from a simple
  preset (US federal holidays); repeating questions skip them.
- **Duplicate a class** for a new term or section (questions and schedule
  copy; students do not).
- **Join material:** a link, a code, a QR, a full-screen **projector slide**
  and a **printable poster** (PDF, one page: class name, QR, code, the
  privacy promise in one line).

### Asking (phone and web)
- Type the rest of "Did you…" (up to 120 characters).
- **Classes:** one or several at once.
- **When:** now, tonight 7 PM, tomorrow 7:30 AM, or pick a time.
- **Due:** just that night, or by a date.
- **Repeat:** none, weekdays, specific days, every N days, until a date or the
  end of term.
- **Anonymous** (v1): totals only.
- **Link:** optional, https only.
- **Preview line:** "*74 students get "Did I do the chapter 5 reading?" Tue
  and Thu at 7 PM, until the term ends.*"
- **Edit or take back:** before it is asked, anything; after, fix a typo or
  take it back (it leaves students' tonight; it never counts).
- **Question bank** (Pro): past questions, one tap to ask again, plus the
  starter questions.
- **Plan the week** (Pro): schedule a week of questions on the laptop.

### Seeing who did it
- **Statuses:** Did, Didn't, Excused, Not yet. Each has a word and an
  icon as well as a color.
- **Small classes (up to about 40):** a list of names with statuses.
- **Big classes:** totals first ("241 of 300 did it", a bar, the counts), the
  remind button, then names one tap away with search and filters.
- **Term grid** (web, Pro): each student across the term; "joined later" is
  its own mark, never Didn't.
- **Never shown:** when they answered, their own questions, tags, streak,
  other classes, whether they opened the app, anonymous answers by person.
- **Export** (web, Pro): CSV of the grid (class name of each student and
  statuses).

### Accommodations and excuses
- **Extend for one student:** a later due date for a single student on a
  question or for the whole term (students with formal accommodation plans
  such as IEP or 504 plans need this). Their question stays open until their own due date. Only the teacher and co-teachers see that an
  extension exists; the student just sees their own due date.
- **Excuse:** mark a student Excused for a question (absent, special case).
  Excused never counts as Didn't.

### Reminding
- **Remind the ones who haven't:** one push to students still on Not yet.
  Once per question per night, never inside quiet hours, never to students who
  muted the class. The button says how many it reaches and greys out after.
- Always "everyone who hasn't", never one student by name.

### Managing
- **Approve joins**, **remove a student** (they get a quiet notice),
  **co-teachers** by friend ID or link, **new code** (old one stops working).
- **End of term:** archive. It leaves every student's tonight; the teacher
  keeps a read-only roster for 1 year, then it is deleted.
- **Delete class:** removes it and all its answers for everyone, after a
  confirm that says exactly that.
- **Teacher's own Did I** stays separate: their personal questions never mix
  with Teaching.

### Teaching section in the app
- Shown in the menu only to people who teach a class.
- Home: classes with tonight's progress; "Ask a class something".
- Ask, Who did it, Remind, Extend/Excuse, Class settings (projector, approve
  joins, co-teachers, term, archive).
- Heavier work (bank, week plan, grid, export, billing, poster) is on the web.

---

## 4. Onboarding

### Teachers
1. **Sign up** on the web or in the app (same account; email code, Apple or
   Google). One question: "Are you teaching a class?" opens Teaching.
2. **Make your first class** in a three-step walkthrough: name, term, time
   zone.
3. **Starter questions** to pick from: "Did you do the reading?", "Did you
   bring your lab notebook?", "Did you study for Friday's quiz?", "Did you turn
   in the permission slip?", "Did you finish the problem set?", "Did you watch
   the lecture?", "Did you check the class page?", "Did you sign up for a
   presentation slot?", "Did you charge your laptop for tomorrow?", "Did you
   read the feedback on your draft?".
4. **Try it as a student:** a preview phone shows exactly what students get,
   including the join screen promise.
5. **Get students in:** projector slide, poster, link to paste in the class
   page.
6. **First result:** after the first question's night, an email and in-app
   card: "31 of 34 did it. Here is your roster."
- Empty roster shows the join code and poster, not a blank table.

### Students
- Joining is the onboarding: the class card appears on tonight right away with
  a one-time hint "Swipe right when you did it". People new to Did I also get
  the normal first-run (the first-swipe opening).

---

## 5. Privacy, age and safety

**The rule:** a teacher sees one thing about a student: the status of each
class question. Everything follows from that.

### Age and audience
- **13+ only**; under 13 cannot join. Keeps clear of COPPA and the App Store
  Kids category. The App Store age rating questionnaire is answered again
  for the update.
- **One way:** students cannot post, reply, message or see classmates.
- **No parents in a student class:** a student class gives no one outside it
  any view of a student. Parents take part only through a parent class (below).

### Parent classes (elementary and middle school, added 2026-10-08)
For grades where students are under 13, the teacher picks **"Parents and
guardians answer"** when making the class. Built so that **no child is ever
involved**:
- **Only adults join.** Joining asks "I'm a parent or guardian, 18 or older".
  No child account, no child sign-in, no child age, birthday or photo.
- **No child is named.** The parent joins under their own name ("your name,
  not your child's"). The teacher matches families to kids outside the app,
  the way they already know which parent is whose.
- **Questions are about the household:** the teacher writes "Did your family
  read together for 15 minutes?"; the parent sees "Did we read together for 15
  minutes?" on Tonight, the widget and reminders.
- **The teacher sees one status per family:** Did, Didn't, Excused, Not yet.
  Never when. Remind, Excuse and "+ nights" work the same, aimed at parents.
- **Both parents can join;** the household is one row (shared through the
  existing Family link), and the first answer counts for both.
- **Middle school:** the teacher chooses per class, students (13+) or parents.
- **Why this keeps us clear:** nothing is collected from or about a named
  child, so COPPA's child rules do not apply; the lawyer review still covers
  FERPA and state student-privacy laws, since it is still a school use.
- **Fairness:** a family that never joined shows as "not joined", not Didn't.
  Excused stays one tap.

### What is shared
- Class display name (student's choice) and statuses. Picture only on the
  student's opt-in. Nothing else, ever.
- Anonymous check-ins are stored without a link to the student on the
  teacher's side (counts only).

### Law and policy (lawyer review before the pilot)
- **US student records (FERPA):** a teacher signing up alone controls their
  class records; a school-bought plan needs a data agreement (phase 3).
- **US state student-privacy laws** (California and others) cover apps used
  in K-12. Have a lawyer check the pilot setup before any high school uses it.
- **GDPR / data rights:** students can delete their account (class answers go
  too); teachers can export and delete a class.
- **Terms of use:** a teacher section with acceptable use (real classes only,
  no harassment, no collecting data off-platform, no ads).
- **Privacy policy, App Store privacy labels and Play data safety** updated
  before launch.
- **Retention:** archived classes kept 1 year, then deleted. Students who
  leave are dropped from the teacher's view at archive.

### Safety and abuse
- **Caps:** classes made per account per week, questions per class per day,
  300 members, one remind per question per night, text lengths, wrong-code
  attempts per day.
- **Per-student push cap:** across all classes, at most 3 class pushes a day
  per student; more fold into one "3 class questions tonight" push.
- **Text and links:** questions up to 120 characters, a basic word filter,
  links https only with the domain shown, links to known bad sites blocked
  (Google Safe Browsing check when the question is saved).
- **Impersonation:** the join screen always shows the teacher's account name;
  students can report "not my teacher".
- **Reports:** a reported class over a threshold is frozen (no new questions)
  until reviewed; see section 10.
- **No teacher verification at launch;** caps, reports and one-way design are
  the protection. A verified-school badge comes with the school plan.

---

## 6. Notifications

| To | When | Text |
|---|---|---|
| Student | Question's ask time | "Period 3 · Biology: Did I finish the chapter 4 reading?" with Did / Not yet |
| Student | Teacher's remind | Same question, once |
| Student | Due tomorrow, still Not yet | "Due tomorrow: …" (once) |
| Student | Several class questions at once | "3 class questions tonight" (the cap) |
| Student | Removed / archived / join approved | Quiet, no sound |
| Teacher | Joins waiting (approval on) | "3 students want to join Period 3" (batched) |
| Teacher | Morning after a question | "Chapter 4 reading: 241 of 300 did it" (opt-in) |
| Teacher | Class frozen after reports | "Period 3 is paused while we take a look" |
| Teacher (email) | Welcome, first result, July renewal, payment failed | Plain emails, unsubscribe from all but billing |

Respects: quiet hours, mute, "Hide what it says" (shows "Period 3 · Biology
asked something"), the per-student cap, and system settings.

---

## 7. Accessibility, language and states

### Accessibility
- Screen-reader labels on every control; the roster reads "Student 12, Not
  yet".
- Statuses use a word and an icon, not color alone (color-blind safe).
- Large text sizes reflow; nothing is cut off at the biggest size.
- The swipe has the existing tap alternatives; reduced motion respected.

### Language
- Every app and dashboard string in all 9 locales. Teachers' question text is
  shown as written (not translated).

### States (each designed, not left blank)
- Class with no students yet: code, QR, poster, "share this".
- Student with no classes: "Join a class" with code entry.
- Wrong code, code from a deleted class, full class (300), archived class,
  waiting for approval, removed from a class, class frozen.
- Offline: answers save on the phone and sync later (existing behaviour); the
  roster shows "last updated" when the teacher is offline.
- Dark and light themes, every look.

---

## 8. Plans, price and billing

| | Students | Teacher Free | Teacher Pro | Schools (phase 3) |
|---|---|---|---|---|
| Price | Free | $0 | $4.99/mo or $39/school year | ~$30/teacher/year |
| Classes | join any | 1 | unlimited | unlimited |
| Size | | up to 50 | up to 300 | up to 300 |
| Ask (phone, web), roster, remind | | yes | yes | yes |
| Repeat, due dates, links, extensions, excuse | | yes | yes | yes |
| Anonymous check-ins | | yes | yes | yes |
| Question bank, plan the week | | | yes | yes |
| Term grid, CSV export, co-teachers | | | yes | yes |
| One invoice, admin page, data agreement, verified badge | | | | yes |

- **Pilot:** free for everyone. **Pro starts with v1.**
- **Billing on the web** (Stripe, about 3%); Stripe Tax for sales tax;
  receipts by email. If Pro is sold in the iPhone app it goes through Apple
  (15% on the Small Business Program).
- **School year** runs August to July; renewal email in July.
- **Trial:** 30 days of Pro in a teacher's first term.
- **Failed payment:** 7 days of grace with emails, then back to Free.
- **Downgrade or cancel:** extra classes go read-only; nothing is deleted.
- **Refunds:** within 14 days, no questions.
- **Schools later:** pay by invoice or purchase order.
- **Teacher referral:** a teacher who brings another teacher gets a free
  month of Pro.

---

## 9. Support, help and marketing

- **Help page for teachers** (did-i.app/class/help): getting started, what
  students see, privacy, extensions, billing, FAQ.
- **Contact:** a support email linked from the dashboard and the app; aim to
  answer within 2 school days.
- **Landing page** (did-i.app/class): what it is in one line, the privacy
  promise, the student view, free vs Pro, a demo class to click through, the
  poster.
- **Demo class:** a read-only sample class with a filled roster, so a teacher
  can see the product before making anything.
- **Store listings:** a screenshot and a line about classes once it ships.

---

## 10. Admin and moderation (Did I staff)

- **Private admin page** (signed-in staff only, never in the app):
  reported classes with the reason, their questions, member count, report
  count; actions: unfreeze, remove class, ban teacher account.
- Admin never sees student answers or names beyond what the report needs.
- Every admin action is logged (who, when, what).
- **Thresholds:** a class is frozen automatically at 3 reports from different
  students or 10% of members, whichever comes first.

---

## 11. How it is built (reusing what exists)

- **Closest existing feature: Did we** (`supabase/did-we.sql`): shared cards,
  members, answers, nudges, join links. Classes are new tables built the same
  way, not a change to Did we.
- **Tables:** `classes`, `class_members` (role, class display name, muted
  until, left at, show picture, count toward streak), `class_questions`
  (text, ask time, schedule, due, link, anonymous, taken back),
  `class_answers` (status per question per night per student; answered-at
  kept for night math only, never returned to teachers), `class_extensions`,
  `class_excused`, `class_anon_counts`, `class_reminds` (the once-a-night
  cap), `class_reports`, `class_invites`, `class_code_misses`,
  `class_admin_log`.
- **RLS on every table**, `(select auth.uid())`, security definer helpers
  with pinned search_path ("am I teaching this class", the roster read). The
  roster function returns display name and status only.
- **Caps in the database** (triggers): members, classes per week, questions
  per day, reminds, text sizes, code misses, per-student daily pushes.
- **On the phone:** class questions are pulled like Did we cards and shown as
  lamps in the class tag; tonight, widget, reminders and notification buttons
  already handle them.
- **Push:** the existing push queue, sent in batches so a 300-student ask goes
  out within a minute without hitting provider limits.
- **Web dashboard:** a new area of the website, same account and sign-in.
- **Billing:** Stripe Checkout and the customer portal; a webhook updates the
  teacher's plan in the database.
- **Milestones** (`docs/milestones.md`): `class_made`, `class_joined`,
  `class_asked`, `class_reminded`.
- **Monitoring:** push delivery failures, roster query time, report rate,
  error reports, all on a simple admin view.
- **Locales:** all 9.
- **Tests:** RLS isolation (students never read rosters; a teacher never reads
  another class), caps, one remind a night, under-13 refused, answer times
  never returned to teachers, anonymous answers never linked, extension maths.

---

## 12. Edge cases (decided)

- Student in two classes from the same teacher: two tags.
- Same question to two sections: one ask, several classes.
- Ask time changed after asking: students who already got it keep it.
- Student changes phones: answers are on the account.
- Notifications off: questions still show in the app and widget.
- Joins mid-term: earlier questions show "joined later".
- Time zones: ask times follow the class zone; never inside quiet hours.
- Daylight saving and midnight: the same night math as the rest of Did I.
- Teacher leaves or deletes their account: a co-teacher becomes owner;
  with none, the class archives.
- Code leaked: new code, approval on, remove members.
- Archived while a question is open: it closes with nothing recorded.
- Taken-back question: never counts.
- Student with two accounts joins twice: the teacher can remove one.
- Student leaves and rejoins: their earlier statuses come back.
- Teacher downgrades with 3 classes: 2 go read-only; students keep answering
  questions already scheduled until they end.
- Anonymous question turned non-anonymous: not allowed after it is asked.
- Class at 300: the join screen says the class is full and to ask the
  teacher.

---

## 13. What it deliberately does not do

- No grades or gradebook, no assignments or file uploads.
- No chat, comments or student posts.
- No tracking when or how often a student opens the app.
- No parent access.
- No LMS sync at launch (Google Classroom / Canvas roster import is phase 3,
  if asked).
- No ads, ever, and nothing sold about students.

---

## 14. Phases

1. **Pilot (about 6 weeks of work):** make a class, join (link, code, QR,
   poster, projector), ask once or due by, tonight/widget/push, roster with
   statuses, remind, extend and excuse, mute, leave, report, archive, caps and
   RLS, 13+ check, onboarding with starter questions and student preview,
   per-student push cap, text and link limits, empty and error states,
   accessibility, admin review page, updated terms and privacy policy, lawyer
   check. Web dashboard and Teaching section. Free.
2. **v1:** repeat schedules, links, co-teachers, anonymous check-ins, student
   class history, question bank, plan the week, term grid, CSV export, big
   lecture view, Pro billing, trial, help page, landing page, demo class,
   teacher referral.
3. **Schools:** school plan, invoices, admin page, data agreement, verified
   badge, LMS roster import if asked.

**Cheapest test before any of this:** a Did we card marked as a class card
(join by link, the maker sees the roster, members cannot see each other).

---

## 15. Pilot plan

- **Who:** 3 to 5 teachers: at least one high school class, one college
  lecture over 100, one small seminar.
- **How long:** 4 weeks of real use.
- **Check-ins:** a 15-minute call each week and a short form for students
  (5 questions, optional, anonymous).
- **Go to v1 if:** most teachers are still asking in week 4, students answer
  at least 70% of class questions, mute and leave rates stay under 10%, and no
  serious safety report.
- **Stop or rethink if:** teachers stop asking by week 2, or students mute
  most classes.

---

## 16. How we know it works

- Teachers: class made → first question within a day → still asking in week 3.
- Students: joined → answered the first class question → still answering in
  week 3; mute and leave rates low.
- Per question: share answered by the due date (a good class is above 80%).
- Reports per 1,000 students near zero.
- Teachers convert to Pro when they make a second class.

---

## 17. Risks and how they are handled

| Risk | Handling |
|---|---|
| School feels like surveillance in a personal app | Own tag, mute, leave, quiet hours win, teacher sees status only, "what my teacher sees" |
| Spam or harassment through a "class" | One way, caps, word filter, link checks, reports, auto-freeze, admin review |
| Legal trouble with high schools | 13+, lawyer check before the pilot, data agreement before selling to schools |
| Notification overload | Per-student daily cap, folding, mute, quiet hours |
| Teachers want grades and assignments | Stated up front; CSV export for their own gradebook |
| Big lectures overload the push service | Batched sends, tested at 300 before launch |
| Teachers will not pay | Free tier is real; Pro sells on more classes and planning; pilot proves value first |

---

## 18. Build checklist (repo rules)

- RLS and policies in the same change as each table; `npm run db:audit`
  returns no rows.
- Caps in the database, not only in the app.
- Every string in all 9 locales; theme tokens, no new hard-coded colors.
- Reduced motion respected; accessibility labels.
- New routes reachable from the menu, with a way back.
- Tests in `scripts/check.mjs` for the rules in section 11.
- `docs/not-yet.md` and `docs/launch-checklist.md` updated.
- Device pass on iPhone and Android before the pilot.

---

## 19. Decided (2026-10-07)

1. **Name:** Did I Class.
2. **Placement:** students in Did I; teachers on the web and in a Teaching
   section of the app.
3. **Teachers see status only:** never answer times.
4. **Remind button:** yes, once per question per night, to everyone who
   hasn't.
5. **Class size:** up to 300; free teachers one class up to 50.
6. **Price:** students free; Teacher Pro $4.99/month or $39/school year;
   schools later.
7. **Profile pictures:** shown only if the student turns it on.
8. **Streaks:** class questions count only if the student turns it on.
9. **Morning summary:** opt-in.
10. **Pilot free; Pro from v1.**
11. **Retention:** archived classes kept 1 year.
13. **Parent classes (2026-10-08):** for under-13 grades, parents answer;
    no child account, no child named.
12. **No Late (2026-10-08):** class questions are Did or Didn't. Once the
    night (or the due date) passes, it's closed.
