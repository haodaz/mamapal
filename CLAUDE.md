# Survive & Thrive (mamaagent)

PayPal AI Hackathon entry. Read `README.md` first for the product and the boundaries.

- Dev server: `npm run dev -- -p 3010` (see `.claude/launch.json`).
- AI brain: `src/lib/agent.ts` (Claude structured output; money fields recomputed server-side, never trust model arithmetic).
- PayPal: `src/lib/paypal.ts` (sandbox REST: Orders v2 create/capture, Payouts v1). Never fake a payment in the UI; every money event carries a real PayPal id.
- State: `src/lib/store.ts` → `data/state.json` (git-ignored). Single user.
- Tone of prompt and UI: cold, factual, no cheerleading, no exclamation marks.
- Submission requirements live in the hackathon page; all user-facing submission material is English, the agent answers in the user's language.
