"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { PlanCard } from "@/components/PlanCard";
import { EXAMPLES } from "@/lib/i18n";

export default function ChatPage() {
  const { t, lang } = useLang();
  const { data, refresh } = useAppState();
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const count = data?.state.plans.length ?? 0;
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [count, busy]);
  const onMoney = useCallback(() => refresh(), [refresh]);
  const onError = useCallback((m: string) => setError(m), []);

  async function submit(text = ask) {
    if (!text.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ask: text, lang }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Planning failed");
      setAsk("");
      await refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!data) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const plans = data.state.plans;
  return (
    <main className="mx-auto max-w-3xl px-4 pt-2 md:px-6 md:pt-8">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs text-muted"><span className="text-primary">{t("pillar.cut")}</span></div>
          <h2 className="text-xl font-semibold tracking-tight">{t("chat.title")}</h2>
          <p className="text-xs text-muted">{t("chat.subtitle")}</p>
        </div>
        <Link href="/" className="text-xs text-muted md:hidden">{t("chat.back")}</Link>
      </div>

      <div className="mt-4 space-y-5 pb-48">
        {!plans.length && <p className="text-sm text-muted">{t("chat.empty")}</p>}
        {plans.map((p) => (
          <div key={p.id} className="space-y-2">
            <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white">{p.ask}</div></div>
            <PlanCard plan={p} onPaid={onMoney} onError={onError} />
          </div>
        ))}
        {busy && <div className="text-sm text-muted">{t("composer.busy")}</div>}
        {error && <div className="rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
        <div ref={bottom} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:bottom-0">
        <div className="mx-auto max-w-3xl px-4 py-3 md:px-6">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {EXAMPLES[lang].map((ex, i) => <button key={i} onClick={() => setAsk(ex)} className="rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] text-muted hover:border-primary hover:text-fg">{t("composer.example")} {i + 1}</button>)}
          </div>
          <div className="flex items-end gap-2">
            <textarea value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={2} placeholder={t("composer.placeholder")} className="flex-1 resize-none rounded-2xl border border-line bg-panel px-4 py-2.5 text-sm shadow-sm placeholder:text-muted focus:border-primary" />
            <button onClick={() => submit()} disabled={busy || !ask.trim()} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-30">{busy ? t("composer.busy") : t("composer.filter")}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
