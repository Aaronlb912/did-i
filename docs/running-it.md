# Running Did I for other people

What has to be true before anyone outside this room signs up, and what
to do when something is wrong.

## The database

SQL files go in this order. Each one is safe to run again.

1. `supabase/schema.sql` shelves, profiles, devices
2. `supabase/people.sql` friends, families, invites, handles
   (or `supabase/handle-safe.sql` alone if people already ran without it)
3. `supabase/hardening.sql` indexes, policies, write caps
4. `supabase/answers.sql` the answer log, and the migration off the
   one-document shelf
5. `supabase/blocks.sql` blocking and reporting
6. `supabase/push.sql` push tokens and the nudge queue
7. `supabase/tonight.sql` Did I tonight, the public list
8. `supabase/dit-board.sql` DIT board sync, no line cap
9. `supabase/gems-social.sql` cheer sends, gifts
10. `supabase/gem-purchases.sql` real-money gem packs

After any change to any of them, run `supabase/audit.sql`. It has to come
back with no rows.

To apply one file from the terminal, put a personal access token in
`.env.local` as `SUPABASE_ACCESS_TOKEN`, then:

    npm run db:apply -- supabase/tonight.sql

To apply every file in order:

    npm run db:apply:all

The script uses proper JSON encoding. PowerShell string escaping is not
reliable on files with `$$` bodies.

`sweep_tonight()` drops lines and cheers older than fourteen nights.
Schedule it with `pg_cron` next to `sweep_push_queue()`, once a day is
plenty.

## Gem purchases

Packs are one dollar per gem at the smallest size, with a lower per-gem
price on bigger packs. The list lives in `supabase/gem-purchases.sql` and
`src/lib/gem-packs.js`.

**In-app purchases (Expo).** Gem packs sell through the App Store and
Google Play only. Product ids are in `src/lib/gem-packs.js` as
`com.aaronbryant.didi.gems_1` through `gems_50`. Create matching
consumable products in each console.

Deploy the credit function:

    supabase functions deploy gem-iap

Set secrets on the project:

- `GOOGLE_PLAY_PACKAGE_NAME=com.aaronbryant.didi`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (Play Console API access)
- `APPLE_IAP_SHARED_SECRET` (App Store Connect)

For local testing only, `GEM_IAP_TRUST=1` skips store verification.
Never use that in production.

Build with a dev client (`npx expo prebuild`, then `expo run:android` or
EAS). IAP does not work in Expo Go.

After payment, the app verifies with `gem-iap`, claims gems on sync, and
finishes the store transaction.

## Before other people sign up

**Mail is the blocker.** Sign-in codes go through Supabase's built-in
mailer, which allows two sends an hour for the whole project and lands in
spam. Nothing in the repo can fix this; it needs an account with a mail
provider.

To do it: pick a provider, verify the sending domain (SPF and DKIM on
`did-i.app` or whatever domain you send from), then put credentials in
`.env.local`:

    SMTP_HOST=
    SMTP_PORT=587
    SMTP_USER=
    SMTP_PASS=
    SMTP_FROM=support@did-i.app

Push them to Supabase:

    npm run smtp:setup

That calls the Management API with `SUPABASE_ACCESS_TOKEN`. Your PAT needs
Administrator on the project, not just Developer. Or paste the same
values in the dashboard under Project Settings, Auth, SMTP.

Send yourself a sign-in code and check it lands in the inbox, not junk.

The templates are already set to send a six digit code rather than a
link, so nothing else needs changing.

**Error reports are optional.** The error boundary writes the last break
to `did-i-last-break` and fires `did-i-broke`. Set `VITE_REPORT_URL` in
`.env.local` to a POST endpoint and `main.jsx` forwards crashes there.
Settings still shows the last break on this phone.

## Backups

Check what the project's plan actually keeps before there is anything
worth losing. On the free plan Supabase takes daily backups with a short
retention and no point-in-time recovery. Point-in-time is a paid feature.

Whatever the plan says, `answer_log` and `shelves` are the two tables
that matter. Everything else can be rebuilt; a person's history cannot.

A person can always take their own copy from Settings, Account, Download
my data.

## Checks

- `npm test` the logic that has broken before
- `npm run bench` the per render cost, fails past 6 ms
- `npm run check` both
- `supabase/audit.sql` indexes, policies, caps

## When something is slow

Start with `supabase/audit.sql`. Almost every slowdown so far has been a
missing index or a policy re-running `auth.uid()` for every row.

Then `npm run bench`. If that number moved, something in the night maths
went back to scanning a list instead of looking it up.
