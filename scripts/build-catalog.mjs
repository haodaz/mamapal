// Build the baby + mom item catalog with Claude, one call per stage, into src/lib/catalog.json.
// Run: node --env-file=.env.local scripts/build-catalog.mjs
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();
const STAGES = [
  ["preg", -9, -1, "pregnancy, all trimesters: prenatal care and vitamins, maternity clothes, comfort and health items, the hospital bag, and the newborn setup bought before birth (car seat, bassinet, first diapers, etc.)"],
  ["0-2", 0, 2, "newborn (0–2 months), including the mother's postpartum and breastfeeding needs"],
  ["3-5", 3, 5, "3–5 months"], ["6-8", 6, 8, "6–8 months (starting solids)"], ["9-11", 9, 11, "9–11 months (crawling, finger foods)"],
  ["12-17", 12, 17, "12–17 months (walking, whole milk)"], ["18-23", 18, 23, "18–23 months"], ["24-35", 24, 35, "2 years (potty training)"],
  ["36-59", 36, 59, "3–4 years (preschool)"], ["60+", 60, 999, "5+ years (school age)"],
];
const Item = z.object({
  id: z.string().describe("slug, stable across stages for the same thing, e.g. diapers, wipes, breast-pump, nipple-cream, car-seat-infant"),
  label_en: z.string(), label_zh: z.string(),
  category: z.enum(["diapers", "feeding", "solids", "feeding_gear", "clothing", "sleep", "bath_care", "health", "safety", "gear", "play", "books", "mom", "outings"]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe("1 must-have (survival/health/safety), 2 growth & learning, 3 joy & convenience"),
  kind: z.enum(["monthly", "one_time", "occasional"]).describe("monthly = consumed every month; one_time = buy once for this stage; occasional = a few times a year"),
  cost: z.number().describe("USD, conservative US store-brand/second-hand-friendly price: per month for monthly, per purchase otherwise"),
  qty_en: z.string().describe("how much / how many, short"), qty_zh: z.string(),
  cheap_en: z.string().describe("the cheaper way that is just as good: store brand, WIC, Buy Nothing, library, thrift, free programs"), cheap_zh: z.string(),
  only: z.enum(["any", "breastfeeding", "formula"]).describe("whether it only applies to breastfeeding or formula families"),
  essential: z.boolean().describe("true if skipping it risks health or safety"),
});
const Out = z.object({ items: z.array(Item).min(14) });
const SYSTEM = `You are building a complete, practical catalog of what a baby AND the mother need, for a US family on a very tight budget. Think like an experienced pediatric nurse plus a frugal mother: enumerate everything that is normally needed at this stage, including mom items (nipple cream, nursing bras, breast pump and parts, milk storage bags, postpartum pads, peri bottle, prenatal/postnatal vitamins, nursing pillow), gear (car seat, stroller, carrier, crib/bassinet, high chair), sleep (sleep sacks, swaddles, white noise), bath and care, health (thermometer, nasal aspirator, vitamin D, acetaminophen), safety (outlet covers, gates, anchors), clothing by size, play and books by developmental need, and outings. Prices: realistic store-brand or second-hand; never premium. Be concrete about sizes and quantities. Chinese labels in Simplified Chinese, natural and short.`;

const all = [];
for (const [key, from, to, desc] of STAGES) {
  process.stdout.write(`${key} … `);
  const stream = client.messages.stream({
    model: "claude-opus-5", max_tokens: 24000, system: SYSTEM,
    messages: [{ role: "user", content: `Stage: ${desc} (months ${from}–${to === 999 ? "60+" : to}). List every item this stage normally needs (as many as truly apply). Include mom items where relevant to the stage (pregnancy; postpartum/breastfeeding mostly 0–11 months). Do not list items that only belong to other stages.` }],
    output_config: { format: zodOutputFormat(Out), effort: "medium" },
  });
  const msg = await stream.finalMessage();
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const parsed = Out.parse(JSON.parse(text.slice(Math.max(0, text.indexOf("{")))));
  const items = parsed.items.map((it) => ({ ...it, stage: key, from, to }));
  console.log(items.length);
  all.push(...items);
}
fs.writeFileSync("src/lib/catalog.json", JSON.stringify(all, null, 2));
console.log("total", all.length);
