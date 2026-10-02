export type Verdict = "buy" | "swap" | "skip" | "defer";

export type PlanItem = {
  requested: string;
  requested_price: number;
  verdict: Verdict;
  reason: string;
  buy_name: string | null;
  buy_price: number | null;
  merchant: string | null;
  priority: 1 | 2 | 3;
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
  paypal_order_id?: string;
  paypal_capture_id?: string;
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

export type Child = { name: string; born: string; gestational_weeks?: number; notes?: string }; // born = "YYYY-MM"; weeks < 37 = preterm; notes = medical context Pal must respect (FGR, NICU, allergies…)

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
