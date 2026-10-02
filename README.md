# Survive & Thrive

**Pal cares · Pal cuts · Pal claims. An AI guardian for a mother's $400 month.**

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) by a single mother who lives on this budget.

Most "agentic commerce" demos teach an AI to spend money for people who have plenty. This one does the opposite: it stands between a tired parent and a feed full of $45 "calming oils", and lets PayPal move only the dollars that survive the cut.

## What it does

Three pillars. Desktop gets a top navigation and a wide layout; phones get a bottom tab bar with a floating "Ask Pal" button.

| Screen | What it is |
|---|---|
| **Home** | This month at a glance: available budget, smart tax intercepted, earned back, claimable per month, the children and their ages, the latest verdict, recent PayPal activity. |
| **Budget** | The budget bar, every verdict with its PayPal button, the ledger, and the earn-back surveys. |
| **Ask Pal** | The conversation: she says what she thinks she needs, Pal answers with a verdict card. |
| **Resources** | What she can claim, from her profile. |
| **Me** | Everything Pal knows: name, children (birth month and weeks at birth, so preterm babies get corrected age), daily diapers and formula, household, income, ZIP, budget, language. |

### Pal cares

Mom fills in **Me** once: children with birth month and gestational weeks (a 34-week baby gets a corrected age, which changes feeding and development advice), daily diaper and formula use, household and income. Then she sets the month: `$400 total · $100 locked for food`. The locked part is untouchable; the agent only ever sees what is left.
### Pal cuts

**Smart-tax filter.** She types what she thinks she needs, the way it sits in her head ("baby has a rash, Instagram says buy the $45 organic oil and the $60 sleep sack"). Claude returns a verdict per item: **BUY / SWAP / SKIP / DEFER**, a concrete cheaper equivalent with a realistic US retail price, and a one-line reason. Money fields are recomputed server-side; the model never gets the last word on arithmetic. Typical result: $105 asked → $18 approved.
**Execute minimal purchase (PayPal Checkout).** One button. The agent builds a PayPal order for exactly the approved cart (itemised), Mom approves in the PayPal popup, the server captures it, and the budget bar drops by the captured amount with the PayPal capture id on the ledger.
### Pal claims

**Earn back (PayPal Payouts).** Brands pay a few dollars for 20 seconds of real answers from real mothers. She taps three answers; the server sends a PayPal Payout to her account; the budget bar goes up with the payout batch id.

**What you can claim.** She enters ZIP, state, household size, income, children's ages. Claude, with web search over official sites, returns every program she likely qualifies for in her area: WIC, SNAP under its state name, Medicaid/CHIP, the nearest diaper bank, Head Start, child care subsidy, HEAP/LIHEAP, Lifeline, EITC/CTC, 211, pantries, free-goods groups. Each one carries the single rule that decides her eligibility, what it is worth per month, three to four steps, the documents to bring, and the official link. A Queens, NY profile on $1,200/month found 12 programs worth roughly $1,500/month in about two minutes.

Everything that touches money is a real PayPal sandbox API call. Nothing is faked on screen. The UI is bilingual (English / 简体中文, toggle top right); the agent answers in the chosen language.

## Stack

- Next.js 16 (App Router) + Tailwind 4
- **AI:** Anthropic Claude (`claude-opus-5`) via `@anthropic-ai/sdk`. Purchase filter: structured output enforced with a Zod schema (`src/lib/agent.ts`). Benefits finder: Claude web search tool + the same structured-output approach (`src/lib/resources-agent.ts`)
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
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`) | Optional. On Vercel/Render the disk is not durable, so state goes to one Supabase row. Run `supabase/schema.sql` once. Locally you can skip this; state lives in `data/state.json`. |

To pay in the demo, log into the PayPal popup with that same sandbox Personal account (password is in Sandbox Accounts → View/Edit).

## Boundaries (what it does not do)

- Sandbox only. Orders are paid to our own sandbox business account; the app does not place orders at Walmart or anywhere else. The merchant names are the agent's buying advice, not integrations.
- Prices are the model's realistic US retail estimates, not live quotes.
- Single user, one shared state per deployment. No accounts, no auth. Anyone with the demo URL sees and changes the same month.
- The brand surveys are seeded examples; there is no brand marketplace behind them yet.
- The benefits finder is AI research over official sites on the day it runs. Income limits and local programs change; every card says to confirm with the program. It is not legal or benefits counsel.
- Not medical advice. When a symptom needs a doctor the agent says so in the verdict and still prices the cheapest safe home option.

## License

MIT, see `LICENSE`.
