import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Profile, Resource, ResourceCheck } from "./types";
import { needsOfficial } from "./types";
import { checkQuote, isOfficial, openLink } from "./verify";
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
      source_url: z.string().nullable().describe("The official page (prefer .gov) you read that states the deciding rule in `why`. Must be a page you actually opened in search results. null if none."),
      source_quote: z.string().nullable().describe("The deciding rule or limit copied WORD FOR WORD from source_url, in the page's own language (never translated), max 30 words, e.g. 'a household of 2 with gross monthly income of $3,152 or less'. null if you could not copy one."),
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
- For every program, give source_url (the official page you read) and source_quote (the exact words from that page that carry the rule or the number you used). The app opens the page and checks the quote is there, so copy it exactly; never paraphrase, never translate it, never invent one. If you have no page that says it, set both to null.
- Order items by eligibility (likely first) then by monthly value.
- 8 to 12 items. Each must have concrete steps and documents. Keep every string short; this is a phone screen.`;

function profileText(p: Profile) {
  return `ZIP: ${p.zip || "unknown"}
State: ${p.state || "unknown"}
Household size: ${p.household_size}
Monthly income before tax: $${p.monthly_income}
Children: ${p.children.map((c) => { const m = monthsSince(c.born); const age = m < 24 ? `${m} months` : `${Math.floor(m / 12)} years`; return `${age}${c.notes ? ` [${c.notes}]` : ""}`; }).join(", ") || "none listed"}
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
  const tools: Anthropic.Messages.ToolUnion[] = [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }];

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

// Open every source and application link and record what was really there. No model: this is the check on the model.
// A dead application link is removed (she should never be sent to a 404); a quote that is not on its page is shown as such.
// "official" is judged on the SOURCE page only: a rule read off a blog or a phone company's page is not an official rule.
export async function verifyResources(items: Resource[]): Promise<Resource[]> {
  const at = new Date().toISOString();
  return Promise.all(items.map(async (r) => {
    const [src, apply] = await Promise.all([
      r.source_url && r.source_quote ? checkQuote(r.source_url, r.source_quote) : Promise.resolve(null),
      r.apply_url ? openLink(r.apply_url) : Promise.resolve(null),
    ]);
    const check: ResourceCheck = { source: src ? src.result : "none", apply: apply ?? "none", official: isOfficial(r.source_url), at };
    return { ...r, apply_url: apply === "dead" ? null : r.apply_url, check };
  }));
}

const needsSource = (r: Resource) => !r.check || r.check.source === "none" || r.check.source === "not_found" || (needsOfficial(r) && !r.check.official);

const SourceFixSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    source_url: z.string().nullable().describe("An official page (.gov, .us, or the program's own national site) you opened that states the rule"),
    source_quote: z.string().nullable().describe("The rule or limit copied WORD FOR WORD from that page, max 30 words, never translated"),
  })),
});

// The verifier's send-back: programs whose rule has no official source, or whose quote was not on its page, get one
// more targeted search that may only use official pages. Then they are checked again. At most once per report.
export async function fixSources(items: Resource[], profile: Profile): Promise<{ items: Resource[]; sent: number }> {
  const todo = items.filter(needsSource);
  if (!todo.length) return { items, sent: 0 };
  const client = new Anthropic();
  const list = todo.map((r) => `- id ${r.id}: ${r.name}. Rule we rely on: "${r.why}".${r.source_url ? ` Previous source ${r.source_url} was ${r.check?.official ? "" : "not official and "}${r.check?.source === "not_found" ? "did not contain the quote" : "unusable"}.` : ""}`).join("\n");
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system: "You find official sources for US benefit rules. Only government pages (.gov, .us) or a program's own national site count; never blogs, news, insurers, phone companies or aggregators. For each program, open the official page that states the rule and copy the deciding words exactly as written on the page. If you cannot find an official page that says it, return null for both fields. Never paraphrase or invent a quote.",
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: Math.min(10, todo.length * 2) }],
    messages: [{ role: "user", content: `Location: ${profile.state || "unknown state"} ${profile.zip}. Household of ${profile.household_size}, $${profile.monthly_income}/month.\nPrograms:\n${list}` }],
    output_config: { format: zodOutputFormat(SourceFixSchema), effort: "low" },
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason !== "end_turn") return { items, sent: todo.length };
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const fixes = new Map(SourceFixSchema.parse(JSON.parse(text.slice(Math.max(0, text.indexOf("{"))))).items.map((f) => [f.id, f]));
  const patched = items.map((r) => {
    const f = fixes.get(r.id);
    return f && f.source_url && f.source_quote && isOfficial(f.source_url) ? { ...r, source_url: f.source_url, source_quote: f.source_quote } : r;
  });
  const changed = patched.filter((r, i) => r !== items[i]);
  const rechecked = new Map((await verifyResources(changed)).map((r) => [r.id, r]));
  return { items: patched.map((r) => rechecked.get(r.id) ?? r), sent: todo.length };
}
