import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Plan } from "./types";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

// Cross-store price check. Pal is nobody's shop: it looks at the whole web (Walmart, Target, Amazon, Costco, Aldi, dollar stores,
// pharmacies) and reports real offers with links. Boundary: prices are what the search found today; stock and shipping vary.
export const CompareSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().describe("0-based index of the item in the list given"),
      offers: z.array(
        z.object({
          merchant: z.string(),
          price: z.number().describe("USD, the pack as named, before tax"),
          url: z.string().nullable().describe("Direct product URL found by search, or null"),
          note: z.string().nullable().describe("Pack size, store-brand twin, pickup only, etc. Max 12 words."),
        }),
      ).max(4).describe("2–4 real offers, cheapest first"),
    }),
  ),
});

const SYSTEM = `You are a price checker for a mother on a tight budget in the United States.
For each item, search the web and find current prices for the same product or its store-brand equivalent at several stores: Walmart, Target, Amazon, Costco/Sam's, Aldi, Dollar General, CVS/Walgreens, and local options.
Rules: real listings only, with the URL you found; cheapest first; compare the same pack size or note the difference; prefer pickup-friendly stores; never invent a price. If you cannot confirm a price, leave that store out.`;

export async function comparePrices(plan: Plan, zip: string) {
  const client = new Anthropic();
  const items = plan.items.map((it, i) => ({ i, it })).filter(({ it }) => (it.verdict === "buy" || it.verdict === "swap") && it.buy_name);
  if (!items.length) return [];
  const list = items.map(({ i, it }) => `${i}. ${it.buy_name} (current estimate $${it.buy_price} at ${it.merchant ?? "unknown"})`).join("\n");
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 24000,
    system: SYSTEM,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: Math.min(10, items.length * 3) }],
    messages: [{ role: "user", content: `ZIP code: ${zip || "unknown"}\nItems:\n${list}` }],
    output_config: { format: zodOutputFormat(CompareSchema), effort: "medium" },
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("The model declined this request");
  if (msg.stop_reason === "max_tokens") throw new Error("Output cut off");
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const parsed = CompareSchema.parse(JSON.parse(text.slice(Math.max(0, text.indexOf("{")))));
  return parsed.items;
}
