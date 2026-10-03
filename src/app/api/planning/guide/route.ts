import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { writeGuide } from "@/lib/planning-agent";
import { childNeeds } from "@/lib/stages";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST {child, label_en, lang}: the guide for one need, cached by stage + item + language.
export async function POST(req: Request) {
  const { child, label_en, lang: l } = (await req.json()) as { child?: string; label_en?: string; lang?: "en" | "zh" };
  const lang: "en" | "zh" = l === "zh" ? "zh" : "en";
  const state = await loadState();
  const c = state.profile.children.find((x) => (x.name || "baby") === (child || "baby")) ?? state.profile.children[0];
  if (!c || !label_en) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { stage, needs } = childNeeds(c, state.profile);
  const need = needs.find((n) => n.label.en === label_en);
  if (!need) return NextResponse.json({ error: "unknown item" }, { status: 404 });
  const key = `${stage.key}|${label_en}|${lang}`;
  const have = state.knowledge?.[key];
  if (have) return NextResponse.json({ guide: have, cached: true });
  try {
    const out = await writeGuide(c, need, state, lang);
    const guide = { ...out, at: new Date().toISOString() };
    state.knowledge = { ...(state.knowledge ?? {}), [key]: guide };
    await saveState(state);
    return NextResponse.json({ guide });
  } catch (e) {
    console.error("[guide]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
