// Builds the plain HTML topic pages in public/ (one search phrase each), the
// guides list, sitemap.xml and robots.txt. Words come from
// docs/keywords.csv (keyword-planner skill). Run: node scripts/seo-pages.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const SITE = 'https://did-i.app'
const APP_STORE = 'https://apps.apple.com/app/id6814688066'
const today = new Date().toISOString().slice(0, 10)

const pages = [
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
@media (prefers-color-scheme:light){:root{--di-bg:#f6f5f1;--di-ink:#16181d;--di-ink-soft:#5a6170;--di-line:#d9d6cd;--di-on:#4a6b00}}
*{box-sizing:border-box}body{margin:0;background:var(--di-bg);color:var(--di-ink);font:17px/1.6 Inter,ui-sans-serif,system-ui,'Segoe UI',Roboto,Arial,sans-serif}
main,header,footer{max-width:42rem;margin:0 auto;padding:1.25rem 1rem}header a{color:var(--di-ink);font-weight:700;text-decoration:none}
h1{font-size:clamp(1.8rem,5vw,2.6rem);line-height:1.15;margin:1rem 0}h2{font-size:1.2rem;margin:2rem 0 .4rem}p{color:var(--di-ink-soft)}.lead{font-size:1.15rem;color:var(--di-ink)}
a{color:var(--di-on)}.cta{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.5rem 0}.cta a{display:block;padding:.85rem 1.2rem;border:1px solid var(--di-line);border-radius:12px;font-weight:600;text-decoration:none}
.cta a:first-child{background:var(--di-on);color:var(--di-bg);border-color:var(--di-on)}ul.more{padding-left:1.1rem}footer{border-top:1px solid var(--di-line);font-size:.9rem}`

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
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>${style}</style>
</head>
<body>
<header><a href="/">Did I</a></header>
<main>
${body}
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
<h2>More</h2>
<ul class="more">${others.map((o) => `<li><a href="/${o.slug}/">${esc(o.h1)}</a></li>`).join('')}</ul>`
  const jsonld = [
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
      .map((p) => `<li><a href="/${p.slug}/">${esc(p.h1)}</a></li>`)
      .join('')}</ul>\n${cta}`,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Did I guides', url: `${SITE}/guides/` },
  }),
)

const urls = ['/', '/download', '/press', '/beta', '/privacy', '/terms', '/guides/', ...pages.map((p) => `/${p.slug}/`)]
writeFileSync(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\nDisallow: /app\n\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`wrote ${pages.length} topic pages, guides, sitemap.xml, robots.txt`)
