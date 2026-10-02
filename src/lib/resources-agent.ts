import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Profile } from "./types";
import { monthsSince } from "./age";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

export const ResourceReportSchema = z.object({
  summary: z.string().describe("Two sentences max. The total she can realistically claim per month and the first thing to do tomorrow."),
  items: z.array(
    z.object({
      id: z.string().describe("slug, e.g. wic, snap, medicaid, diaper-bank, head-start, liheap, lifeline, eitc, ctc, 211, buy-nothing, school-meals, tanf, ccap"),
      name: z.string().describe("Program name as the public knows it, with the state/local name if it differs (e.g. 'CalFresh (SNAP in California)')"),
      category: z.enum(["food", "diapers", "health", "cash", "childcare", "utilities", "tax", "community"]),
      scope: z.enum(["federal", "state", "local"]),
      eligibility: z.enum(["likely", "maybe", "unlikely"]).describe("Based on her household size, income, children's ages, pregnancy and location"),
      why: z.string().describe("Plain words, max 30 words: the one rule that decides it for her (e.g. 'Income under $3,152/mo for a family of 2 qualifies for WIC')"),
      value: z.string().describe("What it is worth to her, concrete, e.g. '$50–$100/mo groceries + free formula'"),
      monthly_value_estimate: z.number().describe("USD per month, conservative. 0 if unknown or one-time."),
      steps: z.array(z.string()).max(4).describe("Max 4 steps, each one action, starting with a verb"),
      documents: z.array(z.string()).max(6).describe("What to bring: ID, proof of address, pay stubs, birth certificate…"),
      apply_url: z.string().nullable().describe("Official application or locator URL for her state/area. null if none found."),
      phone: z.string().nullable(),
      verify_note: z.string().nullable().describe("Anything she must double-check locally, or null"),
    }),
  ),
});

export type ResourceReportOutput = z.infer<typeof ResourceReportSchema>;

const SYSTEM = `You help a low-income parent in the United States find every public benefit, charity and community resource she can actually claim, and make applying simple.
You are precise and calm. No cheerleading, no exclamation marks. Short sentences.

Cover, when relevant to her profile: WIC; SNAP (use the state's own name); Medicaid / CHIP for the children and for her; diaper banks (National Diaper Bank Network member nearest her ZIP); Head Start / Early Head Start; state child care assistance (CCDF subsidy); TANF; LIHEAP (heating/cooling); Lifeline phone/internet; free & reduced school meals and Summer EBT for school-age kids; EITC and Child Tax Credit (note VITA free tax help); 211; food pantries; Buy Nothing / Baby2Baby-type free goods; library and pediatric programs (Reach Out and Read). Add state or city programs you find for her location. If a child is preterm or has a medical note, also check Early Intervention (IDEA Part C), SSI for a child with a qualifying condition, and WIC medical formula coverage.

Rules:
- Use web search to confirm the current income limits and the official application URL for HER state. Prefer .gov and official program sites. If you cannot confirm something, say so in verify_note instead of guessing.
- Judge eligibility with real numbers: compare her monthly income against the program's limit for her household size (WIC 185% FPL; SNAP ~130% gross / 200% in broad-based states; Medicaid for kids often up to 200%+; Head Start 100% FPL or public-assistance recipient).
- A program she already has (on_snap, on_medicaid) still appears, marked eligibility "likely", with value and a note that she is enrolled; often it unlocks others (adjunctive eligibility for WIC, Lifeline, school meals).
- Order items by eligibility (likely first) then by monthly value.
- 8 to 12 items. Each must have concrete steps and documents. Keep every string short; this is a phone screen.`;

function profileText(p: Profile) {
  return `ZIP: ${p.zip || "unknown"}
State: ${p.state || "unknown"}
Household size: ${p.household_size}
Monthly income before tax: $${p.monthly_income}
Children: ${p.children.map((c) => { const m = monthsSince(c.born); const age = m < 24 ? `${m} months` : `${Math.floor(m / 12)} years`; return `${age}${c.gestational_weeks && c.gestational_weeks < 37 ? ` (preterm ${c.gestational_weeks}w)` : ""}${c.notes ? ` [${c.notes}]` : ""}`; }).join(", ") || "none listed"}
Pregnant: ${p.pregnant ? "yes" : "no"}
Already on SNAP: ${p.on_snap ? "yes" : "no"}
Already on Medicaid: ${p.on_medicaid ? "yes" : "no"}`;
}

async function structuredCall(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  opts: { tools?: Anthropic.Messages.ToolUnion[]; max_tokens: number },
): Promise<ResourceReportOutput> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: opts.max_tokens,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    tools: opts.tools,
    messages,
    output_config: { format: zodOutputFormat(ResourceReportSchema), effort: "medium" },
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("The model declined this request");
  if (msg.stop_reason === "max_tokens") throw new Error("Output cut off (max_tokens)");
  // With web search on, the final JSON may arrive split across several text blocks (citations). Join them.
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const jsonStart = text.indexOf("{");
  const parsed = JSON.parse(text.slice(jsonStart >= 0 ? jsonStart : 0));
  return ResourceReportSchema.parse(parsed);
}

export async function findResources(profile: Profile, lang: "en" | "zh"): Promise<ResourceReportOutput> {
  const client = new Anthropic();
  const langLine = `Output language for name, why, value, steps, documents, verify_note and summary: ${lang === "zh" ? "Simplified Chinese (keep official program names in English in parentheses)" : "English"}`;
  const user = `${profileText(profile)}\n${langLine}\nToday: ${new Date().toISOString().slice(0, 10)}`;
  const tools: Anthropic.Messages.ToolUnion[] = [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }];

  try {
    return await structuredCall(client, [{ role: "user", content: user }], { tools, max_tokens: 32000 });
  } catch (e) {
    console.warn("[resources] single-call failed, falling back to two-step:", (e as Error).message);
    // Fallback: research with web search in prose, then structure in a second call.
    const research = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      system: SYSTEM,
      tools,
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: `${user}\n\nResearch and write the full findings as notes with URLs. Plain text, no JSON.` }],
    });
    const notes = (await research.finalMessage()).content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return structuredCall(client, [{ role: "user", content: `${user}\n\nStructure these research notes:\n${notes}` }], { max_tokens: 16000 });
  }
}
