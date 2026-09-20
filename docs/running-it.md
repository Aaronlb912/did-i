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

**Web (Stripe).** For each pack, create a Payment Link in Stripe at the
price in `src/lib/gem-packs.js`. Put each URL in `.env.local` as
`VITE_STRIPE_PACK_gems_1`, `VITE_STRIPE_PACK_gems_3`, and so on. Deploy
the webhook:

    supabase functions deploy gem-stripe --no-verify-jwt

Set secrets `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Point Stripe
at `https://<project>.supabase.co/functions/v1/gem-stripe` for
`checkout.session.completed`. The app sends
`client_reference_id=userId:packId` on checkout.

**Android (Google Play).** Play Billing is not wired in the app yet.
Product ids are `com.aaronbryant.didi.gems_1` through `gems_50`. Until
that ships, the Android app can send people to the web shop.

After payment, the person comes back to the app. Sync on visibility
claims unclaimed packs into the shelf.

## Before other people sign up

**Mail is the blocker.** Sign-in codes go through Supabase's built-in
mailer, which allows two sends an hour for the whole project and lands in
spam. Nothing in the repo can fix this; it needs an account with a mail
provider.

To do it: pick a provider, verify the sending domain, then put the host,
port, user, and password into Supabase under Project Settings, Auth,
SMTP. The sender address has to be on a domain that passes SPF and DKIM,
or the mail still goes to spam. Then send yourself a code and check it
arrives in the inbox rather than the junk folder.

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
