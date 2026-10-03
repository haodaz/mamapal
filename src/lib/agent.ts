import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { State } from "./types";
import { derive } from "./types";
import { monthsSince } from "./age";
import { needsSummaryForAgent } from "./stages";
import { supplyStatus } from "./inventory";

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
      supply_type: z.enum(["diapers", "formula", "wipes", "none"]).describe("If buy_name is a consumable we track: diapers, formula or wipes. Else none."),
      supply_qty: z.number().describe("Quantity buy_name adds: diapers = count of diapers in the pack; formula = ml of PREPARED formula the pack makes (a 36 oz / 1.02 kg powder can ≈ 7,500 ml); wipes = sheets. 0 if none."),
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
- If a child has medical notes (preterm, FGR, NICU, allergies), feeding density, weight gain and pediatric follow-up outrank every saving; never trade them for a cheaper option, and say when something should be asked of the pediatrician.
- Priority 1 (health/safety: fever, rash that spreads, feeding, car seat, medication the doctor prescribed) is never skipped. If the ask includes a medical symptom that needs a doctor, say so in the reason and still give the cheapest safe home option.
- Price with realistic US retail numbers (Walmart / dollar store / pharmacy generics). Round to whole dollars unless she gave cents.
- Be concrete: name the actual alternative product category and price, not "something cheaper".
- Maslow order: money goes to tier 1 (diapers, feeding, food, health, care, clothing) first. Tier 2 (play, books, learning) only when tier 1 for the month is covered and the pantry is safe. Tier 3 (outings, classes, treats) only with real slack. Say which tier an item is when you defer it.
- If a consumable she asked for is still well stocked (more than ~2 weeks left), say so and verdict "defer". If something is nearly out, keep it even if she did not ask the amount.
- If she asks a question instead of listing things to buy (how much milk, how to apply for WIC, what can wait), answer it: headline = the one-line answer, note = 2–4 plain sentences with numbers, items = [] . Only produce items when there is something to buy or not buy.
- items must only contain things she asked for or clearly implied. Never add advice-only rows (price 0). Advice goes in the reason or the note.
- Tone: hard on products, warm and plain toward her. Short everyday words a tired person can read on a phone; no jargon, no finance words. Never shame her for wanting something; say what the baby actually needs and why. No exclamation marks, no "great question".
- Product names can stay English.`;

export async function planPurchase(ask: string, state: State, lang: "en" | "zh" = "en", screen?: string): Promise<PlanOutput> {
  const client = new Anthropic();
  const d = derive(state);
  const recent = state.plans
    .filter((p) => p.status === "paid")
    .slice(-5)
    .map((p) => `- ${p.created_at.slice(0, 10)}: paid $${p.approved_total} (${p.items.filter((i) => i.buy_name).map((i) => i.buy_name).join(", ")})`)
    .join("\n");

  const ctx = screen;
  const context = `Month: ${state.month}
Monthly budget: $${state.budget}
Locked for food (untouchable): $${state.food_lock}
Already spent this month: $${d.spent}
Earned back this month: $${d.earned}
AVAILABLE NOW: $${d.available}
Children: ${state.profile.children.map((c) => { const m = monthsSince(c.born); const age = m < 24 ? `${m} months` : `${Math.floor(m / 12)} years`; return `${c.name || "child"} ${age}${c.notes ? ` [${c.notes}]` : ""}`; }).join("; ") || "none listed"}
Expected baseline needs this month (model, store-brand prices; tier 1 = survival, tier 2 = growth & learning, tier 3 = joy & experiences):
${needsSummaryForAgent(state.profile, state.owned ?? [])}
Pantry right now: ${supplyStatus(state).map((x) => `${x.type}: ${x.tracked ? `${x.left} left ≈ ${x.days} days` : "not tracked"}`).join("; ")}${state.profile.pregnant ? "\nPregnant: yes" : ""}
Daily use: ${state.profile.diapers_per_day} diapers/day${state.profile.formula_ml_per_day ? `, ${state.profile.formula_ml_per_day} ml formula/day` : ", no formula"}
Recent approved purchases:
${recent || "- none yet"}`;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `${context}${ctx ? `\nShe is asking from the ${ctx} screen of the app (plan = this month's needs list; budget = money and verdicts; resources = benefits she can claim; me = her records).` : ""}\nOutput language for headline, reasons and note: ${lang === "zh" ? "Simplified Chinese" : "English"}\n\nMom says:\n"""${ask}"""` }],
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
