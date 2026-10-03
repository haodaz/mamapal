import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Child, Profile, State } from "./types";
import { childNeeds, type Need } from "./stages";
import { monthsSince } from "./age";
import { supplyStatus } from "./inventory";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";
const VOICE = `You are Pal, a warm, plain-spoken guardian for a mother on a tight budget. Short sentences a tired person can read on a phone. No exclamation marks, no jargon, never shame her. You give concepts that protect her from marketing: what actually matters at this age, what does not, what is a trap. Not medical advice; say when to ask the pediatrician.`;

// --- Pal's notes for the month: focus, one line per tier, next month
export const NotesSchema = z.object({
  focus: z.array(z.string()).min(2).max(4).describe("2–4 concrete things this month is about for this child, each max 8 words, like a chip"),
  tier_notes: z.object({
    1: z.string().describe("ONE sentence, max 18 words, about the must-haves this month (a size or amount to expect)."),
    2: z.string().describe("ONE sentence, max 18 words: what to offer for growth, what not to buy."),
    3: z.string().describe("ONE sentence, max 14 words, about joy & outings with a free option."),
  }),
  next: z.string().describe("ONE sentence, max 20 words: what to prepare for next month."),
});

function childText(c: Child, p: Profile, state: State, lang: "en" | "zh") {
  const m = monthsSince(c.born);
  const { stage, tiers } = childNeeds(c, p, state.owned ?? []);
  return `Child: ${c.name || "baby"}, ${m} months (${stage.label.en})${c.notes ? `, notes: ${c.notes}` : ""}
Daily use: ${p.diapers_per_day} diapers/day, ${p.formula_ml_per_day || 0} ml formula/day
Pantry: ${supplyStatus(state).map((x) => `${x.type}: ${x.tracked ? `${x.days} days left` : "not tracked"}`).join("; ")}
Budget: $${state.budget}/mo, $${state.food_lock} locked for food
Needs model this month: ${tiers.map((t) => `tier ${t.tier} $${t.total}/mo: ${t.needs.filter((n) => n.kind !== "one_time").map((n) => n.label.en).join(", ")}${t.oneTime ? ` + one-time $${t.oneTime}` : ""}`).join(" | ")}
Output language: ${lang === "zh" ? "Simplified Chinese" : "English"}`;
}

export async function writeMonthNotes(c: Child, state: State, lang: "en" | "zh") {
  const client = new Anthropic();
  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 3000,
    system: VOICE,
    messages: [{ role: "user", content: `${childText(c, state.profile, state, lang)}\n\nWrite Pal's notes for this month.` }],
    output_config: { format: zodOutputFormat(NotesSchema), effort: "medium" },
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("Could not write notes");
  return res.parsed_output;
}

// --- A short guide for one item: concepts that keep her out of traps
export const GuideSchema = z.object({
  title: z.string().describe("The item, named plainly, max 8 words"),
  what: z.string().describe("What it is and why this age needs it, 2–3 sentences"),
  which_one: z.string().describe("Which type/size/model is right at this age, concretely (e.g. diaper size by weight, formula type, TOG rating). 2–3 sentences"),
  how_much: z.string().describe("How much per day/week/month, with numbers. 1–2 sentences"),
  traps: z.array(z.string()).min(2).max(4).describe("Marketing traps and common mistakes, each one sentence"),
  safety: z.string().describe("The one safety rule that matters, or when to ask the pediatrician. 1–2 sentences"),
  cheap: z.string().describe("The cheaper way that is just as good (store brand, WIC, library, free programs). 1–2 sentences"),
});

export async function writeGuide(c: Child, need: Need, state: State, lang: "en" | "zh") {
  const client = new Anthropic();
  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 3000,
    system: VOICE,
    messages: [{ role: "user", content: `${childText(c, state.profile, state, lang)}\n\nItem: ${need.label.en} (category ${need.category}, tier ${need.tier}, ${need.kind}, typical store-brand cost $${need.cost}${need.kind === "monthly" ? "/mo" : ""}; cheaper way: ${need.cheap?.en ?? ""})\nExplain this item for this child, concepts first, traps included.` }],
    output_config: { format: zodOutputFormat(GuideSchema), effort: "medium" },
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("Could not write guide");
  return res.parsed_output;
}

// --- Market: brands and prices, retrieved from the web and cached with a timestamp
export const MarketSchema = z.object({
  brands: z.array(z.object({
    brand: z.string(), product: z.string().describe("specific product + size/count"), price: z.number().describe("USD, current, for that pack"),
    where: z.string().describe("store or site"), url: z.string().nullable(), note: z.string().nullable().describe("per-unit price, store brand, pickup, max 12 words"),
  })).min(3).max(6).describe("3–6 real current options, cheapest sensible first, store brands included"),
  cheapest: z.string().describe("One sentence: the cheapest option that is still right for this child, with its per-unit price"),
});

export async function lookupMarket(c: Child, need: Need, state: State, lang: "en" | "zh") {
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: MODEL, max_tokens: 20000,
    system: VOICE + " You are now checking real prices. Search the web and report only listings you found, with URLs. Prefer Walmart, Target, Amazon, Costco, Aldi, dollar stores, pharmacies; include at least one store brand.",
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
    messages: [{ role: "user", content: `${childText(c, state.profile, state, lang)}\nZIP: ${state.profile.zip || "unknown"}\n\nItem: ${need.label.en} (${need.kind}, typical store-brand $${need.cost}).\nFind current brands and prices for this item for this child.` }],
    output_config: { format: zodOutputFormat(MarketSchema), effort: "medium" },
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("The model declined this request");
  if (msg.stop_reason === "max_tokens") throw new Error("Output cut off");
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return MarketSchema.parse(JSON.parse(text.slice(Math.max(0, text.indexOf("{")))));
}
