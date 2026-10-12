"use client";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { PalFigure } from "@/components/PalFace";
import { Logo } from "@/components/Logo";
import { PERSONA_CARDS } from "@/lib/persona-cards";

export default function Login() {
  const { t, lang } = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function go(body: Record<string, string>, key: string) {
    if (busy) return;
    setBusy(key); setError(null);
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      // a full load, so nothing fetched before sign-in stays on screen
      window.location.assign(j.onboarded ? "/" : "/welcome");
    } catch (e) { setError((e as Error).message); setBusy(null); }
  }
  const input = "mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base";
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-5 py-10">
      <Logo size="lg" href="/intro" />
      <PalFigure pose="wave" width={130} className="mt-4" />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("login.demo")}</h1>
      <p className="mt-1 text-center text-sm text-muted">{t("login.demo_sub")}</p>

      <ul className="mt-6 grid w-full gap-3 md:grid-cols-3">
        {PERSONA_CARDS.map((p) => (
          <li key={p.id}>
            <button onClick={() => go({ code: p.code }, p.id)} disabled={!!busy} className="flex h-full w-full flex-col rounded-2xl border border-line bg-panel p-4 text-left shadow-sm transition hover:border-primary disabled:opacity-60">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-semibold">{p.name}</span>
                <span className="num rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">{p.code}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" />{p.place} · {p.kids}</div>
              <p className="mt-2 flex-1 text-sm leading-relaxed">{p.blurb[lang]}</p>
              <span className="mt-3 w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">{busy === p.id ? "…" : t("login.demo_go")}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid w-full gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold">{t("login.own")}</h2>
          <p className="text-xs text-muted">{t("login.own_sub")}</p>
          <div className="mt-3 space-y-3">
            <label className="block text-xs text-muted">{t("login.name")}<input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && go({ name, email }, "own")} className={input} /></label>
            <label className="block text-xs text-muted">{t("login.email")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && go({ name, email }, "own")} className={input} /></label>
            <button onClick={() => go({ name, email }, "own")} disabled={!name.trim() || !!busy} className="w-full rounded-full border border-primary py-2.5 text-sm font-semibold text-primary disabled:opacity-40">{busy === "own" ? "…" : t("login.go")}</button>
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold">{t("login.code")}</h2>
          <p className="text-xs text-muted">MAYA-DEMO · ROSA-DEMO · KEISHA-DEMO</p>
          <div className="mt-3 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && code.trim() && go({ code }, "code")} className={`${input} mt-0 uppercase`} />
            <button onClick={() => go({ code }, "code")} disabled={!code.trim() || !!busy} className="shrink-0 rounded-full border border-primary px-5 text-sm font-semibold text-primary disabled:opacity-40">{busy === "code" ? "…" : t("login.go")}</button>
          </div>
        </section>
      </div>
      {error && <div className="mt-4 w-full rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
    </main>
  );
}
