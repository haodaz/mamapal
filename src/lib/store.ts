import { promises as fs } from "fs";
import path from "path";
import type { State, Opportunity, Profile, MonthArchive, Supplies, Conversation } from "./types";
import { derive } from "./types";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Demo store: one JSON state per household. Persistence, in order of preference:
//   1. Supabase table `app_state` (one row per household, jsonb) when SUPABASE_URL + a key are set — needed on Vercel, whose disks don't persist.
//   2. data/state.json (or data/state-<row>.json) on disk (local dev).
//   3. in-memory fallback.
// Which row: the `mp_row` cookie set at sign-in (each demo code gets its own private copy). Without the cookie a
// request gets an empty "guest" household, never a real one. The owner's own household (row "default", or
// STATE_ROW_ID) is reached only by signing in with OWNER_CODE, which is set in the environment, never in code.
// Boundary: a household is whoever holds the cookie. This is not authentication.

export const ROW_COOKIE = "mp_row";
export const OWNER_ROW = process.env.STATE_ROW_ID ?? "default";
const DEFAULT_ROW = "guest";
export const validRow = (r: string | undefined | null): r is string => !!r && /^[a-z0-9-]{1,48}$/.test(r);
const memory = new Map<string, State>();

async function currentRow(): Promise<string> {
  try {
    const r = (await cookies()).get(ROW_COOKIE)?.value;
    return validRow(r) ? r : DEFAULT_ROW;
  } catch {
    return DEFAULT_ROW; // outside a request (scripts)
  }
}
const fileFor = (row: string) => path.join(process.cwd(), "data", row === "default" ? "state.json" : `state-${row}.json`);

function supabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY; // anon works too, with the policy in supabase/schema.sql
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readRaw(row: string): Promise<string | null> {
  const sb = supabase();
  if (sb) {
    const { data, error } = await sb.from("app_state").select("state").eq("id", row).maybeSingle();
    if (error) throw new Error(`supabase read: ${error.message}`);
    return data ? JSON.stringify(data.state) : null;
  }
  return fs.readFile(fileFor(row), "utf8");
}

async function writeRaw(row: string, state: State): Promise<void> {
  const sb = supabase();
  if (sb) {
    const { error } = await sb.from("app_state").upsert({ id: row, state, updated_at: new Date().toISOString() });
    if (error) throw new Error(`supabase write: ${error.message}`);
    return;
  }
  await fs.mkdir(path.dirname(fileFor(row)), { recursive: true });
  await fs.writeFile(fileFor(row), JSON.stringify(state, null, 2));
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

export function emptySupplies(): Supplies {
  const now = new Date().toISOString();
  return { diapers: { qty: 0, as_of: now }, formula: { qty: 0, as_of: now }, wipes: { qty: 0, as_of: now } };
}

export function freshState(): State { return fresh(); }

// Households from before conversations existed: one conversation per earlier verdict or month run, newest first.
function legacyConversations(st: State): Conversation[] {
  const items = [
    ...st.plans.filter((p) => !p.run_id).map((p) => ({ kind: "plan" as const, id: p.id, title: p.ask, at: p.created_at })),
    ...(st.runs ?? []).map((r) => ({ kind: "run" as const, id: r.id, title: r.goal, at: r.created_at })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return items.slice(0, 30).map((x) => ({ id: `c_${x.id}`, title: x.title.slice(0, 60), created_at: x.at, updated_at: x.at, items: [{ kind: x.kind, id: x.id }] }));
}

// Put a new verdict or run into a conversation (a new one when none is given). Returns the conversation id.
export function attach(state: State, conversationId: string | undefined, item: { kind: "plan" | "run"; id: string }, title: string): string {
  const now = new Date().toISOString();
  const list = state.conversations ?? [];
  let c = conversationId ? list.find((x) => x.id === conversationId) : undefined;
  if (!c) { c = { id: newId("c"), title: title.trim().slice(0, 60), created_at: now, updated_at: now, items: [] }; }
  c.items.push(item);
  c.updated_at = now;
  state.conversations = [c, ...list.filter((x) => x.id !== c!.id)].slice(0, 30);
  return c.id;
}

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
    onboarded: false,
    supplies: emptySupplies(),
    month_notes: [],
    knowledge: {},
    market: {},
    owned: [],
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
    onboarded: state.onboarded,
    supplies: state.supplies,
    month_notes: [],
    knowledge: state.knowledge,
    market: state.market,
    owned: state.owned,
    history: arch ? [...state.history.filter((h) => h.month !== arch.month), arch] : state.history,
  };
}

export async function loadState(row?: string): Promise<State> {
  const r = row ?? (await currentRow());
  // With Supabase, never trust the per-instance memory cache: on Vercel each function instance has its own,
  // so a write from one instance would be invisible (and later clobbered) by another. One small read per request instead.
  const cached = memory.get(r);
  if (cached && !supabase()) return cached;
  let st: State;
  try {
    const raw = await readRaw(r);
    if (!raw) throw new Error("empty");
    const s = JSON.parse(raw) as Partial<State>;
    st = { ...fresh(), ...s };
    // migrate older profile shapes
    const legacy = s as unknown as { baby_age_months?: number; profile?: { children_ages?: number[] } };
    st.profile = { ...DEFAULT_PROFILE, ...(s.profile ?? {}) };
    if (!Array.isArray(st.profile.children) || !st.profile.children.length) {
      const ages = legacy.profile?.children_ages ?? [];
      st.profile.children = ages.length
        ? ages.map((y) => ({ name: "", born: defaultBorn(Math.round(y * 12)) }))
        : [{ name: "", born: defaultBorn(legacy.baby_age_months ?? 6) }];
    }
    // migrate old opportunity shape
    st.opportunities = st.opportunities.map((o) => ({ ...SEED_OPPORTUNITIES.find((x) => x.id === o.id), ...o } as Opportunity));
    if (!Array.isArray(st.history)) st.history = [];
    st.supplies = { ...emptySupplies(), ...(s.supplies ?? {}) };
    if (!Array.isArray(st.conversations)) st.conversations = legacyConversations(st);
    // new calendar month: archive the old one automatically
    if (st.month !== monthKey()) {
      st = rollover(st);
      await saveState(st, r);
    }
  } catch (e) {
    if ((e as Error).message !== "empty" && !/ENOENT/.test((e as Error).message)) console.warn("[store] load failed, starting fresh:", (e as Error).message);
    st = fresh();
  }
  memory.set(r, st);
  return st;
}

export async function saveState(state: State, row?: string): Promise<void> {
  const r = row ?? (await currentRow());
  memory.set(r, state);
  try {
    await writeRaw(r, state);
  } catch (e) {
    console.warn("[store] write failed, keeping state in memory only:", (e as Error).message);
  }
}

export async function resetState(): Promise<State> {
  const keep = await loadState();
  const s = rollover(keep);
  await saveState(s);
  return s;
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
