import { NextResponse } from "next/server";
import { loadState, saveState, resetState } from "@/lib/store";
import { derive, type Profile, type SupplyType } from "@/lib/types";
import { setSupply } from "@/lib/inventory";
import { paypalConfigured } from "@/lib/paypal";

export const dynamic = "force-dynamic";

async function payload() {
  const state = await loadState();
  return { state, derived: derive(state), paypal_configured: paypalConfigured() };
}

export async function GET() {
  return NextResponse.json(await payload());
}

export async function POST(req: Request) {
  const body = (await req.json()) as { budget?: number; food_lock?: number; profile?: Partial<Profile>; reset?: boolean; onboarded?: boolean; supplies?: Partial<Record<SupplyType, number>> };
  if (body.reset) {
    await resetState();
    return NextResponse.json(await payload());
  }
  const state = await loadState();
  if (typeof body.budget === "number" && body.budget >= 0) state.budget = body.budget;
  if (typeof body.food_lock === "number" && body.food_lock >= 0) state.food_lock = body.food_lock;
  if (body.profile) {
    const p = body.profile;
    state.profile = {
      ...state.profile,
      ...(p.name !== undefined && { name: String(p.name).trim() }),
      ...(p.zip !== undefined && { zip: String(p.zip).trim() }),
      ...(p.state !== undefined && { state: String(p.state).trim().toUpperCase().slice(0, 2) }),
      ...(p.household_size !== undefined && { household_size: Math.max(1, Number(p.household_size) || 1) }),
      ...(p.monthly_income !== undefined && { monthly_income: Math.max(0, Number(p.monthly_income) || 0) }),
      ...(Array.isArray(p.children) && { children: p.children.filter((c) => /^\d{4}-\d{2}$/.test(c.born)).map((c) => ({ name: String(c.name ?? "").trim(), born: c.born, ...(c.gestational_weeks ? { gestational_weeks: Math.min(42, Math.max(22, Number(c.gestational_weeks))) } : {}), ...(c.notes ? { notes: String(c.notes).trim().slice(0, 300) } : {}), ...(c.photo ? { photo: String(c.photo).slice(0, 200000) } : {}) })) }),
      ...(p.diapers_per_day !== undefined && { diapers_per_day: Math.max(0, Number(p.diapers_per_day) || 0) }),
      ...(p.formula_ml_per_day !== undefined && { formula_ml_per_day: Math.max(0, Number(p.formula_ml_per_day) || 0) }),
      ...(p.pregnant !== undefined && { pregnant: Boolean(p.pregnant) }),
      ...(p.on_snap !== undefined && { on_snap: Boolean(p.on_snap) }),
      ...(p.on_medicaid !== undefined && { on_medicaid: Boolean(p.on_medicaid) }),
    };
  }
  if (typeof body.onboarded === "boolean") state.onboarded = body.onboarded;
  if (body.supplies) for (const [k, v] of Object.entries(body.supplies)) if (typeof v === "number") state.supplies = setSupply(state.supplies, k as SupplyType, v);
  if (state.food_lock > state.budget) state.food_lock = state.budget;
  await saveState(state);
  return NextResponse.json(await payload());
}
