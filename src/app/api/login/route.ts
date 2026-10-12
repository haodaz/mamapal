import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { freshState, loadState, saveState, ROW_COOKIE, OWNER_ROW } from "@/lib/store";
import { personaByCode } from "@/lib/personas";

// Demo sign-in. Two ways in, each with its own state row (cookie `mp_row`):
//   { code: "MAYA-DEMO" } → a private copy of that demo household, ready to use.
//   { name, email }       → a new, empty household that starts with the welcome steps.
// Boundary: this is NOT authentication. Whoever holds the cookie is the household.
export const dynamic = "force-dynamic";
const COOKIE = "mp_session";
const MONTH = 60 * 60 * 24 * 30;
const rand = () => Math.random().toString(36).slice(2, 8);

export async function POST(req: Request) {
  const { name, email, code } = (await req.json()) as { name?: string; email?: string; code?: string };
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: MONTH };

  if (code && process.env.OWNER_CODE && code.trim() === process.env.OWNER_CODE) {
    // the owner's own household: no copy, the real row
    const state = await loadState(OWNER_ROW);
    jar.set(ROW_COOKIE, OWNER_ROW, opts);
    jar.set(COOKIE, encodeURIComponent(JSON.stringify({ name: state.profile.name || "owner", at: Date.now() })), opts);
    return NextResponse.json({ ok: true, name: state.profile.name, onboarded: state.onboarded === true });
  }
  if (code) {
    const p = personaByCode(code);
    if (!p) return NextResponse.json({ error: "unknown code" }, { status: 404 });
    const row = `${p.id}-${rand()}`;
    const state = { ...freshState(), ...p.seed(), onboarded: true, resources: p.cached.resources };
    await saveState(state, row);
    jar.set(ROW_COOKIE, row, opts);
    jar.set(COOKIE, encodeURIComponent(JSON.stringify({ name: p.name, demo: p.id, at: Date.now() })), opts);
    return NextResponse.json({ ok: true, name: p.name, onboarded: true });
  }

  const n = String(name ?? "").trim().slice(0, 40);
  const e = String(email ?? "").trim().slice(0, 120);
  if (!n) return NextResponse.json({ error: "name required" }, { status: 400 });
  const row = `u-${rand()}${rand()}`;
  const state = freshState();
  state.profile = { ...state.profile, name: n };
  await saveState(state, row);
  jar.set(ROW_COOKIE, row, opts);
  jar.set(COOKIE, encodeURIComponent(JSON.stringify({ name: n, email: e, at: Date.now() })), opts);
  return NextResponse.json({ ok: true, name: n, onboarded: false });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(COOKIE);
  jar.delete(ROW_COOKIE);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return NextResponse.json({ signed_in: false });
  try {
    const s = await loadState();
    return NextResponse.json({ signed_in: true, ...JSON.parse(decodeURIComponent(raw)), household: s.profile.name });
  } catch { return NextResponse.json({ signed_in: false }); }
}
