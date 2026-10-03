import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { writeMonthNotes } from "@/lib/planning-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET: cached notes for this month. POST {child, lang, refresh}: write (or rewrite) them.
export async function GET() {
  const state = await loadState();
  return NextResponse.json({ notes: (state.month_notes ?? []).filter((n) => n.month === state.month) });
}

export async function POST(req: Request) {
  const { child, lang: l, refresh } = (await req.json()) as { child?: string; lang?: "en" | "zh"; refresh?: boolean };
  const lang: "en" | "zh" = l === "zh" ? "zh" : "en";
  const state = await loadState();
  const c = state.profile.children.find((x) => (x.name || "baby") === (child || "baby")) ?? state.profile.children[0];
  if (!c) return NextResponse.json({ error: "no child" }, { status: 400 });
  const key = c.name || "baby";
  const have = (state.month_notes ?? []).find((n) => n.month === state.month && n.child === key && n.lang === lang);
  if (have && !refresh) return NextResponse.json({ notes: have });
  try {
    const out = await writeMonthNotes(c, state, lang);
    const notes = { month: state.month, lang, child: key, ...out, at: new Date().toISOString() };
    state.month_notes = [...(state.month_notes ?? []).filter((n) => !(n.month === state.month && n.child === key && n.lang === lang)), notes];
    await saveState(state);
    return NextResponse.json({ notes });
  } catch (e) {
    console.error("[planning]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
