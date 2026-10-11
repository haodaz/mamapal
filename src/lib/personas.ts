import type { State, ResourceReport } from "./types";
import maya from "@/data/personas/maya.json";
import rosa from "@/data/personas/rosa.json";
import keisha from "@/data/personas/keisha.json";

// Demo households. All three are fictional; places and programs are real. A visitor who signs in with a code gets
// a private copy (its own state row), so judges never change each other's month. Every copy starts with an empty
// ledger: money only moves through real PayPal sandbox calls, so nothing is pre-filled as "spent".
// The JSON next to each persona holds what was computed for her ahead of time (the checked benefits report), so a
// visitor sees it without waiting three minutes; Pal can re-run it.

export type Persona = { id: string; code: string; name: string; seed: () => Partial<State>; cached: { resources: ResourceReport | null } };

const born = (monthsAgo: number) => { const d = new Date(); d.setMonth(d.getMonth() - monthsAgo); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const now = () => new Date().toISOString();

export const PERSONAS: Persona[] = [
  {
    id: "maya", code: "MAYA-DEMO", name: "Maya",
    cached: maya as Persona["cached"],
    seed: () => ({
      budget: 380, food_lock: 120,
      profile: { name: "Maya", zip: "77036", state: "TX", household_size: 2, monthly_income: 1650, children: [{ name: "Leo", born: born(4) }], diapers_per_day: 8, formula_ml_per_day: 800, pregnant: false, on_snap: false, on_medicaid: false },
      supplies: { diapers: { qty: 70, as_of: now() }, formula: { qty: 3200, as_of: now() }, wipes: { qty: 300, as_of: now() } },
    }),
  },
  {
    id: "rosa", code: "ROSA-DEMO", name: "Rosa",
    cached: rosa as Persona["cached"],
    seed: () => ({
      budget: 450, food_lock: 160,
      profile: { name: "Rosa", zip: "43207", state: "OH", household_size: 3, monthly_income: 2100, children: [{ name: "Mateo", born: born(26) }, { name: "Baby", born: born(-2) }], diapers_per_day: 4, formula_ml_per_day: 0, pregnant: true, on_snap: true, on_medicaid: true },
      supplies: { diapers: { qty: 90, as_of: now() }, formula: { qty: 0, as_of: now() }, wipes: { qty: 0, as_of: now() } },
    }),
  },
  {
    id: "keisha", code: "KEISHA-DEMO", name: "Keisha",
    cached: keisha as Persona["cached"],
    seed: () => ({
      budget: 420, food_lock: 140,
      profile: { name: "Keisha", zip: "93702", state: "CA", household_size: 3, monthly_income: 1900, children: [{ name: "Amara", born: born(10), notes: "dairy (cow's milk protein) allergy, confirmed by her pediatrician" }, { name: "Jordan", born: born(50) }], diapers_per_day: 6, formula_ml_per_day: 0, pregnant: false, on_snap: false, on_medicaid: true },
      supplies: { diapers: { qty: 200, as_of: now() }, formula: { qty: 0, as_of: now() }, wipes: { qty: 120, as_of: now() } },
    }),
  },
];

export const personaByCode = (code: string) => PERSONAS.find((p) => p.code === code.trim().toUpperCase() || p.id === code.trim().toLowerCase());
