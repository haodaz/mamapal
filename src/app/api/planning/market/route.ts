import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { lookupMarket } from "@/lib/planning-agent";
import { childNeeds } from "@/lib/stages";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST {child, id, lang, refresh}: brands and prices for one item; cached by stage + id + language until refreshed.
export async function POST(req: Request) {
  const { child, id, lang: l, refresh } = (await req.json()) as { child?: string; id?: string; lang?: "en" | "zh"; refresh?: boolean };
  const lang: "en" | "zh" = l === "zh" ? "zh" : "en";
  const state = await loadState();
  const c = state.profile.children.find((x) => (x.name || "baby") === (child || "baby")) ?? state.profile.children[0];
  if (!c || !id) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { stage, needs } = childNeeds(c, state.profile, state.owned ?? []);
  const need = needs.find((n) => n.id === id);
  if (!need) return NextResponse.json({ error: "unknown item" }, { status: 404 });
  const key = `${stage.key}|${id}|${lang}`;
  const have = state.market?.[key];
  if (have && !refresh) return NextResponse.json({ market: have, cached: true });
  try {
    const out = await lookupMarket(c, need, state, lang);
    const market = { ...out, at: new Date().toISOString() };
    state.market = { ...(state.market ?? {}), [key]: market };
    await saveState(state);
    return NextResponse.json({ market });
  } catch (e) {
    console.error("[market]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
