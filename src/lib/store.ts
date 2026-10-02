import { promises as fs } from "fs";
import path from "path";
import type { State, Opportunity, Profile, MonthArchive } from "./types";
import { derive } from "./types";

// Single-user demo store: one JSON file on disk, in-memory fallback if the disk is read-only.
// Boundary: NOT multi-user and NOT durable on ephemeral hosts (Render free tier resets it on deploy).

const FILE = path.join(process.cwd(), "data", "state.json");
let memory: State | null = null;

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const SEED_OPPORTUNITIES: Opportunity[] = [
  { id: "opp-sleep", reward: 2.0, seconds: 20, n_questions: 2, status: "open" },
  { id: "opp-diaper", reward: 3.0, seconds: 30, n_questions: 3, status: "open" },
];

function defaultBorn(monthsAgo: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  zip: "",
  state: "",
  household_size: 2,
  monthly_income: 1200,
  children: [{ name: "", born: defaultBorn(6) }],
  diapers_per_day: 6,
  formula_ml_per_day: 0,
  pregnant: false,
  on_snap: false,
  on_medicaid: false,
};

function fresh(): State {
  return {
    month: monthKey(),
    budget: 400,
    food_lock: 100,
    ledger: [],
    plans: [],
    opportunities: SEED_OPPORTUNITIES,
    profile: DEFAULT_PROFILE,
    resources: null,
    history: [],
  };
}

function archiveOf(state: State): MonthArchive | null {
  if (!state.ledger.length && !state.plans.length) return null;
  const d = derive(state);
  return { month: state.month, budget: state.budget, food_lock: state.food_lock, spent: d.spent, earned: d.earned, intercepted: d.intercepted, plans: state.plans, ledger: state.ledger };
}

function rollover(state: State): State {
  const arch = archiveOf(state);
  return {
    ...fresh(),
    budget: state.budget,
    food_lock: state.food_lock,
    profile: state.profile,
    resources: state.resources,
    history: arch ? [...state.history.filter((h) => h.month !== arch.month), arch] : state.history,
  };
}

export async function loadState(): Promise<State> {
  if (memory) return memory;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const s = JSON.parse(raw) as Partial<State>;
    memory = { ...fresh(), ...s };
    // migrate older profile shapes
    const legacy = s as unknown as { baby_age_months?: number; profile?: { children_ages?: number[] } };
    memory.profile = { ...DEFAULT_PROFILE, ...(s.profile ?? {}) };
    if (!Array.isArray(memory.profile.children) || !memory.profile.children.length) {
      const ages = legacy.profile?.children_ages ?? [];
      memory.profile.children = ages.length
        ? ages.map((y) => ({ name: "", born: defaultBorn(Math.round(y * 12)) }))
        : [{ name: "", born: defaultBorn(legacy.baby_age_months ?? 6) }];
    }
    // migrate old opportunity shape
    memory.opportunities = memory.opportunities.map((o) => ({ ...SEED_OPPORTUNITIES.find((x) => x.id === o.id), ...o } as Opportunity));
    if (!Array.isArray(memory.history)) memory.history = [];
    // new calendar month: archive the old one automatically
    if (memory.month !== monthKey()) {
      memory = rollover(memory);
      await saveState(memory);
    }
  } catch {
    memory = fresh();
  }
  return memory!;
}

export async function saveState(state: State): Promise<void> {
  memory = state;
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn("[store] disk write failed, keeping state in memory only:", (e as Error).message);
  }
}

export async function resetState(): Promise<State> {
  const keep = memory ?? (await loadState());
  const s = rollover(keep);
  await saveState(s);
  return s;
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
