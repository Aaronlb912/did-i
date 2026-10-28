// Builds the plain HTML topic pages in public/ (one search phrase each), the
// guides list, sitemap.xml and robots.txt. Words come from
// docs/keywords.csv (keyword-planner skill). Run: node scripts/seo-pages.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const SITE = 'https://did-i.app'
const APP_STORE = 'https://apps.apple.com/app/id6814688066'
const today = new Date().toISOString().slice(0, 10)
// Bump when the guide words change, so sitemap dates mean something.
const UPDATED = '2026-10-26'
const ORG = { '@type': 'Organization', name: 'Did I', url: `${SITE}/`, logo: `${SITE}/icon-512.png` }
const APP = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'Did I??? Habit Reminders',
  url: `${SITE}/`,
  image: `${SITE}/icon-512.png`,
  operatingSystem: 'iOS, watchOS, Android',
  applicationCategory: 'LifestyleApplication',
  installUrl: APP_STORE,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}
const updatedLabel = new Date(`${UPDATED}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

const pages = [
  {
    slug: 'remember-if-you-did-something',
    title: 'How to remember if you did something today | Did I',
    description: 'Did I drink water? Did I stretch? Why you forget doing routine things, and a simple way to know for sure: ask once, answer Did or Not yet, and check later.',
    h1: 'How to remember if you did something today',
    lead: 'You stand in the kitchen and wonder: did I already drink water today? Did I text them back? You did it, maybe. You just cannot remember doing it. Here is why that happens and a simple way to stop guessing.',
    sections: [
      ['Why routine things vanish from memory', 'Things you do every day run on autopilot. Your brain saves effort by not storing each time as its own memory, so today blurs into yesterday. That is normal. It is also why "I think I did" is not the same as knowing.'],
      ['Write it down at the moment you do it', 'The fix is a record made right then, not a memory you try to pull up later. A note, a mark on a paper calendar, or a tap in an app all work. What matters is that it takes a second and happens every time.'],
      ['Ask a yes or no question', 'Long lists are easy to skip. One clear question is not. "Did I take a walk?" has two answers. When the answer is saved, you can look it up instead of wondering.'],
      ['Let the question come to you', 'The hard part is remembering to check. Put the question where your eyes already go: your home screen, your watch, or a reminder at the time it matters. Then you do not have to remember to remember.'],
      ['How Did I does it', 'Did I asks you one question at a time. It shows up on a home screen widget, on Apple Watch, or as a reminder at the time you set. Swipe right for Did or left for Not yet. Later, open Today or the calendar to see what you already answered.'],
      ['Not yet is a fine answer', 'Not yet does not break anything. You can still tap Did later that day. Streaks count days in a row if they help you, and gentle mode hides the number if they do not.'],
      ['Start with three questions', 'Pick three small things you often wonder about, like "Did I drink water?", "Did I stretch?" and "Did I read tonight?". Add more once those feel easy. A short list you answer beats a long one you ignore.'],
    ],
    faq: [
      ['Why do I forget if I did something?', 'Routine actions run on autopilot, so your brain does not save each one as a clear memory. A quick record made at the time fixes that.'],
      ['What is the easiest way to keep track?', 'One yes or no question per habit, answered the moment you do it, somewhere you already look, like a home screen widget.'],
      ['Is Did I free?', 'Yes. Did I is free on iPhone, and Android is in beta. The shop is optional.'],
    ],
  },
  {
    slug: 'habit-tracker-you-forget-to-open',
    title: 'A habit tracker for people who forget to open habit trackers | Did I',
    description: 'You download a habit tracker, use it for three days, then forget it exists. Did I flips that: the question comes to your widget, watch or a reminder.',
    h1: 'A habit tracker for people who forget to open habit trackers',
    lead: 'Most habit trackers work great for the first few days. Then you forget to open one, then another, and soon the app sits in a folder you never look at. The problem is not you. It is the app waiting for you to show up.',
    sections: [
      ['Why habit trackers get forgotten', 'A habit tracker asks you to build a habit before it can help you build a habit: the habit of opening it. On a busy day that is one more thing to remember, and it is the first thing to go.'],
      ['Flip it around', 'Instead of you going to the tracker, the tracker comes to you. Put the question where you already look many times a day. Then answering takes a second and does not depend on memory.'],
      ['Where Did I shows up', 'A home screen widget shows the next open question every time you unlock your phone. Apple Watch can ask from your wrist. A question with a time sends a reminder then. You can answer in all three places without opening the app.'],
      ['One question, two answers', 'Did I never shows a wall of checkboxes. It asks one question, like "Did I take a walk?". Swipe right for Did or left for Not yet, and the next one comes up.'],
      ['Missing a day is fine', 'Not yet is an answer, not a failure. You can still tap Did later that day. If streak numbers stress you out, gentle mode hides them.'],
      ['Keep it small', 'Start with two or three questions. When they feel automatic, add one more. A short list that comes to you beats a long one you have to go find.'],
    ],
    faq: [
      ['Why do I keep quitting habit trackers?', 'Most of them only work if you remember to open them. When a busy day breaks that habit, the tracker goes quiet too.'],
      ['Do I have to open the app to answer?', 'No. Answer from the home screen widget, Apple Watch or a reminder.'],
      ['Is it free?', 'Yes. Did I is free on iPhone, and Android is in beta.'],
    ],
  },
  {
    slug: 'one-question-a-day',
    title: 'How to build a habit with one question a day | Did I',
    description: 'Big habit plans fall apart. One small yes or no question a day is easier to keep. How to pick the question, when to ask it, and what to do on a miss.',
    h1: 'How to build a habit with one question a day',
    lead: 'Big plans like "get healthy" or "read more" are hard to act on. A single question you answer every day is not. Here is how to turn a goal into one daily question and keep it going.',
    sections: [
      ['Turn the goal into a question', 'Pick one small action you can say yes or no to. "Read more" becomes "Did I read a page tonight?". "Move more" becomes "Did I take a walk?". If you cannot answer it in a word, make it smaller.'],
      ['Make it small enough for a bad day', 'The question should be easy on your worst day, not your best. One page, five minutes, one glass. On good days you will do more anyway.'],
      ['Ask at the same time', 'Tie the question to a time or a moment you already have, like after dinner or before bed. A reminder at that time does the remembering for you.'],
      ['Answer honestly', 'Did or Not yet. A Not yet is useful: it tells you the question is too big or the time is wrong. Change one of them and keep going.'],
      ['Watch the days add up', 'Seeing days in a row is a quiet reward. A calendar of Did days shows you how far you have come, even after a gap.'],
      ['Add the next one later', 'When the first question feels automatic, add a second. Habits stack better one at a time than all at once.'],
      ['How Did I helps', 'Did I asks one question at a time on your widget, watch or a reminder. Swipe Did or Not yet. Today shows what is still open, and the calendar shows your days.'],
    ],
    faq: [
      ['How small should the question be?', 'Small enough to do on your worst day. You can always do more.'],
      ['What if I miss a day?', 'Answer Not yet and pick it up tomorrow. If you miss often, make the question smaller or move its time.'],
      ['How many questions should I start with?', 'One to three. Add more once those feel easy.'],
    ],
  },
  {
    slug: 'ask-without-nagging',
    title: 'How to ask someone if they did a chore without nagging | Did I',
    description: 'Texting "did you take the trash out?" again and again turns into nagging. Ask once instead: send a question that waits in their inbox until they answer.',
    h1: 'How to ask someone if they did a chore without nagging',
    lead: 'You text "did you take the trash out?", then "??", then "hello?". Nobody likes that thread, on either side. There is a calmer way to check on shared chores.',
    sections: [
      ['Why reminders turn into nagging', 'Each extra text feels like pressure, and each missed text feels like being ignored. The chore gets tangled up with the relationship, and both get worse.'],
      ['Ask once, in one place', 'Instead of a thread, send one question that waits until they are ready. They see it when they check, and you do not have to keep asking.'],
      ['Agree on the question together', 'Decide the chore and the day out loud first: trash goes out Tuesday night. Then the question is a shared plan, not a surprise demand.'],
      ['Do the chore together', 'Some chores belong to more than one person. Answer them together, see who has done today, and keep a streak as a household.'],
      ['How Did I does it', 'With Did you, you send a friend or family member a question, once or every day. It lands in their inbox and they choose to keep it. With Did we, you pick who is in and keep a streak together. Family questions show up for everyone in the family.'],
      ['Say thanks', 'When someone finishes, send a cheer. A small thank you does more for the next time than any reminder.'],
    ],
    faq: [
      ['Do I still have to text them?', 'No. The question waits in their inbox in Did I, so there is no text thread to keep up.'],
      ['Can we share a streak?', 'Yes. Did we questions keep a streak for everyone who is in.'],
      ['Is it free?', 'Yes. Did I is free on iPhone, and Android is in beta.'],
    ],
  },
  {
    slug: 'streaks-without-guilt',
    title: 'Streaks without the guilt: what Not yet is for | Did I',
    description: 'Streaks help until one breaks and you quit. Did I uses Did and Not yet, lets you tap Did later that day, and has a gentle mode that hides the number.',
    h1: 'Streaks without the guilt: what Not yet is for',
    lead: 'A streak feels great at day 30 and awful the day it breaks. For a lot of people that one broken day is where the habit ends. It does not have to work that way.',
    sections: [
      ['Why a broken streak makes you quit', 'When the number resets to zero, all the work behind it feels gone. It is easier to stop than to start over at one. That is the guilt trap.'],
      ['Not yet instead of no', 'Did I has two answers: Did and Not yet. Not yet means today is still open. Nothing turns red and no one scolds you.'],
      ['Later the same day still counts', 'Answered Not yet this morning and did it tonight? Tap Did. It is still an answer for today.'],
      ['Hide the number if it stresses you', 'Gentle mode hides streak numbers. Your answers and your calendar are still there, without a counter watching you.'],
      ['Look at the calendar, not just the count', 'A calendar full of Did days shows the real story: most days you showed up. One gap does not erase that.'],
      ['Start again at one', 'Day one after a break is still a day one. The habit is the showing up, not the number.'],
    ],
    faq: [
      ['What does Not yet mean?', 'It means you have not done it yet today. You can still tap Did later that day.'],
      ['Can I turn streak numbers off?', 'Yes. Gentle mode hides them.'],
      ['Is Did I free?', 'Yes. Did I is free on iPhone, and Android is in beta.'],
    ],
  },
  {
    slug: 'habit-tracker-for-adhd',
    title: 'A habit tracker for ADHD that comes to you | Did I',
    description: 'Did I is a free habit tracker for ADHD brains. The question shows up on your widget, watch or a reminder, one at a time. Swipe Did or Not yet. No guilt for a miss.',
    h1: 'A habit tracker for ADHD that you do not have to remember to open',
    lead: 'Most habit trackers fail the same way: you forget to open them. Did I brings each question to you, one at a time, at the time you pick.',
    sections: [
      ['Out of sight is out of mind', 'A widget keeps the next question on your home screen. Your watch can ask too. Give a question a time and it buzzes you then. You answer right there, without opening an app full of other things.'],
      ['One thing on the screen', 'No long list staring back. You see one question: "Did I drink water?" Swipe right for Did, left for Not yet. Then the next one.'],
      ['Not yet is a fine answer', 'Nothing flashes red. Streaks are there if they help, and gentle mode hides the numbers if they stress you out. Your days still count.'],
    ],
    faq: [
      ['Is Did I made for ADHD?', 'It is made for people who forget to open habit trackers, which a lot of ADHD folks know well. It asks you, instead of waiting for you.'],
      ['Does it cost money?', 'Did I is free. The shop has optional coins and gems for looks and buddies.'],
    ],
  },
  {
    slug: 'habit-tracker-widget',
    title: 'Habit tracker widget: answer from your home screen | Did I',
    description: 'Did I puts your next habit question in a home screen widget. Tap Did or Not yet right on the widget. Free habit tracker for iPhone, Android beta.',
    h1: 'A habit tracker widget you can answer from',
    lead: 'The Did I widget shows the next open question on your home screen. Tap Did or Not yet on the widget itself. The app does not need to open.',
    sections: [
      ['See it, answer it', 'If it is on your home screen, you see it every time you unlock your phone. That is the whole point: the reminder sits where your eyes already go.'],
      ['Always the next one', 'Answer one and the widget moves to the next question. When you are done for the day it says so.'],
      ['Sorted by folder', 'Keep questions in folders like Morning, Me or Home, and they come up in order.'],
    ],
    faq: [
      ['Can I answer without opening the app?', 'Yes. Tap Did or Not yet on the widget.'],
      ['Does the widget work on Android?', 'Yes. Android is in beta on Google Play.'],
    ],
  },
  {
    slug: 'apple-watch-habit-tracker',
    title: 'Apple Watch habit tracker: answer from your wrist | Did I',
    description: 'Answer your habits from your Apple Watch. Did I asks one question at a time, a ring fills as you go, and your buddy comes along. Free on iPhone.',
    h1: 'An Apple Watch habit tracker that asks you',
    lead: 'Did I on Apple Watch shows one question at a time. Tap Did or Not yet. A ring around the screen fills as you go.',
    sections: [
      ['From your wrist', 'No phone needed in the moment. The question comes up on your watch and you answer it there.'],
      ['A ring and a buddy', 'The ring fills as you answer. Your buddy shows up in the look you picked in the shop.'],
      ['Works with the phone app', 'Answers sync with your iPhone, your widget and your streaks.'],
    ],
    faq: [
      ['Do I need an iPhone?', 'Yes. The watch app pairs with Did I on iPhone.'],
      ['Is the watch app free?', 'Yes. It comes with Did I.'],
    ],
  },
  {
    slug: 'family-habit-tracker',
    title: 'Family habit tracker and shared chores | Did I',
    description: 'Start a family in Did I and share a code. "Did you take the dog out?" shows up for everyone. Keep a streak together and cheer when someone finishes.',
    h1: 'A family habit tracker that checks in without nagging',
    lead: 'Start a family, share the code, and family questions show up for everyone in it. See who has done today and send a cheer.',
    sections: [
      ['Questions for the whole family', 'Add "Did you feed the cat?" once. Everyone in the family gets it.'],
      ['Did we, together', 'For things you do together: pick who is in, pick when it counts, and keep a streak together.'],
      ['Send a question to a friend', 'Send a friend a question, once or every day. It lands in their inbox and they choose to keep it.'],
    ],
    faq: [
      ['Can kids use it?', 'Families can add a kid for shared chores. A parent sets it up and keeps an eye on it.'],
      ['Can everyone see my questions?', 'No. Only family questions are shared. Your own stay yours.'],
    ],
  },
  {
    slug: 'habit-reminder-app',
    title: 'Habit reminder app: it asks at the time you set | Did I',
    description: 'Did I is a habit reminder app that asks one question at the time you set. Swipe Did or Not yet. Free on iPhone, Android in beta.',
    h1: 'A habit reminder app that asks, not nags',
    lead: 'Give a question a time, like the morning, and Did I reminds you then. One question, two answers: Did or Not yet.',
    sections: [
      ['Pick when it comes', 'Every day, every few days, just once, or every so often after you do it.'],
      ['Or check at the end of the day', 'Skip the times and go through them all in one sitting.'],
      ['Quiet when you are done', 'Answer it and the reminder is gone. Nothing follows you around.'],
    ],
    faq: [
      ['Do I need an account?', 'No account is needed to start.'],
      ['Can it remind me more than once a day?', 'Yes. Each question can have its own time.'],
    ],
  },
  {
    slug: 'daily-checklist-app',
    title: 'Daily checklist app, one item at a time | Did I',
    description: 'A daily checklist app that shows one item at a time so you always know what is next. Did I is free on iPhone, with widgets and Apple Watch.',
    h1: 'A daily checklist app that shows one thing at a time',
    lead: 'A long checklist is easy to ignore. Did I shows one item, asks "Did I?", and moves on. Home shows only what is still open.',
    sections: [
      ['Write it once', 'Add each item once. It comes back on the days you pick.'],
      ['Only what is left', 'Done items get out of the way. What is still open is all you see.'],
      ['Check it from anywhere', 'Your home screen widget, your watch, or a reminder.'],
    ],
    faq: [
      ['Is it free?', 'Yes. The shop is optional.'],
      ['Can I sort items?', 'Yes, with folders.'],
    ],
  },
  {
    slug: 'free-habit-tracker-app',
    title: 'Free habit tracker app with streaks and rewards | Did I',
    description: 'Did I is a free habit tracker app with streaks, coins, a shop of buddies and looks, widgets and Apple Watch. iPhone now, Android in beta.',
    h1: 'A free habit tracker app with streaks and small rewards',
    lead: 'Did I is free to download and use. Answer your questions, keep a streak, and earn coins for buddies, looks and cheers in the shop.',
    sections: [
      ['Streaks without guilt', 'Days in a row count up. Gentle mode hides the number if you would rather not see it.'],
      ['Rewards you can see', 'Coins come from answering. Spend them on buddies and looks.'],
      ['Nothing to set up', 'No account needed to start. Add a question and go.'],
    ],
    faq: [
      ['What costs money?', 'Nothing is required. Gems in the shop are optional.'],
      ['Is there an Android app?', 'Yes, in beta on Google Play.'],
    ],
  },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const style = `:root{--di-bg:#0e1014;--di-ink:#f4f6fa;--di-ink-soft:#99a1b0;--di-line:#2b3140;--di-on:#c9f24d}
*{box-sizing:border-box}body{margin:0;background:var(--di-bg);color:var(--di-ink);font:17px/1.6 Inter,ui-sans-serif,system-ui,'Segoe UI',Roboto,Arial,sans-serif}
main,header,footer{max-width:42rem;margin:0 auto;padding:1.25rem 1rem}header{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}header a{color:var(--di-ink);text-decoration:none}header .brand{font-weight:700;font-size:1.1rem}header nav{display:flex;gap:.5rem;flex-wrap:wrap}header nav a{padding:.5rem .8rem;border:1px solid var(--di-line);border-radius:10px;font-weight:600}header nav a.dl{background:var(--di-on);color:var(--di-bg);border-color:var(--di-on)}
.back{display:flex;flex-direction:column;gap:.6rem;margin:2rem 0}.back a{display:block;padding:.9rem 1rem;border:1px solid var(--di-line);border-radius:12px;font-weight:600;text-decoration:none;color:var(--di-ink)}
h1{font-size:clamp(1.8rem,5vw,2.6rem);line-height:1.15;margin:1rem 0}h2{font-size:1.2rem;margin:2rem 0 .4rem}p{color:var(--di-ink-soft)}.lead{font-size:1.15rem;color:var(--di-ink)}
a{color:var(--di-on)}.cta{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.5rem 0}.cta a{display:block;padding:.85rem 1.2rem;border:1px solid var(--di-line);border-radius:12px;font-weight:600;text-decoration:none}
.cta a:first-child{background:var(--di-on);color:var(--di-bg);border-color:var(--di-on)}ul.more{padding-left:1.1rem}ul.more li{margin:.5rem 0;color:var(--di-ink-soft)}.updated{font-size:.9rem}footer{border-top:1px solid var(--di-line);font-size:.9rem}`

const cta = `<div class="cta"><a href="${APP_STORE}">Get Did I on the App Store</a><a href="/beta">Join the Android beta</a></div>`

function shell({ path, title, description, body, jsonld }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=3">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Did I">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.png?v=2">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:locale" content="en_US">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>${style}</style>
</head>
<body>
<header><a class="brand" href="/">Did I</a><nav><a href="/">Home</a><a href="/guides/">Guides</a><a class="dl" href="/download">Download app</a></nav></header>
<main>
${body}
<div class="back">${path === '/guides/' ? '' : '<a href="/guides/">All guides</a>'}<a href="/">Back to the Did I home page</a></div>
</main>
<footer><p><a href="/">Home</a> · <a href="/guides/">Guides</a> · <a href="/download">Download</a> · <a href="/privacy">Privacy</a></p></footer>
</body>
</html>
`
}

for (const p of pages) {
  const path = `/${p.slug}/`
  const others = pages.filter((o) => o !== p)
  const body = `<h1>${esc(p.h1)}</h1>
<p class="lead">${esc(p.lead)}</p>
${cta}
${p.sections.map(([h, t]) => `<h2>${esc(h)}</h2>\n<p>${esc(t)}</p>`).join('\n')}
<h2>Questions</h2>
${p.faq.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join('\n')}
${cta}
<p class="updated">Updated <time datetime="${UPDATED}">${updatedLabel}</time></p>
<h2>More</h2>
<ul class="more">${others.map((o) => `<li><a href="/${o.slug}/">${esc(o.h1)}</a></li>`).join('')}</ul>`
  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.h1,
      description: p.description,
      image: `${SITE}/og-image.png`,
      dateModified: UPDATED,
      author: ORG,
      publisher: ORG,
      mainEntityOfPage: `${SITE}${path}`,
      about: APP,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Did I', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE}/guides/` },
        { '@type': 'ListItem', position: 3, name: p.h1, item: `${SITE}${path}` },
      ],
    },
  ]
  mkdirSync(`public/${p.slug}`, { recursive: true })
  writeFileSync(`public/${p.slug}/index.html`, shell({ path, title: p.title, description: p.description, body, jsonld }))
}

mkdirSync('public/guides', { recursive: true })
writeFileSync(
  'public/guides/index.html',
  shell({
    path: '/guides/',
    title: 'Guides: habit trackers that come to you | Did I',
    description: 'How Did I works as an ADHD habit tracker, a widget, an Apple Watch app, a family tracker, a reminder app and a daily checklist.',
    body: `<h1>Guides</h1>\n<p class="lead">How Did I fits the way you already use your phone.</p>\n<ul class="more">${pages
      .map((p) => `<li><a href="/${p.slug}/">${esc(p.h1)}</a><br>${esc(p.description)}</li>`)
      .join('')}</ul>\n${cta}`,
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Did I guides',
        url: `${SITE}/guides/`,
        hasPart: pages.map((p) => ({ '@type': 'Article', headline: p.h1, url: `${SITE}/${p.slug}/` })),
      },
      APP,
    ],
  }),
)

const urls = ['/', '/download', '/press', '/beta', '/hunt', '/privacy', '/terms', '/guides/', ...pages.map((p) => `/${p.slug}/`)]
writeFileSync(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${u === '/guides/' || pages.some((p) => u === `/${p.slug}/`) ? UPDATED : today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\nDisallow: /app\n\nSitemap: ${SITE}/sitemap.xml\n`)
// A plain list for AI crawlers (llmstxt.org).
writeFileSync(
  'public/llms.txt',
  `# Did I

> Did I??? Habit Reminders is a free habit app for people who forget to open habit trackers. One question at a time comes to a home screen widget, Apple Watch or a reminder. Swipe Did or Not yet. Free on iPhone. Android is in beta at ${SITE}/beta.

## Guides

${pages.map((p) => `- [${p.h1}](${SITE}/${p.slug}/): ${p.description}`).join('\n')}

## Links

- [App Store](${APP_STORE})
- [Android beta](${SITE}/beta)
- [Press](${SITE}/press)
`,
)
console.log(`wrote ${pages.length} topic pages, guides, sitemap.xml, robots.txt`)
