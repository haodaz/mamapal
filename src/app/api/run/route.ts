import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { newRun } from "@/lib/month-run";

export const dynamic = "force-dynamic";

// GET: the latest month run (or null). POST: start a new one. Steps then run one per POST /api/run/[id].
export async function GET() {
  const state = await loadState();
  return NextResponse.json({ run: state.runs?.at(-1) ?? null });
}

export async function POST(req: Request) {
  const { lang } = (await req.json().catch(() => ({}))) as { lang?: "en" | "zh" };
  const state = await loadState();
  const run = newRun(state, lang === "zh" ? "zh" : "en");
  state.runs = [...(state.runs ?? []), run].slice(-5);
  await saveState(state);
  return NextResponse.json({ run });
}
