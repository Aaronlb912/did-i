# Classes (parked idea)

Status: on the backburner (2026-10-01). Not built. Idea from a friend of
Aaron's: teachers use Did I to remind students about their work.

## Who it is for

High school and college: students 13 and up, stated at sign-up. Middle
school and younger is out. That keeps clear of the extra rules for children
under 13 (COPPA, App Store kids category) and most school data rules.

## What it is

**Classes.** A teacher makes a class and posts questions to it. Each one
lands on every student's Tonight like their own question: "Did I finish the
chapter 4 reading?", "Did I study for Friday's quiz?". Students answer Did or
nope. The teacher sees who has done it.

Name in the app: **Classes** ("make a class", "join a class"). Questions keep
the Did I voice. No "assignments" in the copy; the product words stay
question, tonight, did, nope.

## How it works

1. **Make a class.** A teacher names it and gets a join link and code, built
   like the invite links and friend IDs. No phone numbers or emails shared.
2. **Join.** A student opens the link or types the code. They see the class
   name and the teacher's name, then join. Leave any time.
3. **Post a question.** The teacher writes it, picks the night (or a due
   date) and an ask time. It uses deadline questions (`dueBy`) and `askAfter`,
   so it shows on Tonight, the widgets and reminders with no new parts.
4. **Answer.** Same swipe as any question. A Did can be late, the same as
   now.
5. **Roster.** The teacher sees, per question: done, late, nope, not yet.
   Students see only their own answers, never classmates'.
6. **One way.** Students cannot post to the class or message each other.
   That removes most moderation and safety work.
7. **End of term.** The teacher archives the class; it leaves students'
   Tonight. A teacher can remove a student.

## Under the hood

- New tables: `classes`, `class_members`, `class_questions`, and answers
  stored the way Did we stores them. RLS on every table: a student reads the
  classes they are in and their own answers; the teacher reads the roster for
  their classes only. `security definer` helpers for the roster, like
  `known_people()`.
- Caps in the database: members per class (start at 60), classes per teacher,
  questions per class per day.
- Reuses: Did we cards (closest existing feature), invite links, reminders,
  widget rows, Tonight ordering by ask time.
- Reporting: a student can report a class, which also leaves it, the same
  pattern as gift reports.

## Decisions before building

1. **Age gate.** 13+ only, with a line at sign-up. Confirm this is enough for
   high schools that want to use it.
2. **What a teacher sees.** Only answers to class questions, never a
   student's own questions, streaks or tags. This changes what others can see
   about someone, so it needs Aaron's yes.
3. **Price.** A teacher plan is a natural paid tier; students stay free.
4. **Schools.** Whether to sell to schools (contracts, data agreements)
   or keep it to teachers signing up on their own. Start with the second.

## A cheap first test

Before full Classes, let a Did we card be marked as a **class card**:
joined by link, the maker sees the roster, members cannot see each other,
capped at about 40. It is a small change on top of Did we and shows whether
teachers use it at all.
