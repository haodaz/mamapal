"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLang } from "./LangProvider";
import { PalFace } from "./PalFace";
import { PlanCard } from "./PlanCard";
import { contextLine, type PalContext } from "@/lib/context";
import type { Plan } from "@/lib/types";

// Desktop: the conversation as a side panel over the current page. Pal knows which page it was opened from.
export function PalDrawer({ ctx, kid, onClose }: { ctx: PalContext | null; kid: string; onClose: () => void }) {
  const { t, lang } = useLang();
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<{ ask: string; plan: Plan }[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { box.current?.focus(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [thread.length, busy]);
  const vars = { name: kid, item: ctx?.item ?? "" };
  const screen = ctx?.screen ?? "home";
  const intro = ctx ? t(`ctx.${screen}.intro` as const, vars) : "";
  const chips = ctx ? [t(`ctx.${screen}.q1` as const, vars), t(`ctx.${screen}.q2` as const, vars), t(`ctx.${screen}.q3` as const, vars)] : [];

  async function submit(text = ask) {
    if (!text.trim() || busy) return;
    const q = text.trim();
    setBusy(true); setError(null); setAsk("");
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ask: q, lang, context: contextLine(ctx) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      setThread((th) => [...th, { ask: q, plan: j.plan }]);
    } catch (e) { setError((e as Error).message); setAsk(q); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 hidden md:block">
      <div className="absolute inset-0 bg-fg/10" onClick={onClose} />
      <aside className="absolute bottom-0 right-0 top-0 flex w-[440px] flex-col border-l border-line bg-bg shadow-2xl">
        <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium"><PalFace size={26} />{t("chat.title")}</div>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-bg hover:text-fg"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {intro && (
            <div className="flex items-end gap-2"><PalFace size={24} className="mb-1" /><div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-primary/30 bg-primary-soft/60 px-3.5 py-2 text-sm leading-relaxed">{intro}</div></div>
          )}
          {thread.map(({ ask: a, plan }) => (
            <div key={plan.id} className="space-y-2">
              <div className="flex justify-end"><div className="max-w-[88%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-white">{a}</div></div>
              <PlanCard plan={plan} onPaid={() => {}} onError={(m) => setError(m)} />
            </div>
          ))}
          {busy && <div className="flex items-end gap-2"><PalFace size={24} className="mb-1" /><span className="typing rounded-2xl rounded-bl-sm border border-line bg-panel px-3 py-2"><i /><i /><i /></span></div>}
          {error && <div className="rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
          <div ref={end} />
        </div>
        <div className="border-t border-line bg-panel px-4 py-3">
          {chips.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{chips.map((q) => <button key={q} onClick={() => submit(q)} className="rounded-full border border-primary/40 bg-primary-soft/60 px-2.5 py-1 text-xs text-primary hover:bg-primary-soft">{q}</button>)}</div>}
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg p-1.5">
            <textarea ref={box} value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={1} placeholder={t("pal.placeholder")} className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm placeholder:text-muted" />
            <button onClick={() => submit()} disabled={busy || !ask.trim()} className="rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-30">{t("pal.send")}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
