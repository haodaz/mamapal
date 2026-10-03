"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LangProvider";
import { PalFigure } from "@/components/PalFace";

export default function Login() {
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    if (!name.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      router.push(j.onboarded ? "/" : "/welcome");
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  const input = "mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base";
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center px-5">
      <PalFigure pose="wave" width={150} />
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
      <p className="mt-1 text-center text-sm text-muted">{t("login.sub")}</p>
      <div className="mt-6 w-full space-y-3">
        <label className="block text-xs text-muted">{t("login.name")}<input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} className={input} autoFocus /></label>
        <label className="block text-xs text-muted">{t("login.email")}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} className={input} /></label>
        {error && <div className="rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
        <button onClick={go} disabled={!name.trim() || busy} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-40">{t("login.go")}</button>
      </div>
    </main>
  );
}
