import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { comparePrices } from "@/lib/compare-agent";
import { derive, round } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const state = await loadState();
  const plan = state.plans.find((p) => p.id === id);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (plan.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 409 });
  try {
    const results = await comparePrices(plan, state.profile.zip);
    for (const r of results) {
      const it = plan.items[r.index];
      if (!it) continue;
      it.offers = r.offers;
      const best = r.offers[0];
      if (best && it.buy_price != null && best.price < it.buy_price) {
        it.buy_price = round(best.price);
        it.merchant = best.merchant;
      }
    }
    // money is recomputed server-side, never trusted from the model
    const d = derive(state);
    plan.approved_total = round(plan.items.filter((i) => (i.verdict === "buy" || i.verdict === "swap") && i.buy_price).reduce((s, i) => s + (i.buy_price ?? 0), 0));
    plan.intercepted = round(plan.requested_total - plan.approved_total);
    plan.remaining_after = round(d.available - plan.approved_total);
    plan.compared_at = new Date().toISOString();
    await saveState(state);
    return NextResponse.json({ plan });
  } catch (e) {
    console.error("[compare]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
