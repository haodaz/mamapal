import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loadState, saveState } from "@/lib/store";

// Mock sign-in for the demo: a cookie that says who is here. No password, no accounts, one shared state.
// Boundary: this is NOT authentication. Real accounts need per-user rows and a provider.
export const dynamic = "force-dynamic";
const COOKIE = "mp_session";

export async function POST(req: Request) {
  const { name, email } = (await req.json()) as { name?: string; email?: string };
  const n = String(name ?? "").trim().slice(0, 40);
  const e = String(email ?? "").trim().slice(0, 120);
  if (!n) return NextResponse.json({ error: "name required" }, { status: 400 });
  const jar = await cookies();
  jar.set(COOKIE, encodeURIComponent(JSON.stringify({ name: n, email: e, at: Date.now() })), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  const state = await loadState();
  if (!state.profile.name) { state.profile.name = n; await saveState(state); }
  return NextResponse.json({ ok: true, name: n, onboarded: state.onboarded === true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(COOKIE);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return NextResponse.json({ signed_in: false });
  try { return NextResponse.json({ signed_in: true, ...JSON.parse(decodeURIComponent(raw)) }); } catch { return NextResponse.json({ signed_in: false }); }
}
