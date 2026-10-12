# Devpost submission copy

Paste field by field at https://paypalaihackathon.devpost.com/ → Edit project. Everything below is public; it does not mention family circumstances or any medical detail.

## Project name
MamaPal

## Tagline (max ~60 chars)
Pal cares, Pal cuts, Pal claims. A pal for a mother's hardest month.

## Links
- Try it: https://mamapal.vercel.app — open a demo household with `MAYA-DEMO`, `ROSA-DEMO` or `KEISHA-DEMO` (each opens your own private copy), or start your own with any name
- Video (2:44): NEW_YOUTUBE_LINK  (first version: https://youtu.be/jDOPtrLy4sY)
- Code (MIT): https://github.com/haodaz/mamapal

## About the project

### Inspiration
I am the maker of this project and its first user. I am a mother on a very tight budget: about four hundred dollars a month for everything after rent. Every feed I open tells me the baby needs a $45 calming oil or a $120 sound machine, and when you are tired it is hard to tell marketing from need. At the same time there was real help I qualified for and did not know how to claim. MamaPal comes out of my own months of counting diapers and dollars: I built it because I needed it, and I have been living with it since the first day it ran.

### What it does
MamaPal is an AI pal, not a dashboard. Home is a conversation: Pal answers in a sentence or two plus a small card, and a card opens in a panel beside the conversation only when there is something to look at. The tools she manages herself (this month, budget, claims, records) sit in a sidebar with her past conversations. She can type, or tap the mic and talk; when she asks by voice, Pal reads the answer back.

**Hand Pal the month.** One button: "keep the baby covered until the month ends, on what is left." Pal works it in steps and shows each one as it finishes, with its time and AI cost: take stock (money free, a small cushion kept aside, when diapers, wipes and formula run out), plan (what to buy now, what later and by which day, what waits), find real prices with links, then a checker that is not the AI opens every link, recomputes every number, checks that supplies reach month end and that later buys land before something runs out. Plan problems go back to be redone; anything still open is listed for her, never dropped. Every step is saved, so a timeout resumes where it stopped. In one real run the plan put the next formula can a week after the baby's formula would run out; the checker caught it twice and the third plan bought it now. She pays the final cart in PayPal herself; Pal never pays.

**Pal cares.** Tell Pal once who the baby is, how many diapers a day, how much formula, what you earn and where you live. From a 505-item catalog (pregnancy through school age, mother's items included) Pal lays out what this month should cost in Maslow order: must-haves first, growth and learning second, joy and outings third. Every item opens into a plain-language guide: what it is, which size, how much, the traps, and today's prices from real stores. Pal keeps a pantry: every pack paid through Pal adds diapers, formula or wipes; daily use drains it; when a week is left, the welcome card says so.

**Pal cuts.** Say what you were told to buy. Claude returns a verdict per item (buy / swap / skip / defer) with a store-brand twin, a realistic price and a one-line reason. Money fields are recomputed server-side, never trusted from the model. "Check prices across stores" searches the web for the same item at Walmart, Target, Amazon, Costco, Aldi, dollar stores and pharmacies, lists real listings with links, and lowers the cart when it finds cheaper. One PayPal button pays for exactly the approved cart; the server captures the order, writes the capture id to the ledger, drops the budget bar and updates the pantry.

**Pal claims.** From ZIP, household size and income, Pal checks official sites and lists the programs you likely qualify for (WIC, SNAP under the state's name, Medicaid/CHIP, the nearest diaper bank, Head Start, LIHEAP, Lifeline, EITC/CTC, 211, pantries, free-goods groups) with the one rule that decides each program, what it is worth per month, three steps, the documents to bring and the official link. Every rule carries the official page it came from and the deciding words copied verbatim; the server opens the page and looks for those words, marks whether the source is a government site, opens every application link and drops dead ones. Weak sources are sent back once for a search that only accepts official pages. Twenty-second brand micro-surveys pay back into the mother's PayPal through Payouts.

The ledger across months lives in an AG Grid table in Me (sort, filter, search, totals, CSV). Pal can be summoned from any page and knows where it was opened from. Bilingual (English / 简体中文).

### How we built it
- Next.js 16 (App Router), Tailwind 4, TypeScript; deployed on Vercel.
- **PayPal:** Orders v2 (create + capture) for the approved cart, Payouts v1 for survey rewards, PayPal JS SDK buttons; all against the sandbox REST API from a thin client (`src/lib/paypal.ts`).
- **Claude (claude-opus-5):** structured outputs with Zod for verdicts, month notes and item guides; the web search tool for price checks and the benefits finder; one persona prompt (hard on products, warm and plain toward the mother).
- Catalog generated by Claude stage by stage (`scripts/build-catalog.mjs`), reviewed by hand, served from JSON.
- **The month run** (`src/lib/month-run.ts`): code-controlled steps with checkpoints, Claude for the plan and the price search, a verifier with no model in it (`src/lib/verify.ts`) that opens links, finds quoted rules on official pages and recomputes money; per-step time, tokens, searches and cost.
- Voice through the browser's own speech recognition and speech synthesis.
- State: one Supabase row per household, chosen by a cookie; demo codes copy a fictional household so judges never share data. AG Grid Community for the ledger; the Pal mascot generated with Tongyi Wanxiang and cut out with a small flood-fill script.

### Challenges we ran into
- Reading our own runs found defects the checker had missed, and each became a rule: an 80-count pack passed as the price of a 720-count box; the model's note said "$23 left" when the real figure was $51 (prose may no longer state money); fresh produce searched three times with no listing; a household with two children made the plan too long and it was cut off. All five-plus fixes and the runs behind them are in `docs/evidence/`.
- Keeping money honest: the model proposes, the server computes every total and only PayPal ids count as paid.
- Long AI calls on a serverless host: streaming, two-step fallbacks and caching (guides and prices are cached per stage, item and language).
- Cross-store prices are whatever the web shows that day; the UI says so instead of pretending.
- Making the home feel like a conversation on both a phone and a desktop without two codebases.

### Accomplishments we're proud of
- The full loop runs for real in sandbox: a $105 feed-driven wish becomes an $11 cart, gets cheaper after a price check, is paid through PayPal, lands in the ledger and the pantry.
- A 505-item knowledge base that gives a tired parent concepts, not just prices.
- The benefits finder found about $2,264 a month of help for a Houston household on $1,650 a month, and the checker confirmed the deciding rule on the official page for the programs whose pages a robot can read (10 of 12 in Ohio, fewer in Texas and California, and the cards say so).
- Eight full month runs across five households: $0.59 to $1.95 of AI time and two to five minutes each, with the evidence saved step by step.

### What we learned
Low-income mothers do not want a SaaS; they want a pal. Tone is a feature. And the cheapest sensible pick is usually the store brand, which an AI can say without a sponsor.

### What's next
Real accounts with sign-in; reminders when a scheduled "later" buy comes due; a brand survey marketplace that pays mothers for honest answers; Channel3 as a product data source; sharing a month's plan with a partner or a caseworker; Spanish.

## Contribution (sidebar)
Maker and first user. I designed and built MamaPal from my own experience as a mother on a tight budget: the product, the Pal persona, the PayPal and Claude integrations, the catalog, the video. Built with Claude Code as my pair programmer.

## Built with (tags)
paypal, paypal-checkout, paypal-payouts, claude, anthropic, next.js, react, typescript, tailwind, vercel, supabase, ag-grid, zod

## Submission form checklist
- Project must meaningfully use PayPal + AI: yes (Checkout, Payouts; Claude).
- Public repo with license visible: MIT at repo root.
- Functional demo: hosted URL above, plus README run instructions.
- Video under 3 minutes on YouTube, public: 2:44 (new cut, 2026-10-12).
- Prize categories to tick: Best Use of PayPal + AI, Best Use of Agentic Commerce, Most Impactful, Best Use of AG Grid.
