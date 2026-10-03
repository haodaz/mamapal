"use client";
import { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { AskPalBar } from "@/components/AskPalBar";
import { BabyAvatar } from "@/components/BabyAvatar";
import { PlanNeeds } from "@/components/PlanNeeds";
import { PantryCard } from "@/components/PantryCard";
import { PalFace } from "@/components/PalFace";
import { stageFor } from "@/lib/stages";
import { monthsSince, formatAge } from "@/lib/age";
import type { MonthNotes } from "@/lib/types";

export default function PlanPage() {
  const { t, lang } = useLang();
  const { data, refresh } = useAppState();
  const [notes, setNotes] = useState<MonthNotes | null>(null);
  const [busy, setBusy] = useState(false);
  const child = data?.state.profile.children[0];
  const key = child?.name || "baby";
  useEffect(() => {
    if (!data) return;
    fetch("/api/planning", { cache: "no-store" }).then((r) => r.json()).then((j) => setNotes((j.notes as MonthNotes[]).find((n) => n.child === key && n.lang === lang) ?? null));
  }, [data, key, lang]);
  async function write(refreshNotes = false) {
    setBusy(true);
    try {
      const r = await fetch("/api/planning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ child: key, lang, refresh: refreshNotes }) });
      const j = await r.json();
      if (r.ok) setNotes(j.notes);
    } finally { setBusy(false); }
  }
  if (!data || !child) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const { state } = data;
  const months = monthsSince(child.born);
  const stage = stageFor(months);
  const name = child.name || (lang === "zh" ? "宝宝" : "Baby");

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 md:px-6 md:pt-8">
      <AskPalBar from="plan" name={name} />
      <div className="flex items-center gap-4">
        <BabyAvatar child={child} size={56} />
        <div>
          <div className="text-xs text-muted"><span className="text-primary">{t("pillar.manage")}</span></div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("plan.title", { name })}</h2>
          <div className="num text-sm text-muted">{formatAge(months, lang)} · {stage.label[lang]}</div>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("plan.sub")}</p>

      {/* Pal's notes */}
      <section className="mt-5 rounded-2xl border border-primary/20 bg-primary-soft/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium"><PalFace size={24} />{t("plan.notes")}</div>
          {notes && <button onClick={() => write(true)} disabled={busy} className="flex items-center gap-1 text-xs text-primary disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />{busy ? t("plan.writing") : t("plan.refresh")}</button>}
        </div>
        {notes ? (
          <div className="mt-3 grid gap-4 md:grid-cols-[2fr_1fr]">
            <div>
              <div className="text-[11px] text-muted">{t("plan.focus")}</div>
              <ul className="mt-1 space-y-1.5">{notes.focus.map((f, i) => <li key={i} className="flex gap-2 text-[15px]"><Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />{f}</li>)}</ul>
            </div>
            <div className="rounded-xl bg-panel p-3"><div className="text-[11px] text-muted">{t("plan.next")}</div><p className="mt-1 text-sm leading-relaxed">{notes.next}</p></div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3 text-sm text-muted">{busy ? t("plan.writing") : t("plan.none")}{!busy && <button onClick={() => write(false)} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">{t("plan.write")}</button>}</div>
        )}
      </section>

      <section className="mt-5"><PlanNeeds child={child} profile={state.profile} owned={state.owned ?? []} tierNotes={notes?.tier_notes} onOwned={async (id, value) => { await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owned: { id, value } }) }); refresh(); }} /></section>

      <section id="pantry" className="mt-6 scroll-mt-20 md:max-w-md"><PantryCard state={state} onSaved={refresh} /></section>
    </main>
  );
}
