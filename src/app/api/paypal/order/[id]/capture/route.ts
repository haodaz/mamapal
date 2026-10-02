import { NextResponse } from "next/server";
import { loadState, saveState, newId } from "@/lib/store";
import { captureOrder } from "@/lib/paypal";
import { derive } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const state = await loadState();
  const plan = state.plans.find((p) => p.paypal_order_id === id);
  if (!plan) return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  try {
    const cap = await captureOrder(id);
    const capture = cap.purchase_units?.[0]?.payments?.captures?.[0];
    if (cap.status !== "COMPLETED" || !capture) {
      return NextResponse.json({ error: `Capture not completed (${cap.status})` }, { status: 502 });
    }
    plan.status = "paid";
    plan.paypal_capture_id = capture.id;
    state.ledger.push({
      id: newId("led"),
      ts: new Date().toISOString(),
      kind: "spend",
      amount: Number(capture.amount.value),
      note: plan.items.filter((i) => i.buy_name && (i.verdict === "buy" || i.verdict === "swap")).map((i) => i.buy_name).join(", "),
      paypal_id: capture.id,
      plan_id: plan.id,
    });
    await saveState(state);
    return NextResponse.json({ plan, state, derived: derive(state) });
  } catch (e) {
    console.error("[paypal/capture]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
