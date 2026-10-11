# Evidence

## Month runs

Real runs of the month-run agent (`src/lib/month-run.ts`) against the demo household, saved step by step.
Names are replaced with "the baby"; nothing else is edited. Each file has every step's summary, time, tokens,
searches and cost, the offers with the link check the verifier did, and what was left for the mother to look at.

| Run | Steps | Time | AI cost | What happened |
|---|---|---|---|---|
| [1](2026-10-11-month-run-1.json) | 5 | 136 s | $0.78 | Passed the first checker, but reading the output showed three defects the checker missed (below). |
| [2](2026-10-11-month-run-2.json) | 9 | 223 s | $1.95 | New checker caught pack-size mismatches; prose stated no money; but it searched three times for fresh produce that has no online listing, and the price step alone cost $1.38. |
| [3](2026-10-11-month-run-3.json) | 7 | 173 s | $1.02 | Cheaper first price pass left 7 items unpriced; the checker sent only those back for one more search; then all passed, 20 links opened, 8 prices seen on the store page, nothing left for her to check. |
| [4, live](2026-10-11-month-run-4-live.json) | 9 | 279 s | $1.58 | On the deployed site (Vercel). Re-priced 7 items, then the checker sent the plan back once; the revision passed. Every step stayed inside the function time limit. From Vercel no store page showed the price to the robot (0 of 22): stores block data-center traffic harder than a home connection. |

## Defects found in the runs, and the fix for each

1. **A different pack passed as a deal (run 1).** The wipes plan was a 720-count box; the cheapest "offer" was one
   80-count pack at $1.78, and the old rule (take any offer below 1.5× the estimate) priced the whole box at $1.78.
   Fix: an offer must sit between 0.6× and 1.5× the estimate to replace it; a price seen on the store page wins over
   one only listed; when nothing is close, the cart is budgeted at the higher number and she is told to check the pack.
2. **The model's prose did its own arithmetic (run 1).** The note said "about $23 stays in your pocket"; the
   computed figure was $51. Fix: the planner may not write dollar amounts; the checker rejects any headline or note
   with one and sends the plan back. Money on the card is always the server's number.
3. **Unpriced items were handed to her instead of searched again (run 1).** 7 of 11 items came back with no offer
   and went to "for you to check". Fix: items with no offer go back to the price step once, only those items.
4. **Search loop on things that have no listing (run 2).** Fresh produce was searched three times ($0.46, 64 s)
   and never found. Fix: at most one extra price pass per run.
5. **Price step too expensive (run 2).** 20 searches at medium effort cost $1.38. Fix: up to 1.5 searches per item
   (max 12) at low effort, plus the targeted second pass from fix 3. Run 3's two price passes together: $0.95.

## Benefit sources

The benefits finder must now give, for every program, the official page it read and the deciding rule **copied word for
word** from that page. The server opens the page and looks for the quote (`src/lib/verify.ts`); it also opens every
application link and removes dead ones. Programs whose rule has no source, whose quote was not on the page, or whose
source is not a government page (for government programs) are sent back once for a search that only accepts official pages.

Demo household (Queens, NY), two searches on 2026-10-11:

| | First search (no send-back) | After the send-back pass ([file](2026-10-11-benefit-sources.json)) |
|---|---|---|
| Rule found on an official page | 2 of 12 | 3 of 12 government programs + the diaper bank on its own site |
| Source was not official | Medicaid from a third-party blog, Lifeline from a phone company's page | replaced by health.ny.gov and fcc.gov, both quotes found word for word |
| Checker could not read the source | 3 (state .gov sites refuse robots) | 4 (3 refuse robots, 1 is a PDF) |
| No source given | 6 | 4 (tax credits, pantries, Buy Nothing, cash assistance) |
| Application links | 11 open, 1 dead and removed (on the older report) | 10 open, 1 refused robots |

A finding worth keeping: the quote for the NYC child care voucher, found on nyc.gov, says the city "is no longer able to
offer child care vouchers to families that are not on cash assistance". The check surfaces the rule that actually decides it.
Known gap: the checker confirms the quote is on an official page, not that the page is for her county (WIC's quote
came from another New York county's site).

## Stress test: three demo households (2026-10-11)

Three fictional households in three states (`src/lib/personas.ts`), each signed in with its demo code, then the
benefits finder and a month run, all three at once against the local server. The checked benefits reports are saved
in `src/data/personas/*.json` and every visitor's copy starts with them.

| Household | Benefits search | Rules found on their page | No source | Checker couldn't read | Application links open | Est. help / month |
|---|---|---|---|---|---|---|
| Rosa, Columbus OH (2-year-old, pregnant, on SNAP + Medicaid) | 203 s | 10 of 12, all official | 2 | 0 | 12 of 12 | $2,459 |
| Maya, Houston TX (4-month-old on formula) | 237 s | 5 (4 official) | 5 | 1 | 9 | $2,264 |
| Keisha, Fresno CA (10-month-old with a dairy allergy, 4-year-old) | 244 s | 4 (2 official) | 5 | 3 | 10 | $2,440 |

What it shows: Ohio's program pages are plain HTML and the checker could confirm almost every rule; California's
and Texas's pages mostly refuse robots or never got a quote, so those cards honestly say "couldn't read" or "no
source". Keisha's report used her child's medical note (WIC covers dairy-free formula with a doctor's form).

The month runs stopped at the price step: the Anthropic account ran out of credit mid-test ("Your credit balance is
too low"). Each run kept the steps it had finished (stock, plan) and shows "try again from this step"; they resume
from there once credit is added. The month-run results for these households will be added then.

## What the checker verifies (no model involved)

- Every link is opened: `ok` (the page shows that price), `opens`, `blocked` (the store refuses robots), `dead` (dropped).
- Money: now + later must fit under the spend cap (what is free minus a small cushion), recomputed on the server.
- Coverage: diapers, wipes and formula reach the end of the month; later buys are dated before the day they run out.
- Order: no growth or joy item while a must-have is short.
- No repeat of what was already paid for this month.
- Anything it cannot settle after its passes is shown to her, never dropped.
