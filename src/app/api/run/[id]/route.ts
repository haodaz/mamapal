import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { advance, resume } from "@/lib/month-run";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // the price step searches the web; one step per request keeps each call short

// Run the next step of a month run and save. The client calls this until status is "done" or "failed".
// { retry: true } re-opens a failed step; everything finished before it is kept (checkpointed).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { retry } = (await req.json().catch(() => ({}))) as { retry?: boolean };
  const state = await loadState();
  const run = state.runs?.find((r) => r.id === id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  if (retry) resume(run);
  if (run.status !== "running") return NextResponse.json({ run });
  await advance(state, run);
  await saveState(state);
  return NextResponse.json({ run, plan: run.plan_id ? state.plans.find((p) => p.id === run.plan_id) ?? null : null });
}
