import { NextResponse } from "next/server";
import { loadState, saveState } from "@/lib/store";
import { verifyResources } from "@/lib/resources-agent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Re-check the saved benefits report against the live pages. No AI call, no cost: it only opens links.
export async function POST() {
  const state = await loadState();
  if (!state.resources) return NextResponse.json({ error: "No report yet" }, { status: 404 });
  state.resources.items = await verifyResources(state.resources.items);
  state.resources.checked_at = new Date().toISOString();
  await saveState(state);
  return NextResponse.json({ profile: state.profile, resources: state.resources });
}
