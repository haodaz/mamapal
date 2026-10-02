import { NextResponse } from "next/server";
import { loadState, saveState, newId } from "@/lib/store";
import { createPayout, paypalConfigured } from "@/lib/paypal";
import { derive } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { opportunity_id, answers } = (await req.json()) as { opportunity_id?: string; answers?: string[] };
  const state = await loadState();
  const opp = state.opportunities.find((o) => o.id === opportunity_id);
  if (!opp) return NextResponse.json({ error: "Unknown opportunity" }, { status: 404 });
  if (opp.status === "done") return NextResponse.json({ error: "Already paid out" }, { status: 409 });
  if (!answers || answers.length !== opp.n_questions) return NextResponse.json({ error: "Answer every question" }, { status: 400 });
  const receiver = process.env.PAYOUT_RECEIVER_EMAIL;
  if (!paypalConfigured() || !receiver) return NextResponse.json({ error: "PayPal sandbox / PAYOUT_RECEIVER_EMAIL not configured" }, { status: 503 });
  try {
    const res = await createPayout(receiver, opp.reward, `Survey reward: ${opp.id}`, opp.id);
    opp.status = "done";
    opp.paypal_batch_id = res.batch_header.payout_batch_id;
    state.ledger.push({
      id: newId("led"),
      ts: new Date().toISOString(),
      kind: "earn",
      amount: opp.reward,
      note: `survey ${opp.id}`,
      paypal_id: res.batch_header.payout_batch_id,
    });
    await saveState(state);
    return NextResponse.json({ opportunity: opp, batch_status: res.batch_header.batch_status, state, derived: derive(state) });
  } catch (e) {
    console.error("[earn]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
