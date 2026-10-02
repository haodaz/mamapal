import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { createOrder, paypalConfigured } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!paypalConfigured()) return NextResponse.json({ error: "PayPal sandbox not configured" }, { status: 503 });
  const { plan_id } = (await req.json()) as { plan_id?: string };
  const state = await loadState();
  const plan = state.plans.find((p) => p.id === plan_id);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (plan.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 409 });
  const items = plan.items
    .filter((i) => (i.verdict === "buy" || i.verdict === "swap") && i.buy_name && i.buy_price)
    .map((i) => ({ name: i.buy_name!, price: i.buy_price!, description: i.merchant ? `via ${i.merchant}` : undefined }));
  if (!items.length || plan.approved_total <= 0) return NextResponse.json({ error: "Nothing to buy" }, { status: 400 });
  try {
    const order = await createOrder(items, plan.headline, plan.id);
    plan.paypal_order_id = order.id;
    await saveState(state);
    return NextResponse.json({ id: order.id });
  } catch (e) {
    console.error("[paypal/order]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
