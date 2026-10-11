export type Verdict = "buy" | "swap" | "skip" | "defer";

export type SupplyType = "diapers" | "formula" | "wipes";

// check: what the verifier saw when it opened the link. ok = page opened and showed this price;
// opens = page opened, price not visible to a robot; blocked = the store refuses robots (link not disproven); dead = 404 / no such page.
export type LinkCheck = "ok" | "opens" | "blocked" | "dead";
export type Offer = { merchant: string; price: number; url: string | null; note: string | null; check?: LinkCheck; picked?: boolean }; // picked = the price the month run put in the cart

export type PlanItem = {
  requested: string;
  requested_price: number;
  verdict: Verdict;
  reason: string;
  buy_name: string | null;
  buy_price: number | null;
  merchant: string | null;
  priority: 1 | 2 | 3;
  supply_type?: SupplyType | "none"; // what this purchase adds to the pantry
  supply_qty?: number; // diapers: count; formula: ml of prepared formula; wipes: sheets
  offers?: Offer[]; // filled by the cross-store price check
};

export type Plan = {
  id: string;
  created_at: string;
  ask: string;
  headline: string;
  items: PlanItem[];
  requested_total: number;
  approved_total: number;
  intercepted: number;
  remaining_after: number;
  note: string;
  status: "proposed" | "paid" | "dismissed";
  compared_at?: string;
  paypal_order_id?: string;
  paypal_capture_id?: string;
  run_id?: string; // set when the cart came out of a month run
  later?: LaterBuy[]; // what the run scheduled for later this month (not in this cart)
  checks?: RunChecks; // what the verifier confirmed before the cart reached her
};

// ---- Month run: one goal ("keep the baby covered this month"), several steps, each saved as it finishes ----
export type LaterBuy = { name: string; pack: string; price: number; buy_by: string | null; merchant: string | null; why: string };
export type RunChecks = { links: Record<LinkCheck, number>; issues: string[]; revisions: number };
export type RunStepKey = "stock" | "plan" | "prices" | "verify" | "cart";
export type RunStep = {
  key: RunStepKey;
  attempt: number; // 0 = first pass, 1+ = revision after the verifier sent it back
  status: "pending" | "running" | "done" | "failed";
  summary?: string; // one plain line for her, in the run's language
  notes?: string[]; // verify steps: what was sent back and why
  ms?: number;
  usage?: { input: number; output: number; searches: number; cost: number };
  error?: string;
};
export type RunItem = {
  need: string; name: string; pack: string; packs: number; unit_price: number;
  supply_type: SupplyType | "none"; per_pack: number; merchant: string | null;
  when: "now" | "later"; buy_by: string | null; tier: 1 | 2 | 3; why: string; benefit: string | null;
  offers?: Offer[];
};
export type RunIssue = { check: string; problem: string; fix_by: "planner" | "prices" | "mom" };
export type MonthRun = {
  id: string;
  created_at: string;
  lang: "en" | "zh";
  goal: string;
  status: "running" | "done" | "failed";
  steps: RunStep[];
  stock?: { available: number; spend_cap: number; days_left: number; month_end: string; lines: string[]; supplies: { type: SupplyType; rate: number; left: number; days: number | null; tracked: boolean; need: number; runout: string | null }[]; musts: { need: string; cost: number }[]; bought: string[]; benefits: string[] };
  draft?: { headline: string; note: string; items: RunItem[]; skipped: { need: string; why: string }[] };
  issues?: RunIssue[];
  links?: Record<LinkCheck, number>;
  plan_id?: string;
  total_cost?: number;
};

export type LedgerEntry = {
  id: string;
  ts: string;
  kind: "spend" | "earn";
  amount: number;
  note: string;
  paypal_id?: string;
  plan_id?: string;
};

export type Opportunity = {
  id: string; // copy lives in i18n OPPS[lang][id]
  reward: number;
  seconds: number;
  n_questions: number;
  status: "open" | "done";
  paypal_batch_id?: string;
};

export type Child = { name: string; born: string; gestational_weeks?: number; notes?: string; photo?: string }; // born = "YYYY-MM"; weeks < 37 = preterm; notes = medical context Pal must respect (FGR, NICU, allergies…)

export type Profile = {
  name: string;
  zip: string;
  state: string;
  household_size: number;
  monthly_income: number;
  children: Child[];
  diapers_per_day: number;
  formula_ml_per_day: number;
  pregnant: boolean;
  on_snap: boolean;
  on_medicaid: boolean;
};

export type ResourceCategory = "food" | "diapers" | "health" | "cash" | "childcare" | "utilities" | "tax" | "community";

export type Resource = {
  id: string;
  name: string;
  category: ResourceCategory;
  scope: "federal" | "state" | "local";
  eligibility: "likely" | "maybe" | "unlikely";
  why: string;
  value: string;
  monthly_value_estimate: number;
  steps: string[];
  documents: string[];
  apply_url: string | null;
  phone: string | null;
  verify_note: string | null;
};

export type ResourceReport = {
  generated_at: string;
  lang: "en" | "zh";
  profile: Profile;
  summary: string;
  items: Resource[];
};

export type Supplies = Record<SupplyType, { qty: number; as_of: string }>;

export type MonthArchive = {
  month: string;
  budget: number;
  food_lock: number;
  spent: number;
  earned: number;
  intercepted: number;
  plans: Plan[];
  ledger: LedgerEntry[];
};

export type MonthNotes = { month: string; lang: "en" | "zh"; child: string; focus: string[]; tier_notes: { 1: string; 2: string; 3: string }; next: string; at: string };
export type Market = { brands: { brand: string; product: string; price: number; where: string; url: string | null; note: string | null }[]; cheapest: string; at: string };
export type Guide = { title: string; what: string; which_one: string; how_much: string; traps: string[]; safety: string; cheap: string; at: string };

export type State = {
  month: string;
  budget: number;
  food_lock: number;
  ledger: LedgerEntry[];
  plans: Plan[];
  opportunities: Opportunity[];
  profile: Profile;
  resources: ResourceReport | null;
  history: MonthArchive[];
  onboarded?: boolean;
  supplies: Supplies;
  month_notes?: MonthNotes[]; // one per child per month (cached AI text)
  knowledge?: Record<string, Guide>; // key = stage|id|lang (slow-changing memory)
  market?: Record<string, Market>; // key = stage|id|lang (retrieved, refreshable)
  owned?: string[]; // one-time items she already has
  runs?: MonthRun[]; // month runs, newest last (kept to the last few)
};

export function derive(state: State) {
  const spent = state.ledger.filter((e) => e.kind === "spend").reduce((s, e) => s + e.amount, 0);
  const earned = state.ledger.filter((e) => e.kind === "earn").reduce((s, e) => s + e.amount, 0);
  const intercepted = state.plans.filter((p) => p.status === "paid").reduce((s, p) => s + p.intercepted, 0);
  const available = round(state.budget - state.food_lock - spent + earned);
  return { spent: round(spent), earned: round(earned), intercepted: round(intercepted), available };
}

export function round(n: number) {
  return Math.round(n * 100) / 100;
}
