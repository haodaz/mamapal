import type { Child, Profile } from "./types";
import { monthsSince } from "./age";

// Monthly baseline needs by developmental stage (actual age in months).
// Prices are conservative US store-brand retail; the point is the shape of the month, not the cents.
// Boundary: a model, not a bill. Real use is overridden by the profile where we have it (diapers/day, formula ml/day).

export type NeedCategory = "diapers" | "feeding" | "solids" | "clothing" | "play" | "books" | "health" | "care";
type L = { en: string; zh: string };
export type Need = { category: NeedCategory; label: L; qty: string; cost: number; cheap: L | null };
export type Stage = { key: string; min: number; max: number; label: L; diapersPerDay: number; formulaMlPerDay: number; needs: (p: Profile) => Need[] };

const DIAPER = (perDay: number, price: number, l: L): Need => ({ category: "diapers", label: l, qty: `${perDay * 30}/mo`, cost: Math.round(perDay * 30 * price), cheap: { en: "Store brand; diaper banks give ~50/mo free", zh: "超市自有品牌；尿布银行每月免费约 50 片" } });
const WIPES: Need = { category: "care", label: { en: "wipes", zh: "湿巾" }, qty: "~2 packs", cost: 8, cheap: { en: "Washcloths + water at home", zh: "在家用小毛巾加清水" } };
const FORMULA = (ml: number): Need => ({ category: "feeding", label: { en: "formula", zh: "奶粉" }, qty: `${ml} ml/day`, cost: Math.round(ml * 30 * 0.0031), cheap: { en: "WIC covers formula fully; store brand meets the same FDA rules", zh: "WIC 全额覆盖奶粉；自有品牌执行同样的 FDA 标准" } });
const MILK: Need = { category: "feeding", label: { en: "whole milk", zh: "全脂牛奶" }, qty: "~16 oz/day", cost: 16, cheap: { en: "WIC provides milk", zh: "WIC 提供牛奶" } };
const VITD: Need = { category: "health", label: { en: "vitamin D drops (if breastfed) + fever meds", zh: "维生素 D 滴剂（母乳喂养）+ 退烧药" }, qty: "", cost: 5, cheap: { en: "Generic acetaminophen; ask pediatrician for samples", zh: "通用对乙酰氨基酚；可向儿科医生要试用装" } };
const CREAM: Need = { category: "care", label: { en: "diaper cream, soap", zh: "护臀膏、沐浴液" }, qty: "", cost: 5, cheap: { en: "Zinc oxide generic $4", zh: "通用锌氧膏约 $4" } };
const BOOKS = (l: L): Need => ({ category: "books", label: l, qty: "1–2/mo", cost: 3, cheap: { en: "Library: free; Reach Out and Read gives books at checkups", zh: "图书馆免费；儿科体检时 Reach Out and Read 送书" } });
const CLOTH = (l: L, cost: number): Need => ({ category: "clothing", label: l, qty: "", cost, cheap: { en: "Thrift, Buy Nothing groups, hand-me-downs", zh: "二手店、Buy Nothing 群、亲友旧衣" } });
const PLAY = (l: L, cost: number, cheap: L): Need => ({ category: "play", label: l, qty: "", cost, cheap });

export const STAGES: Stage[] = [
  { key: "0-2", min: 0, max: 2, label: { en: "newborn", zh: "新生儿" }, diapersPerDay: 10, formulaMlPerDay: 600,
    needs: (p) => [DIAPER(p.diapers_per_day || 10, 0.16, { en: "diapers NB/1", zh: "尿布 NB/1 号" }), WIPES, ...(p.formula_ml_per_day ? [FORMULA(p.formula_ml_per_day)] : []), VITD, CREAM,
      CLOTH({ en: "onesies NB→0-3 (sizes change monthly)", zh: "连体衣 NB→0-3（每月换码）" }, 15),
      PLAY({ en: "high-contrast cards, tummy-time mirror", zh: "黑白卡、俯卧镜" }, 3, { en: "Print cards at home; any safe mirror", zh: "在家打印黑白卡；任何安全镜子都行" }), BOOKS({ en: "board book", zh: "纸板书" })] },
  { key: "3-5", min: 3, max: 5, label: { en: "3–5 months", zh: "3–5 个月" }, diapersPerDay: 8, formulaMlPerDay: 800,
    needs: (p) => [DIAPER(p.diapers_per_day || 8, 0.16, { en: "diapers 1/2", zh: "尿布 1/2 号" }), WIPES, ...(p.formula_ml_per_day ? [FORMULA(p.formula_ml_per_day)] : []), VITD, CREAM,
      CLOTH({ en: "3-6 mo clothes", zh: "3-6 月码衣服" }, 15),
      PLAY({ en: "rattle, play mat, soft ball", zh: "摇铃、游戏垫、软球" }, 5, { en: "Household items: wooden spoon, scarf", zh: "家里的木勺、丝巾就是玩具" }), BOOKS({ en: "board books", zh: "纸板书" })] },
  { key: "6-8", min: 6, max: 8, label: { en: "6–8 months", zh: "6–8 个月" }, diapersPerDay: 6, formulaMlPerDay: 750,
    needs: (p) => [DIAPER(p.diapers_per_day || 6, 0.16, { en: "diapers 2/3", zh: "尿布 2/3 号" }), WIPES, ...(p.formula_ml_per_day ? [FORMULA(p.formula_ml_per_day)] : []),
      { category: "solids", label: { en: "first solids: iron-fortified cereal, purees", zh: "初加辅食：强化铁米粉、果蔬泥" }, qty: "", cost: 20, cheap: { en: "WIC covers infant cereal; mash what you cook", zh: "WIC 覆盖婴儿米粉；自己做的饭压成泥" } },
      { category: "solids", label: { en: "spoon, bowl, bib (one-time)", zh: "软勺、碗、围兜（一次性）" }, qty: "", cost: 8, cheap: null }, VITD, CREAM,
      CLOTH({ en: "6-9 mo clothes", zh: "6-9 月码衣服" }, 15),
      PLAY({ en: "teethers, stacking cups, cause-and-effect toy", zh: "牙胶、叠叠杯、因果玩具" }, 6, { en: "Measuring cups, a box with lids", zh: "量杯、带盖的盒子" }), BOOKS({ en: "touch-and-feel books", zh: "触摸书" })] },
  { key: "9-11", min: 9, max: 11, label: { en: "9–11 months", zh: "9–11 个月" }, diapersPerDay: 6, formulaMlPerDay: 700,
    needs: (p) => [DIAPER(p.diapers_per_day || 6, 0.17, { en: "diapers 3/4", zh: "尿布 3/4 号" }), WIPES, ...(p.formula_ml_per_day ? [FORMULA(p.formula_ml_per_day)] : []),
      { category: "solids", label: { en: "finger foods, 3 small meals", zh: "手指食物、三顿小餐" }, qty: "", cost: 30, cheap: { en: "Eggs, oats, banana, beans: cheapest baby food is family food", zh: "鸡蛋、燕麦、香蕉、豆子：最便宜的辅食就是家常饭" } }, VITD, CREAM,
      CLOTH({ en: "9-12 mo clothes, first soft shoes", zh: "9-12 月码衣服、软底鞋" }, 18),
      PLAY({ en: "push toy, shape sorter, balls", zh: "推推乐、形状盒、球" }, 6, { en: "Laundry basket as push toy", zh: "洗衣篮就是推推乐" }), BOOKS({ en: "lift-the-flap books", zh: "翻翻书" })] },
  { key: "12-17", min: 12, max: 17, label: { en: "12–17 months", zh: "1 岁–1 岁半" }, diapersPerDay: 5, formulaMlPerDay: 0,
    needs: (p) => [DIAPER(p.diapers_per_day || 5, 0.20, { en: "diapers 4", zh: "尿布 4 号" }), WIPES, MILK,
      { category: "solids", label: { en: "table food share", zh: "跟着家里吃" }, qty: "", cost: 45, cheap: { en: "WIC adds fruit/veg, eggs, grains", zh: "WIC 提供果蔬、鸡蛋、谷物" } }, VITD, CREAM,
      CLOTH({ en: "12-18 mo clothes, walking shoes", zh: "12-18 月码衣服、学步鞋" }, 18),
      PLAY({ en: "blocks, ball, simple puzzle, crayons", zh: "积木、球、简单拼图、蜡笔" }, 7, { en: "Cardboard boxes, pots, library toy lending", zh: "纸箱、锅碗、图书馆玩具借阅" }), BOOKS({ en: "picture books", zh: "绘本" })] },
  { key: "18-23", min: 18, max: 23, label: { en: "18–23 months", zh: "1 岁半–2 岁" }, diapersPerDay: 5, formulaMlPerDay: 0,
    needs: (p) => [DIAPER(p.diapers_per_day || 5, 0.22, { en: "diapers 4/5", zh: "尿布 4/5 号" }), WIPES, MILK,
      { category: "solids", label: { en: "table food share", zh: "跟着家里吃" }, qty: "", cost: 50, cheap: null }, VITD, CREAM,
      CLOTH({ en: "18-24 mo clothes", zh: "18-24 月码衣服" }, 15),
      PLAY({ en: "pretend play (cups, doll), chunky puzzles, crayons", zh: "过家家（杯子、娃娃）、大块拼图、蜡笔" }, 7, { en: "Free: library story time, playground", zh: "免费：图书馆故事会、游乐场" }), BOOKS({ en: "picture books", zh: "绘本" })] },
  { key: "24-35", min: 24, max: 35, label: { en: "2 years", zh: "2 岁" }, diapersPerDay: 4, formulaMlPerDay: 0,
    needs: (p) => [DIAPER(p.diapers_per_day || 4, 0.25, { en: "diapers 5 / training pants", zh: "尿布 5 号 / 训练裤" }), WIPES, MILK,
      { category: "solids", label: { en: "food share", zh: "跟着家里吃" }, qty: "", cost: 55, cheap: null }, VITD,
      CLOTH({ en: "2T clothes, shoes", zh: "2T 衣服、鞋" }, 15),
      PLAY({ en: "tricycle/ride-on, play dough, art supplies", zh: "三轮车、橡皮泥、画画用品" }, 8, { en: "Homemade play dough; sidewalk chalk", zh: "自制橡皮泥；粉笔" }), BOOKS({ en: "story books", zh: "故事书" })] },
  { key: "36-59", min: 36, max: 59, label: { en: "3–4 years", zh: "3–4 岁" }, diapersPerDay: 0, formulaMlPerDay: 0,
    needs: (p) => [...(p.diapers_per_day ? [DIAPER(p.diapers_per_day, 0.30, { en: "pull-ups (night)", zh: "拉拉裤（夜间）" })] : []),
      { category: "solids", label: { en: "food share", zh: "跟着家里吃" }, qty: "", cost: 60, cheap: { en: "Head Start / preschool serves meals", zh: "Head Start / 幼儿园供餐" } }, VITD,
      CLOTH({ en: "3T-4T clothes, shoes", zh: "3T-4T 衣服、鞋" }, 14),
      PLAY({ en: "puzzles, scissors + paper, bike", zh: "拼图、安全剪刀和纸、自行车" }, 8, { en: "Head Start is free preschool with supplies", zh: "Head Start 是免费幼儿园，含用品" }), BOOKS({ en: "early readers", zh: "启蒙读物" })] },
  { key: "60+", min: 60, max: 999, label: { en: "5+ years", zh: "5 岁以上" }, diapersPerDay: 0, formulaMlPerDay: 0,
    needs: () => [{ category: "solids", label: { en: "food share", zh: "跟着家里吃" }, qty: "", cost: 70, cheap: { en: "Free school meals + Summer EBT", zh: "学校免费餐 + 暑期 EBT" } },
      CLOTH({ en: "clothes, shoes, school basics", zh: "衣服、鞋、上学用品" }, 15),
      PLAY({ en: "school supplies, one activity", zh: "文具、一项课外活动" }, 10, { en: "Library programs, rec center scholarships", zh: "图书馆活动、社区中心减免" }), BOOKS({ en: "chapter books", zh: "章节书" })] },
];

export function stageFor(months: number): Stage {
  return STAGES.find((s) => months >= s.min && months <= s.max) ?? STAGES[STAGES.length - 1];
}

export function childNeeds(child: Child, profile: Profile) {
  const months = monthsSince(child.born);
  const stage = stageFor(months);
  const needs = stage.needs(profile);
  const total = needs.reduce((s, n) => s + n.cost, 0);
  return { months, stage, needs, total };
}

export function needsSummaryForAgent(profile: Profile): string {
  return profile.children
    .map((c) => {
      const { months, stage, needs, total } = childNeeds(c, profile);
      const parts = needs.map((n) => `${n.label.en} $${n.cost}`).join(", ");
      return `${c.name || "child"} (${stage.label.en}, ${months} mo): baseline ≈ $${total}/mo — ${parts}`;
    })
    .join("\n");
}
