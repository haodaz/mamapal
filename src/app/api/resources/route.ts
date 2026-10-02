import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { findResources } from "@/lib/resources-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET() {
  const state = await loadState();
  return NextResponse.json({ profile: state.profile, resources: state.resources });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { lang?: "en" | "zh" };
  const state = await loadState();
  const lang = body.lang === "zh" ? "zh" : "en";
  try {
    const out = await findResources(state.profile, lang);
    state.resources = { generated_at: new Date().toISOString(), lang, profile: state.profile, ...out };
    await saveState(state);
    return NextResponse.json({ profile: state.profile, resources: state.resources });
  } catch (e) {
    console.error("[resources]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
