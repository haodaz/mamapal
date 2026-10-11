# Evidence: month runs

Real runs of the month-run agent (`src/lib/month-run.ts`) against the demo household, saved step by step.
Names are replaced with "the baby"; nothing else is edited. Each file has every step's summary, time, tokens,
searches and cost, the offers with the link check the verifier did, and what was left for the mother to look at.

| Run | Steps | Time | AI cost | What happened |
|---|---|---|---|---|
| [1](2026-10-11-month-run-1.json) | 5 | 136 s | $0.78 | Passed the first checker, but reading the output showed three defects the checker missed (below). |
| [2](2026-10-11-month-run-2.json) | 9 | 223 s | $1.95 | New checker caught pack-size mismatches; prose stated no money; but it searched three times for fresh produce that has no online listing, and the price step alone cost $1.38. |
| [3](2026-10-11-month-run-3.json) | 7 | 173 s | $1.02 | Cheaper first price pass left 7 items unpriced; the checker sent only those back for one more search; then all passed, 20 links opened, 8 prices seen on the store page, nothing left for her to check. |

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

## What the checker verifies (no model involved)

- Every link is opened: `ok` (the page shows that price), `opens`, `blocked` (the store refuses robots), `dead` (dropped).
- Money: now + later must fit under the spend cap (what is free minus a small cushion), recomputed on the server.
- Coverage: diapers, wipes and formula reach the end of the month; later buys are dated before the day they run out.
- Order: no growth or joy item while a must-have is short.
- No repeat of what was already paid for this month.
- Anything it cannot settle after its passes is shown to her, never dropped.
