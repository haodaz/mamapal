import { promises as fs } from "fs";
import path from "path";
import type { State, Opportunity, Profile, MonthArchive } from "./types";
import { derive } from "./types";

import { createClient } from "@supabase/supabase-js";

// Single-user demo store. Persistence, in order of preference:
//   1. Supabase table `app_state` (one row, jsonb) when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) are set — needed on Vercel/Render, whose disks don't persist.
//   2. data/state.json on disk (local dev).
//   3. in-memory fallback.
// Boundary: NOT multi-user; one shared state per deployment.

const FILE = path.join(process.cwd(), "data", "state.json");
const ROW_ID = process.env.STATE_ROW_ID ?? "default";
let memory: State | null = null;

function supabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY; // anon works too, with the policy in supabase/schema.sql
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readRaw(): Promise<string | null> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb.from("app_state").select("state").eq("id", ROW_ID).maybeSingle();
    if (error) throw new Error(`supabase read: ${error.message}`);
    return data ? JSON.stringify(data.state) : null;
  }
  return fs.readFile(FILE, "utf8");
}

async function writeRaw(state: State): Promise<void> {
  const sb = supabase();
  if (sb) {
    const { error } = await sb.from("app_state").upsert({ id: ROW_ID, state, updated_at: new Date().toISOString() });
    if (error) throw new Error(`supabase write: ${error.message}`);
    return;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state, null, 2));
}

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
    const raw = await readRaw();
    if (!raw) throw new Error("empty");
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
  } catch (e) {
    if ((e as Error).message !== "empty" && !/ENOENT/.test((e as Error).message)) console.warn("[store] load failed, starting fresh:", (e as Error).message);
    memory = fresh();
  }
  return memory!;
}

export async function saveState(state: State): Promise<void> {
  memory = state;
  try {
    await writeRaw(state);
  } catch (e) {
    console.warn("[store] write failed, keeping state in memory only:", (e as Error).message);
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
