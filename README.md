# MamaPal

**Pal cares · Pal cuts · Pal claims. A pal for a mother's hardest month.**

Live demo: https://mamapal.vercel.app (sign in with any name; it's a demo session, no password).
Demo video (2:55): https://youtu.be/jDOPtrLy4sY

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) by a mother who lives on this budget.

Most "agentic commerce" demos teach an AI to spend money for people who have plenty. This one does the opposite: it stands between a tired parent and a feed full of $45 "calming oils", and lets PayPal move only the dollars that survive the cut.

## What it does

Three pillars. Desktop gets a top navigation and a wide layout; phones get a bottom tab bar with a floating "Ask Pal" button.

| Screen | What it is |
|---|---|
| **Intro / sign-in** | A landing page and a mock session (name + email cookie). No real accounts yet. |
| **Welcome** | First-run wizard: language, your name, children, daily use, money and where you live. |
| **Pal (home)** | Pal talks: money left, the pantry (and a warning when diapers or formula run low), what the baby needs this month in three tiers, help you can claim, the last verdict. Topic chips and the composer sit at the bottom; verdicts appear inline. |
| **Budget** | The budget bar, every verdict with its PayPal button, the ledger, and the earn-back surveys. |
| **Ask Pal** | The conversation: she says what she thinks she needs, Pal answers with a verdict card. |
| **Resources** | What she can claim, from her profile. |
| **Me** | Records: a status card (edit to change), the pantry, this month's numbers, every verdict, an AG Grid ledger across months (sort, filter, search, totals, CSV), archived months. |

### Pal cares

Mom answers five questions once: children with birth month and any medical notes, daily diaper and formula use, household, income, ZIP. From that Pal knows the baby's stage and builds the month in Maslow order: must-haves (diapers, milk, food, health, care, clothes), then growth and learning, then joy and outings, each priced at store-brand retail with the cheaper way next to it. Pal also keeps a pantry: every purchase paid through Pal adds diapers, formula or wipes; daily use drains it; when something has a week left, the welcome card says so. She sets the month: `$400 total · $100 locked for food`. The locked part is untouchable; the agent only ever sees what is left.
### Month run: hand Pal the month

One button, one goal: *keep the baby covered until the month ends, on what is left.* Pal works it in five steps and shows each one as it finishes, with its time and AI cost:

1. **Take stock** (no model): money free and a small cushion kept aside, days left, when diapers, wipes and formula run out, this stage's must-haves, what was already bought, which benefits she likely qualifies for.
2. **Plan** (Claude, structured output): what to buy now, what to buy later and by which day, what waits for another month. Whole packs, store brand, must-haves first, a child's medical notes over savings, benefits before money. It may not write dollar amounts; the app computes them.
3. **Find real prices** (Claude + web search): offers with links at several stores.
4. **Check the work** (no model): every link is opened (price seen on the page / page opens / store blocks robots / dead and dropped); money is recomputed; supplies must reach month end and later buys must land before something runs out; no growth or joy items while a must-have is short; no repeats. Plan problems go back to step 2 (twice at most); unpriced items go back to step 3 once; anything still open is listed for her, never dropped.
5. **Hand her the cart**: a normal Pal cart with the later buys and what was checked. She pays in PayPal herself; Pal never pays.

Every step is saved as it finishes, so a timeout resumes at the next step. Three real runs, the five defects they exposed and the fix for each are in [`docs/evidence/`](docs/evidence/README.md).

### Pal cuts

**Smart-tax filter.** She types what she thinks she needs, the way it sits in her head ("baby has a rash, Instagram says buy the $45 organic oil and the $60 sleep sack"). Claude returns a verdict per item: **BUY / SWAP / SKIP / DEFER**, a concrete cheaper equivalent with a realistic US retail price, and a one-line reason. Money fields are recomputed server-side; the model never gets the last word on arithmetic. Typical result: $105 asked → $18 approved. Then **check prices across stores**: Pal searches the web for the same item at Walmart, Target, Amazon, Costco, Aldi, dollar stores and pharmacies, lists real offers with links, and lowers the cart if it finds cheaper. Pal is nobody's shop.
**Execute minimal purchase (PayPal Checkout).** One button. The agent builds a PayPal order for exactly the approved cart (itemised), Mom approves in the PayPal popup, the server captures it, and the budget bar drops by the captured amount with the PayPal capture id on the ledger.
### Pal claims

**Earn back (PayPal Payouts).** Brands pay a few dollars for 20 seconds of real answers from real mothers. She taps three answers; the server sends a PayPal Payout to her account; the budget bar goes up with the payout batch id.

**What you can claim.** She enters ZIP, state, household size, income, children's ages. Claude, with web search over official sites, returns every program she likely qualifies for in her area: WIC, SNAP under its state name, Medicaid/CHIP, the nearest diaper bank, Head Start, child care subsidy, HEAP/LIHEAP, Lifeline, EITC/CTC, 211, pantries, free-goods groups. Each one carries the single rule that decides her eligibility, what it is worth per month, three to four steps, the documents to bring, and the official link. A Queens, NY profile on $1,200/month found 12 programs worth roughly $1,500/month in about two minutes.

**Every rule carries its source, and the source is checked.** For each program Claude must give the official page it read and the deciding rule copied word for word. The server opens that page and looks for the words (found / numbers match / not on the page / couldn't read it), marks whether the source is a government site, opens every application link and drops dead ones. Weak sources are sent back once for a search that only accepts official pages. "Check every source again" re-runs the checks with no AI cost. The price check on any verdict card opens every store link the same way. Details and before/after numbers: [`docs/evidence/`](docs/evidence/README.md).

Everything that touches money is a real PayPal sandbox API call. Nothing is faked on screen. The UI is bilingual (English / 简体中文, toggle top right); the agent answers in the chosen language.

## Stack

- Next.js 16 (App Router) + Tailwind 4
- **AI:** Anthropic Claude (`claude-opus-5`) via `@anthropic-ai/sdk`. Month run: `src/lib/month-run.ts` (steps, checkpoints, verifier), API `src/app/api/run`. Purchase filter: structured output enforced with a Zod schema (`src/lib/agent.ts`). Benefits finder and price check: Claude web search tool + structured output (`src/lib/resources-agent.ts`, `src/lib/compare-agent.ts`). Monthly needs model: `src/lib/stages.ts`; pantry: `src/lib/inventory.ts`.
- **Ledger:** AG Grid Community (`src/components/LedgerGrid.tsx`), only on the Me page.
- **PayPal:** Orders v2 (create + capture) and Payouts v1, called directly against the sandbox REST API (`src/lib/paypal.ts`); PayPal JavaScript SDK buttons on the client
- State: one JSON blob for the single-user demo, in Supabase (`app_state` row) when configured, else `data/state.json`

## Run it

```bash
cp .env.example .env.local   # fill in the keys below
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Where it comes from |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal Developer Dashboard → Apps & Credentials → **Sandbox** → create app. Client ID goes in both `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`. |
| `PAYOUT_RECEIVER_EMAIL` | Developer Dashboard → Sandbox Accounts → the **Personal** account's email. Payouts land there. |
| `NEXT_PUBLIC_SANDBOX_BUYER_EMAIL`, `NEXT_PUBLIC_SANDBOX_BUYER_PASSWORD` | Optional. Shown with copy buttons next to the PayPal button so testers can sign into the sandbox popup without remembering the demo buyer. Fake account, fake money; never put a real account here. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`) | Optional but used in production. On Vercel/Render the disk is not durable, so state goes to one Supabase row. Run `supabase/schema.sql` once. Locally you can skip this; state lives in `data/state.json`. |

To pay in the demo, log into the PayPal popup with that same sandbox Personal account (password is in Sandbox Accounts → View/Edit).

## Boundaries (what it does not do)

- Sandbox only. Orders are paid to our own sandbox business account; the app does not place orders at Walmart or anywhere else. The merchant names are the agent's buying advice, not integrations.
- Prices are the model's realistic US retail estimates, not live quotes.
- Single shared state per deployment. The sign-in is a demo cookie, not authentication: anyone who signs in sees and changes the same month.
- The pantry tracks three consumables and only learns about purchases made through Pal; buy elsewhere and you fix the number in Me.
- Price checks are what web search found that day; stock and shipping vary.
- The brand surveys are seeded examples; there is no brand marketplace behind them yet.
- The benefits finder is AI research over official sites on the day it runs. Income limits and local programs change; every card says to confirm with the program. It is not legal or benefits counsel.
- Not medical advice. When a symptom needs a doctor the agent says so in the verdict and still prices the cheapest safe home option.

## License

MIT, see `LICENSE`.
