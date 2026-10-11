import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { State, MonthRun, RunStep, RunItem, RunIssue, Plan, PlanItem, LinkCheck, Offer, SupplyType } from "./types";
import { derive, round } from "./types";
import { childNeeds } from "./stages";
import { supplyStatus } from "./inventory";
import { monthsSince } from "./age";
import { findOffers } from "./compare-agent";
import { newId } from "./store";
import { openLink } from "./verify";

// Month run: Pal is handed one goal ("keep the baby covered until the month ends on what is left") and works it
// in steps: take stock → plan → find real prices → verify → hand her one cart. Each step is saved as soon as it
// finishes, so a crash or a timeout resumes at the next step instead of starting over. The verifier can send the
// plan back (at most MAX_REVISIONS times). Pal never pays: the cart ends at her PayPal button.

const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";
const MAX_REVISIONS = 2;
const DAY = 86_400_000;

// USD per million tokens, for the cost line on each step. Cache reads/writes are priced from the input rate.
const PRICE: Record<string, [number, number]> = { "claude-opus-5": [5, 25], "claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10], "claude-haiku-4-5": [1, 5] };
type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null; server_tool_use?: { web_search_requests?: number } | null };
function cost(u: Usage | null | undefined) {
  if (!u) return { input: 0, output: 0, searches: 0, cost: 0 };
  const [pin, pout] = PRICE[MODEL] ?? [5, 25];
  const read = u.cache_read_input_tokens ?? 0, write = u.cache_creation_input_tokens ?? 0;
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  const usd = ((u.input_tokens + read * 0.1 + write * 1.25) * pin + u.output_tokens * pout) / 1e6 + searches * 0.01; // web search $10 / 1,000
  return { input: u.input_tokens + read + write, output: u.output_tokens, searches, cost: Math.round(usd * 1000) / 1000 };
}

const zh = (run: MonthRun) => run.lang === "zh";
const money = (n: number) => `$${n.toFixed(0)}`;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function newRun(state: State, lang: "en" | "zh"): MonthRun {
  const kid = state.profile.children[0]?.name || (lang === "zh" ? "宝宝" : "the baby");
  const goal = lang === "zh" ? `用剩下的钱，让${kid}这个月什么都不缺` : `Keep ${kid} covered until the month ends, on what is left`;
  const keys: RunStep["key"][] = ["stock", "plan", "prices", "verify", "cart"];
  return { id: newId("run"), created_at: new Date().toISOString(), lang, goal, status: "running", steps: keys.map((key) => ({ key, attempt: 0, status: "pending" })) };
}

// ---------- step 1: take stock (no model; numbers only) ----------
function takeStock(state: State, run: MonthRun) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59);
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY));
  const d = derive(state);
  const available = d.available;
  const spendCap = round(Math.max(0, available - Math.min(25, available * 0.1))); // keep a small cushion for surprises
  const supplies = supplyStatus(state, now).filter((s) => s.rate > 0).map((s) => {
    const need = Math.max(0, Math.round(s.rate * daysLeft - (s.tracked ? s.left : 0)));
    return { type: s.type, rate: s.rate, left: s.left, days: s.tracked ? s.days : null, tracked: s.tracked, need, runout: s.tracked && s.runout ? ymd(s.runout) : null };
  });
  // Must-haves from the catalog beyond the three tracked consumables (those are counted above, not by price).
  const tracked = new Set(["diapers", "wipes"]);
  const musts: { need: string; cost: number }[] = [];
  for (const c of state.profile.children) {
    for (const n of childNeeds(c, state.profile, state.owned ?? []).needs) {
      if (n.tier !== 1 || n.kind === "one_time" || n.monthly <= 0) continue;
      if (tracked.has(n.category) || (n.category === "feeding" && /formula/i.test(n.label.en) && state.profile.formula_ml_per_day > 0)) continue;
      musts.push({ need: `${n.label.en}${state.profile.children.length > 1 ? ` (${c.name || "child"})` : ""}`, cost: n.monthly });
    }
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const bought = state.plans.filter((p) => p.status === "paid" && new Date(p.created_at).getTime() >= monthStart)
    .flatMap((p) => p.items.filter((i) => i.buy_name && (i.verdict === "buy" || i.verdict === "swap")).map((i) => i.buy_name!));
  const benefits = (state.resources?.items ?? []).filter((r) => r.eligibility !== "unlikely" && ["food", "diapers", "health"].includes(r.category))
    .map((r) => `${r.name} (${r.category}, ${r.eligibility}): ${r.value}`);

  const unit = (t: SupplyType) => (t === "formula" ? "ml" : t === "diapers" ? (zh(run) ? "片" : "diapers") : (zh(run) ? "张" : "wipes"));
  const name = (t: SupplyType) => (zh(run) ? { diapers: "尿布", formula: "奶粉", wipes: "湿巾" }[t] : t);
  const lines = supplies.map((s) => s.tracked
    ? (zh(run) ? `${name(s.type)}还剩 ${s.left} ${unit(s.type)}，约 ${s.days} 天；到月底还差 ${s.need} ${unit(s.type)}` : `${name(s.type)}: ${s.left} ${unit(s.type)} left, about ${s.days} days; ${s.need} ${unit(s.type)} short of month end`)
    : (zh(run) ? `${name(s.type)}没记过数，按整月 ${s.need} ${unit(s.type)} 算` : `${name(s.type)} not tracked, counting the whole month: ${s.need} ${unit(s.type)}`));
  run.stock = { available, spend_cap: spendCap, days_left: daysLeft, month_end: ymd(end), lines, supplies, musts, bought, benefits };
  const short = supplies.filter((s) => s.need > 0).length;
  return zh(run)
    ? `能花 ${money(available)}（留 ${money(available - spendCap)} 备用），还有 ${daysLeft} 天；${short} 样消耗品撑不到月底，另有 ${musts.length} 样必需品要算进来。`
    : `${money(available)} free (keeping ${money(available - spendCap)} aside), ${daysLeft} days left; ${short === 1 ? "1 consumable won't" : `${short} consumables won't`} last the month, ${musts.length} other must-haves to cover.`;
}

// ---------- step 2: plan (model) ----------
const DraftSchema = z.object({
  headline: z.string().describe("One plain sentence to her: what this month's cart does. Max 16 words."),
  note: z.string().describe("2–3 short sentences: what is in the cart, what waits and when, what to claim first. No dollar amounts."),
  items: z.array(z.object({
    need: z.string().describe("Which need this covers, in the words of the stock list"),
    name: z.string().describe("Exact store-brand / generic product with size, e.g. 'Parent's Choice diapers size 3, 124 ct'"),
    pack: z.string().describe("Pack size in words, e.g. '124 diapers'"),
    packs: z.number().int().min(1).describe("How many packs"),
    unit_price: z.number().describe("Realistic US price of ONE pack, USD"),
    supply_type: z.enum(["diapers", "formula", "wipes", "none"]),
    per_pack: z.number().describe("Units ONE pack adds: diapers = count; formula = ml of PREPARED formula (a 36 oz / 1.02 kg can ≈ 7,500 ml); wipes = sheets; 0 if none"),
    merchant: z.string().nullable(),
    when: z.enum(["now", "later"]).describe("now = goes in today's cart; later = buy closer to when it runs out"),
    buy_by: z.string().nullable().describe("YYYY-MM-DD for later items: the last safe day to buy (before it runs out). null for now items"),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    why: z.string().describe("Max 14 words, plain"),
    benefit: z.string().nullable().describe("If a benefit she likely qualifies for can cover this (WIC formula, diaper bank), name it; else null"),
  })),
  skipped: z.array(z.object({ need: z.string(), why: z.string().describe("Max 12 words") })).describe("Needs you chose not to buy this month and why"),
});

const PLAN_SYSTEM = `You are Pal, the monthly planner for a mother on a hard budget. You get the month's stock-take and write ONE plan that keeps her child covered until the month ends.
Rules:
- Spend cap is hard: the "now" items must cost no more than the spend cap; now + later together must stay within it too. Leave the cushion alone.
- Cover every consumable that runs short (diapers, wipes, formula) for the days left, in whole packs, store brand, largest pack that is cheaper per unit. Count units: packs × per_pack must reach the shortfall.
- Buy now only what runs out within ~10 days or is cheaper bought now; schedule the rest as "later" with a buy_by date a few days before it runs out. Later dates must be before the month ends.
- Maslow order: tier 1 must-haves first. Tier 2 (growth) or tier 3 (joy) only if tier 1 is fully covered and money is left; free options first (library, Buy Nothing).
- Do not re-buy what she already bought this month.
- If a benefit can cover it (WIC covers formula, diaper banks give diapers), say so in benefit; still buy a bridge amount if it runs out before she could collect.
- Medical notes on a child outrank savings: never swap a prescribed or special formula for a cheaper one.
- Realistic US prices (Walmart, Target, Aldi, dollar stores, pharmacies). Product names can stay English.
- Never write dollar amounts in headline or note: the app computes and shows the totals. Say what and when, not how much.
- Tone: warm and plain to her, hard on products. Short words, no jargon, no exclamation marks.`;

async function draftPlan(state: State, run: MonthRun, feedback: string[]) {
  const s = run.stock!;
  const kids = state.profile.children.map((c) => `${c.name || "child"}, ${monthsSince(c.born)} months${c.notes ? ` [notes: ${c.notes}]` : ""}`).join("; ");
  const ctx = `Today: ${ymd(new Date())}. Month ends ${s.month_end} (${s.days_left} days left).
Money free now: $${s.available}. Spend cap (now + later): $${s.spend_cap}.
Children: ${kids || "none"}.
Daily use: ${state.profile.diapers_per_day} diapers/day${state.profile.formula_ml_per_day ? `, ${state.profile.formula_ml_per_day} ml formula/day` : ", no formula"}.
Consumables:
${s.supplies.map((x) => `- ${x.type}: ${x.tracked ? `${x.left} left, runs out ${x.runout}` : "not tracked (assume none at home)"}; shortfall to month end ${x.need} units`).join("\n") || "- none"}
Other tier-1 must-haves this stage (monthly model cost): ${s.musts.map((m) => `${m.need} $${m.cost}`).join(", ") || "none"}
Already bought this month: ${s.bought.join(", ") || "nothing"}
Benefits she likely qualifies for: ${s.benefits.join(" | ") || "unknown (she has not run the benefits finder)"}`;
  const fb = feedback.length ? `\n\nYour previous plan was checked and sent back. Fix every point:\n${feedback.map((f) => `- ${f}`).join("\n")}` : "";
  const client = new Anthropic();
  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: [{ type: "text", text: PLAN_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `${ctx}${fb}\n\nWrite headline, note, reasons in ${run.lang === "zh" ? "Simplified Chinese" : "English"}.` }],
    output_config: { format: zodOutputFormat(DraftSchema), effort: "medium" },
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined this request");
  if (!res.parsed_output) throw new Error("Could not parse the plan");
  const out = res.parsed_output;
  // Keep offers already found for items that survived a revision unchanged.
  const prev = new Map((run.draft?.items ?? []).map((i) => [i.name, i.offers]));
  run.draft = { ...out, items: out.items.map((i) => ({ ...i, offers: prev.get(i.name) })) };
  const now = run.draft.items.filter((i) => i.when === "now");
  const later = run.draft.items.filter((i) => i.when === "later");
  const nowTotal = round(now.reduce((t, i) => t + i.unit_price * i.packs, 0));
  return {
    usage: res.usage,
    summary: zh(run)
      ? `${feedback.length ? "按检查意见改了一版：" : ""}现在买 ${now.length} 样约 ${money(nowTotal)}，${later.length} 样排到后面买，${out.skipped.length} 样这个月先不买。`
      : `${feedback.length ? "Revised after the check: " : ""}${now.length} things now for about ${money(nowTotal)}, ${later.length} scheduled for later, ${out.skipped.length} left for another month.`,
  };
}

// ---------- step 3: real prices (model + web search) ----------
async function priceItems(state: State, run: MonthRun) {
  const todo = run.draft!.items.map((it, index) => ({ it, index })).filter(({ it }) => it.when === "now" && !it.offers?.length);
  if (!todo.length) return { usage: null, summary: zh(run) ? "价格上一轮已经查过。" : "Prices were already found on the last pass." };
  const { items, usage } = await findOffers(todo.map(({ it, index }) => ({ index, name: it.name, estimate: it.unit_price, merchant: it.merchant })), state.profile.zip);
  for (const r of items) { const it = run.draft!.items[r.index]; if (it) it.offers = r.offers; }
  const n = items.reduce((t, r) => t + r.offers.length, 0);
  const missing = todo.filter(({ it }) => !it.offers?.length).length;
  return { usage, summary: zh(run)
    ? `查了 ${todo.length} 样，找到 ${n} 个真实报价，都带链接${missing ? `；${missing} 样没找到` : ""}。`
    : `Searched ${todo.length} items, found ${n} real offers with links${missing ? `; ${missing} items had none` : ""}.` };
}

// ---------- step 4: verify (no model; it checks the model's work) ----------
async function verifyDraft(run: MonthRun) {
  const s = run.stock!, items = run.draft!.items;
  const issues: RunIssue[] = [];
  const links: Record<LinkCheck, number> = { ok: 0, opens: 0, blocked: 0, dead: 0 };
  // 1. Every link the price step brought back is opened; dead ones are dropped.
  await Promise.all(items.flatMap((it) => (it.offers ?? []).map(async (o) => { o.check = o.url ? await openLink(o.url, o.price) : "blocked"; links[o.check]++; })));
  // Which price wins: a price seen on the store page beats one a store merely lists, which beats the model's guess.
  // A "best" offer far off the estimate is usually a different pack size (an 80-ct wipes pack priced against a 720-ct
  // estimate), so it is not taken as a deal; she is asked to look instead.
  const fair = (o: Offer, est: number, lo: number, hi: number) => o.price >= est * lo && o.price <= est * hi;
  for (const it of items) {
    if (!it.offers) continue;
    it.offers = it.offers.filter((o) => o.check !== "dead").sort((a, b) => a.price - b.price);
    const est = it.unit_price;
    const seen = it.offers.find((o) => o.check === "ok" && fair(o, est, 0.4, 3));
    const listed = it.offers.find((o) => fair(o, est, 0.6, 1.5));
    const pick = seen ?? listed;
    for (const o of it.offers) o.picked = false;
    if (pick) { it.unit_price = round(pick.price); it.merchant = pick.merchant; pick.picked = true; }
    else if (it.offers.length) {
      // No store price is close: budget with the higher of the two so the cart never comes out short.
      const low = it.offers[0];
      if (low.price > est) { it.unit_price = round(low.price); it.merchant = low.merchant; low.picked = true; }
      if (it.when === "now") issues.push({ check: "pack", problem: `${it.name}: stores list $${it.offers.map((o) => o.price.toFixed(2)).join(", $")} against a $${est.toFixed(2)} estimate (a different pack, or the estimate is off). Budgeted at $${it.unit_price.toFixed(2)}; check the pack before you pay.`, fix_by: "mom" });
    }
  }
  // 2. Money, recomputed here, never taken from the model.
  const nowTotal = round(items.filter((i) => i.when === "now").reduce((t, i) => t + i.unit_price * i.packs, 0));
  const allTotal = round(items.reduce((t, i) => t + i.unit_price * i.packs, 0));
  if (allTotal > s.spend_cap) issues.push({ check: "money", problem: `now + later costs $${allTotal}, over the $${s.spend_cap} cap by $${round(allTotal - s.spend_cap)}. Cut tier 3, then tier 2, then smaller packs.`, fix_by: "planner" });
  // 2b. The model's prose may not state money: its arithmetic is not trusted, the card shows the computed totals.
  if (/\$\s?\d/.test(`${run.draft!.headline} ${run.draft!.note}`)) issues.push({ check: "money", problem: `headline or note states dollar amounts ("${(run.draft!.note.match(/[^.]*\$\s?\d[^.]*/) ?? run.draft!.headline.match(/[^.]*\$\s?\d[^.]*/) ?? [""])[0].trim()}"). Remove every dollar figure; the app shows the computed totals (cart $${nowTotal}, left after $${round(s.available - nowTotal)}).`, fix_by: "planner" });
  // 3. Every consumable reaches month end, and later buys land before it runs out.
  for (const sup of s.supplies) {
    if (sup.need <= 0) continue;
    const mine = items.filter((i) => i.supply_type === sup.type);
    const units = mine.reduce((t, i) => t + i.per_pack * i.packs, 0);
    if (units < sup.need * 0.9) issues.push({ check: "coverage", problem: `${sup.type}: plan adds ${units} units, needs ${sup.need} to reach ${s.month_end}.`, fix_by: "planner" });
    if (sup.runout) for (const i of mine) if (i.when === "later" && i.buy_by && i.buy_by > sup.runout) issues.push({ check: "timing", problem: `${i.name}: buy_by ${i.buy_by} is after ${sup.type} runs out on ${sup.runout}. Move it earlier or buy now.`, fix_by: "planner" });
  }
  for (const i of items) if (i.when === "later" && i.buy_by && i.buy_by > s.month_end) issues.push({ check: "timing", problem: `${i.name}: buy_by ${i.buy_by} is after the month ends (${s.month_end}).`, fix_by: "planner" });
  // 4. Maslow: no growth or joy items while a must-have is short.
  const shortMust = issues.some((x) => x.check === "coverage");
  for (const i of items) if (i.tier > 1 && shortMust) issues.push({ check: "order", problem: `${i.name} is tier ${i.tier} while a must-have is still short. Drop it until tier 1 is covered.`, fix_by: "planner" });
  // 5. No repeats of what she already paid for this month.
  const bought = s.bought.map((b) => b.toLowerCase());
  for (const i of items) if (bought.some((b) => b === i.name.toLowerCase())) issues.push({ check: "repeat", problem: `${i.name} was already bought this month.`, fix_by: "planner" });
  // 6. What only she can check.
  for (const i of items.filter((x) => x.when === "now")) {
    if (!i.offers?.length) issues.push({ check: "price", problem: `${i.name}: no store offer found yet.`, fix_by: "prices" });
    else if (!issues.some((x) => x.check === "pack" && x.problem.startsWith(i.name)) && !i.offers.some((o) => o.check === "ok" || o.check === "opens")) issues.push({ check: "price", problem: `${i.name}: the stores block robots, so no page confirmed the price. Check it before you pay.`, fix_by: "mom" });
  }

  run.issues = issues;
  run.links = links;
  const planner = issues.filter((x) => x.fix_by === "planner");
  const reprice = issues.filter((x) => x.fix_by === "prices");
  const total = links.ok + links.opens + links.blocked + links.dead;
  const linkLine = zh(run)
    ? `打开了 ${total} 个链接：${links.ok} 个页面上看到了这个价，${links.opens + links.blocked} 个能开或店家挡机器人，${links.dead} 个失效已去掉`
    : `opened ${total} links: ${links.ok} showed the price, ${links.opens + links.blocked} open or block robots, ${links.dead} dead and dropped`;
  return {
    planner, reprice,
    summary: zh(run)
      ? `${linkLine}；钱、够不够用到月底、先后顺序都核过，${planner.length ? `有 ${planner.length} 处要改，退回重做` : reprice.length ? `${reprice.length} 样还没价格，再查一次` : "都过了"}。`
      : `${linkLine}; money, coverage to month end and order checked: ${planner.length ? `${planner.length} problems, sent back` : reprice.length ? `${reprice.length} items still unpriced, searching again` : "all passed"}.`,
  };
}

// ---------- step 5: hand her one cart (a normal Plan, so the PayPal button works as everywhere else) ----------
function buildCart(state: State, run: MonthRun): Plan {
  const d = derive(state);
  const items: PlanItem[] = run.draft!.items.filter((i) => i.when === "now").map((i: RunItem) => {
    const est = round(i.unit_price * i.packs);
    return {
      requested: i.need, requested_price: est, verdict: "buy", reason: i.why + (i.benefit ? ` · ${i.benefit}` : ""),
      buy_name: i.packs > 1 ? `${i.name} × ${i.packs}` : i.name, buy_price: est, merchant: i.merchant, priority: i.tier,
      supply_type: i.supply_type, supply_qty: i.per_pack * i.packs,
      offers: i.offers?.map((o: Offer) => ({ ...o, price: round(o.price) })),
    };
  });
  const approved = round(items.reduce((t, i) => t + (i.buy_price ?? 0), 0));
  const listed = round(run.draft!.items.filter((i) => i.when === "now").reduce((t, i) => t + i.unit_price * i.packs, 0));
  return {
    id: newId("plan"), created_at: new Date().toISOString(), ask: run.goal, headline: run.draft!.headline, items,
    requested_total: listed, approved_total: approved, intercepted: 0, remaining_after: round(d.available - approved),
    note: run.draft!.note, status: "proposed", run_id: run.id,
    later: run.draft!.items.filter((i) => i.when === "later").map((i) => ({ name: i.packs > 1 ? `${i.name} × ${i.packs}` : i.name, pack: i.pack, price: round(i.unit_price * i.packs), buy_by: i.buy_by, merchant: i.merchant, why: i.why })),
    checks: { links: run.links ?? { ok: 0, opens: 0, blocked: 0, dead: 0 }, issues: (run.issues ?? []).map((x) => x.problem), revisions: Math.max(0, ...run.steps.map((x) => x.attempt)) },
  };
}

// ---------- driver: run the next pending step, save, return ----------
export async function advance(state: State, run: MonthRun): Promise<MonthRun> {
  const step = run.steps.find((x) => x.status === "pending" || x.status === "running");
  if (!step) { run.status = "done"; return run; }
  const t0 = Date.now();
  step.status = "running";
  try {
    let usage: Usage | null = null;
    if (step.key === "stock") step.summary = takeStock(state, run);
    else if (step.key === "plan") {
      const fb = step.attempt > 0 ? (run.issues ?? []).filter((x) => x.fix_by === "planner").map((x) => x.problem) : [];
      const r = await draftPlan(state, run, fb); usage = r.usage; step.summary = r.summary;
    } else if (step.key === "prices") {
      const r = await priceItems(state, run); usage = r.usage as Usage | null; step.summary = r.summary;
    } else if (step.key === "verify") {
      const r = await verifyDraft(run); step.summary = r.summary;
      step.notes = [...r.planner, ...r.reprice].map((x) => x.problem);
      const at = run.steps.indexOf(step) + 1, a = step.attempt + 1;
      if (r.planner.length && step.attempt < MAX_REVISIONS) {
        run.steps.splice(at, 0, { key: "plan", attempt: a, status: "pending" }, { key: "prices", attempt: a, status: "pending" }, { key: "verify", attempt: a, status: "pending" });
      } else if (r.reprice.length && !run.steps.some((x) => x.key === "prices" && x.attempt > 0)) { // one more search, not a loop: fresh produce has no listing
        run.steps.splice(at, 0, { key: "prices", attempt: a, status: "pending" }, { key: "verify", attempt: a, status: "pending" });
      } else {
        // out of revisions: whatever is left goes to her as "look at this", never silently dropped
        for (const x of run.issues ?? []) x.fix_by = "mom";
      }
    } else if (step.key === "cart") {
      const plan = buildCart(state, run);
      state.plans.push(plan);
      run.plan_id = plan.id;
      const left = (run.issues ?? []).length;
      step.summary = zh(run)
        ? `购物车好了：${plan.items.length} 样共 ${money(plan.approved_total)}，付完还剩 ${money(plan.remaining_after)}${plan.later?.length ? `；${plan.later.length} 样到时候提醒你买` : ""}${left ? `；还有 ${left} 处请你自己看一眼` : ""}。钱由你在 PayPal 里确认，Pal 不会替你付。`
        : `Cart ready: ${plan.items.length} items for ${money(plan.approved_total)}, ${money(plan.remaining_after)} left after${plan.later?.length ? `; ${plan.later.length} later ${plan.later.length === 1 ? "buy" : "buys"} scheduled` : ""}${left ? `; ${left} things for you to look at` : ""}. You approve the payment in PayPal; Pal never pays for you.`;
      run.status = "done";
    }
    step.usage = cost(usage);
    step.status = "done";
  } catch (e) {
    step.status = "failed";
    step.error = (e as Error).message;
    run.status = "failed";
  }
  step.ms = Date.now() - t0;
  run.total_cost = Math.round(run.steps.reduce((t, x) => t + (x.usage?.cost ?? 0), 0) * 1000) / 1000;
  return run;
}

// Retry a failed run from the step that failed (everything before it is kept).
export function resume(run: MonthRun) {
  for (const s of run.steps) if (s.status === "failed") { s.status = "pending"; s.error = undefined; }
  run.status = "running";
  return run;
}
