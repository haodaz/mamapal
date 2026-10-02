import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { State } from "./types";
import { derive } from "./types";
import { monthsSince, correctedMonths } from "./age";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

export const PlanSchema = z.object({
  headline: z.string().describe("One blunt sentence: the verdict on this request. Max 14 words."),
  items: z.array(
    z.object({
      requested: z.string().describe("What mom asked for, in her words"),
      requested_price: z.number().describe("Price she mentioned or your realistic US retail estimate, USD"),
      verdict: z.enum(["buy", "swap", "skip", "defer"]),
      reason: z.string().describe("Why, max 20 words, no hedging, no cheerleading"),
      buy_name: z.string().nullable().describe("The exact cheaper thing to buy instead (or the same thing if verdict=buy). null if skip/defer"),
      buy_price: z.number().nullable().describe("USD price of buy_name. null if skip/defer"),
      merchant: z.string().nullable().describe("Where to buy it cheapest (Walmart, dollar store, pharmacy, Amazon). null if skip/defer"),
      priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe("1 = baby health/safety, 2 = real need, 3 = nice-to-have"),
    }),
  ),
  requested_total: z.number().describe("Sum of requested_price"),
  approved_total: z.number().describe("Sum of buy_price for items with verdict buy or swap"),
  intercepted: z.number().describe("requested_total - approved_total"),
  remaining_after: z.number().describe("available budget minus approved_total"),
  note: z.string().describe("One sentence to mom. Factual. Mention remaining budget. Same language she wrote in."),
});

export type PlanOutput = z.infer<typeof PlanSchema>;

const SYSTEM = `You are the financial guardian for a single mother on a hard monthly budget.
Your only job: keep her baby healthy and safe while protecting her cash. You do not sell. You do not comfort. You cut.

Rules:
- Never let approved_total exceed the available budget. If it would, downgrade priority-3 items to "defer", then priority-2 to "swap" with a cheaper option.
- Treat branded, boutique, or social-media-recommended baby products as suspect ("smart tax"). A generic or pharmacy equivalent with the same function wins.
- Priority 1 (health/safety: fever, rash that spreads, feeding, car seat, medication the doctor prescribed) is never skipped. If the ask includes a medical symptom that needs a doctor, say so in the reason and still give the cheapest safe home option.
- Price with realistic US retail numbers (Walmart / dollar store / pharmacy generics). Round to whole dollars unless she gave cents.
- Be concrete: name the actual alternative product category and price, not "something cheaper".
- items must only contain things she asked for or clearly implied. Never add advice-only rows (price 0). Advice goes in the reason or the note.
- Tone: short, calm, factual. No exclamation marks. No "great question". She is tired; every word costs her.
- Product names can stay English.`;

export async function planPurchase(ask: string, state: State, lang: "en" | "zh" = "en"): Promise<PlanOutput> {
  const client = new Anthropic();
  const d = derive(state);
  const recent = state.plans
    .filter((p) => p.status === "paid")
    .slice(-5)
    .map((p) => `- ${p.created_at.slice(0, 10)}: paid $${p.approved_total} (${p.items.filter((i) => i.buy_name).map((i) => i.buy_name).join(", ")})`)
    .join("\n");

  const context = `Month: ${state.month}
Monthly budget: $${state.budget}
Locked for food (untouchable): $${state.food_lock}
Already spent this month: $${d.spent}
Earned back this month: $${d.earned}
AVAILABLE NOW: $${d.available}
Children: ${state.profile.children.map((c) => { const m = monthsSince(c.born); const cm = correctedMonths(c); const age = m < 24 ? `${m} months` : `${Math.floor(m / 12)} years`; const pre = c.gestational_weeks && c.gestational_weeks < 37 ? ` (born at ${c.gestational_weeks} weeks, corrected age ${cm} months — use corrected age for feeding/development advice)` : ""; return `${c.name || "child"} ${age}${pre}`; }).join("; ") || "none listed"}${state.profile.pregnant ? "\nPregnant: yes" : ""}
Daily use: ${state.profile.diapers_per_day} diapers/day${state.profile.formula_ml_per_day ? `, ${state.profile.formula_ml_per_day} ml formula/day` : ", no formula"}
Recent approved purchases:
${recent || "- none yet"}`;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `${context}\nOutput language for headline, reasons and note: ${lang === "zh" ? "Simplified Chinese" : "English"}\n\nMom says:\n"""${ask}"""` }],
    output_config: { format: zodOutputFormat(PlanSchema) },
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined this request");
  const out = response.parsed_output;
  if (!out) throw new Error("Could not parse plan");

  // Recompute money fields server-side; never trust model arithmetic on money.
  const r2 = (n: number) => Math.round(n * 100) / 100;
  out.requested_total = r2(out.items.reduce((s, i) => s + i.requested_price, 0));
  out.approved_total = r2(out.items.filter((i) => (i.verdict === "buy" || i.verdict === "swap") && i.buy_price).reduce((s, i) => s + (i.buy_price ?? 0), 0));
  out.intercepted = r2(out.requested_total - out.approved_total);
  out.remaining_after = r2(d.available - out.approved_total);
  return out;
}
