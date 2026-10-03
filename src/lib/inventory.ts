import type { State, SupplyType, Supplies } from "./types";

// Pantry forecast: what was bought (from paid verdicts) minus what the family uses per day (from the profile),
// projected to today. Boundary: a model of three consumables; it does not know what she bought elsewhere unless she edits it in Me.

export const SUPPLY_TYPES: SupplyType[] = ["diapers", "formula", "wipes"];

export function dailyRate(state: State, type: SupplyType): number {
  if (type === "diapers") return state.profile.diapers_per_day;
  if (type === "formula") return state.profile.formula_ml_per_day;
  return Math.round(state.profile.diapers_per_day * 1.5); // wipes: ~1.5 sheets per change
}

export function remaining(state: State, type: SupplyType, now = new Date()): number {
  const s = state.supplies[type];
  const days = Math.max(0, (now.getTime() - new Date(s.as_of).getTime()) / 86_400_000);
  return Math.max(0, Math.round(s.qty - dailyRate(state, type) * days));
}

export function supplyStatus(state: State, now = new Date()) {
  return SUPPLY_TYPES.map((type) => {
    const rate = dailyRate(state, type);
    const left = remaining(state, type, now);
    const days = rate > 0 ? Math.floor(left / rate) : null;
    const runout = days != null ? new Date(now.getTime() + days * 86_400_000) : null;
    const tracked = rate > 0 && state.supplies[type].qty > 0; // untracked until a purchase or a manual number
    return { type, rate, left, days, runout, tracked, low: tracked && days != null && days <= 7 };
  });
}

// Add a purchase: first settle consumption up to now, then add the quantity.
export function addSupply(supplies: Supplies, state: State, type: SupplyType, qty: number, now = new Date()): Supplies {
  const left = remaining(state, type, now);
  return { ...supplies, [type]: { qty: left + qty, as_of: now.toISOString() } };
}

export function setSupply(supplies: Supplies, type: SupplyType, qty: number, now = new Date()): Supplies {
  return { ...supplies, [type]: { qty: Math.max(0, qty), as_of: now.toISOString() } };
}
