import { NextResponse } from "next/server";
import { loadState, saveState, newId, attach } from "@/lib/store";
import { planPurchase } from "@/lib/agent";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { ask, lang, context, conversation_id } = (await req.json()) as { ask?: string; lang?: "en" | "zh"; context?: string; conversation_id?: string };
  if (!ask || !ask.trim()) return NextResponse.json({ error: "Say what you need." }, { status: 400 });
  const state = await loadState();
  try {
    const out = await planPurchase(ask.trim(), state, lang === "zh" ? "zh" : "en", typeof context === "string" ? context.slice(0, 80) : undefined);
    const plan: Plan = {
      id: newId("plan"),
      created_at: new Date().toISOString(),
      ask: ask.trim(),
      status: "proposed",
      ...out,
    };
    state.plans.push(plan);
    const cid = attach(state, conversation_id, { kind: "plan", id: plan.id }, plan.ask);
    await saveState(state);
    return NextResponse.json({ plan, conversation_id: cid });
  } catch (e) {
    console.error("[plan]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
