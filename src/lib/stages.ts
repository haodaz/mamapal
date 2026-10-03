import type { Child, Profile } from "./types";
import { monthsSince } from "./age";
import { itemsForMonths, monthlyCost, type Item, type Category } from "./catalog";

// Needs by stage, driven by the catalog (src/lib/catalog.ts). Stage labels and milestones live here.
export type NeedCategory = Category;
type L = { en: string; zh: string };
export type Tier = 1 | 2 | 3; // Maslow: 1 survival, 2 growth & learning, 3 joy & experiences
export type Need = { id: string; category: NeedCategory; label: L; qty: string; cost: number; monthly: number; kind: Item["kind"]; cheap: L | null; tier: Tier; essential: boolean; owned: boolean };
export type Stage = { key: string; min: number; max: number; label: L; diapersPerDay: number; formulaMlPerDay: number };

export const STAGES: Stage[] = [
  { key: "preg", min: -9, max: -1, label: { en: "pregnancy", zh: "孕期" }, diapersPerDay: 0, formulaMlPerDay: 0 },
  { key: "0-2", min: 0, max: 2, label: { en: "newborn", zh: "新生儿" }, diapersPerDay: 10, formulaMlPerDay: 600 },
  { key: "3-5", min: 3, max: 5, label: { en: "3–5 months", zh: "3–5 个月" }, diapersPerDay: 8, formulaMlPerDay: 800 },
  { key: "6-8", min: 6, max: 8, label: { en: "6–8 months", zh: "6–8 个月" }, diapersPerDay: 6, formulaMlPerDay: 750 },
  { key: "9-11", min: 9, max: 11, label: { en: "9–11 months", zh: "9–11 个月" }, diapersPerDay: 6, formulaMlPerDay: 700 },
  { key: "12-17", min: 12, max: 17, label: { en: "12–17 months", zh: "1 岁–1 岁半" }, diapersPerDay: 5, formulaMlPerDay: 0 },
  { key: "18-23", min: 18, max: 23, label: { en: "18–23 months", zh: "1 岁半–2 岁" }, diapersPerDay: 5, formulaMlPerDay: 0 },
  { key: "24-35", min: 24, max: 35, label: { en: "2 years", zh: "2 岁" }, diapersPerDay: 4, formulaMlPerDay: 0 },
  { key: "36-59", min: 36, max: 59, label: { en: "3–4 years", zh: "3–4 岁" }, diapersPerDay: 0, formulaMlPerDay: 0 },
  { key: "60+", min: 60, max: 999, label: { en: "5+ years", zh: "5 岁以上" }, diapersPerDay: 0, formulaMlPerDay: 0 },
];


// Typical things a child is working on in each stage (CDC-style ranges, not a diagnosis). Shown on the timeline.
export const MILESTONES: Record<string, L[]> = {
  "preg": [{ en: "prenatal visits on schedule", zh: "按时产检" }, { en: "pack the hospital bag", zh: "准备待产包" }, { en: "install the car seat", zh: "装好安全座椅" }, { en: "sign up for WIC early", zh: "尽早登记 WIC" }],
  "0-2": [{ en: "lifts head in tummy time", zh: "俯卧抬头" }, { en: "follows your face", zh: "跟着妈妈的脸看" }, { en: "first social smiles", zh: "第一次社交性微笑" }],
  "3-5": [{ en: "laughs, babbles", zh: "咯咯笑、咿呀" }, { en: "holds head steady", zh: "头稳了" }, { en: "reaches for toys", zh: "伸手够玩具" }, { en: "rolls over", zh: "翻身" }],
  "6-8": [{ en: "sits with little support", zh: "能坐一会儿" }, { en: "first solids", zh: "开始辅食" }, { en: "passes toys hand to hand", zh: "玩具换手" }, { en: "responds to name", zh: "叫名字有反应" }],
  "9-11": [{ en: "crawls, pulls to stand", zh: "爬、扶站" }, { en: "finger foods", zh: "手指食物" }, { en: "waves bye-bye", zh: "挥手再见" }, { en: "says mama / dada", zh: "叫妈妈、爸爸" }],
  "12-17": [{ en: "first steps", zh: "第一步" }, { en: "a few words", zh: "几个词" }, { en: "drinks from a cup", zh: "用杯子喝" }, { en: "points to ask", zh: "用手指要东西" }],
  "18-23": [{ en: "runs, climbs", zh: "跑、爬高" }, { en: "two-word phrases", zh: "两个词连说" }, { en: "pretend play", zh: "过家家" }, { en: "scribbles", zh: "涂鸦" }],
  "24-35": [{ en: "short sentences", zh: "短句子" }, { en: "potty training starts", zh: "开始如厕训练" }, { en: "jumps with both feet", zh: "双脚跳" }, { en: "plays next to other kids", zh: "和别的孩子一起玩" }],
  "36-59": [{ en: "preschool ready", zh: "可以上幼儿园" }, { en: "tells little stories", zh: "讲小故事" }, { en: "pedals a trike", zh: "蹬三轮车" }, { en: "counts to 10", zh: "数到 10" }],
  "60+": [{ en: "kindergarten", zh: "上学" }, { en: "reads simple words", zh: "认简单的字" }, { en: "makes friends", zh: "交朋友" }],
};

export function stageFor(months: number): Stage {
  return STAGES.find((s) => months >= s.min && months <= s.max) ?? (months < -9 ? STAGES[0] : STAGES[STAGES.length - 1]);
}

export function childNeeds(child: Child, profile: Profile, owned: string[] = []) {
  const months = monthsSince(child.born);
  const stage = stageFor(months);
  const needs: Need[] = itemsForMonths(months, profile).map((it) => ({
    id: it.id, category: it.category, label: { en: it.label_en, zh: it.label_zh }, qty: "", cost: it.cost, monthly: monthlyCost(it), kind: it.kind,
    cheap: { en: it.cheap_en, zh: it.cheap_zh }, tier: it.tier, essential: it.essential, owned: owned.includes(it.id),
  }));
  // qty text lives on the item; keep it short in the row
  const byId = new Map(itemsForMonths(months, profile).map((it) => [it.id, it] as const));
  for (const n of needs) { const it = byId.get(n.id)!; n.qty = it.qty_en.length > 28 ? "" : it.qty_en; }
  const order = { monthly: 0, occasional: 1, one_time: 2 } as const;
  needs.sort((a, b) => a.tier - b.tier || order[a.kind] - order[b.kind] || (b.essential ? 1 : 0) - (a.essential ? 1 : 0));
  const monthlyTotal = Math.round(needs.reduce((s, n) => s + n.monthly, 0));
  const oneTime = needs.filter((n) => n.kind === "one_time" && !n.owned);
  const oneTimeTotal = Math.round(oneTime.reduce((s, n) => s + n.cost, 0));
  const tiers = ([1, 2, 3] as Tier[]).map((tier) => {
    const ns = needs.filter((n) => n.tier === tier);
    return { tier, needs: ns, total: Math.round(ns.reduce((s, n) => s + n.monthly, 0)), oneTime: Math.round(ns.filter((n) => n.kind === "one_time" && !n.owned).reduce((s, n) => s + n.cost, 0)) };
  });
  return { months, stage, needs, total: monthlyTotal, oneTimeTotal, oneTime, tiers };
}

export function needsSummaryForAgent(profile: Profile, owned: string[] = []): string {
  return profile.children
    .map((c) => {
      const { months, stage, total, oneTimeTotal, tiers } = childNeeds(c, profile, owned);
      const parts = tiers.map((t) => `tier ${t.tier} $${t.total}/mo: ${t.needs.filter((n) => n.kind !== "one_time").slice(0, 14).map((n) => `${n.label.en} $${n.monthly}`).join(", ")}${t.oneTime ? `; one-time not yet owned $${t.oneTime}` : ""}`).join(" | ");
      return `${c.name || "child"} (${stage.label.en}, ${months} mo): ≈ $${total}/mo recurring, $${oneTimeTotal} one-time still needed — ${parts}`;
    })
    .join("\n");
}
