"use client";
import { useCallback, useRef } from "react";
import { Check, Loader2, X, Circle } from "lucide-react";
import type { MonthRun, Plan, RunStep } from "@/lib/types";
import type { Key } from "@/lib/i18n";
import { useLang } from "./LangProvider";
import { PlanCard } from "./PlanCard";

// Keeps a month run going: asks the server for the next step until the run is done or a step fails.
// Lives with the conversation (not the panel), so closing the panel never stops the run.
export function useRunDriver(onUpdate: (run: MonthRun, planReady: boolean) => void, onError: (m: string) => void) {
  const driving = useRef(new Set<string>());
  const upd = useRef(onUpdate); upd.current = onUpdate;
  const err = useRef(onError); err.current = onError;
  return useCallback(async (start: MonthRun, retry = false) => {
    if (driving.current.has(start.id)) return;
    driving.current.add(start.id);
    try {
      let cur = start, first = true;
      while (cur.status === "running" || (retry && first)) {
        const r = await fetch(`/api/run/${cur.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ retry: retry && first }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "run failed");
        cur = j.run; first = false;
        upd.current(cur, !!j.plan);
      }
    } catch (e) { err.current((e as Error).message); } finally { driving.current.delete(start.id); }
  }, []);
}

// The run's steps as they light up, then the cart under them. Display only; useRunDriver moves it forward.
export function RunCard({ run, plans, onChange, onError, onRetry }: { run: MonthRun; plans: Plan[]; onChange: () => void; onError: (m: string) => void; onRetry: () => void }) {
  const { t } = useLang();
  const drive = (_retry: boolean) => onRetry();

  const label = (s: RunStep) => t(`run.step.${s.key}${s.attempt > 0 && s.key !== "stock" && s.key !== "cart" ? "_rev" : ""}` as Key);
  const plan = run.plan_id ? plans.find((p) => p.id === run.plan_id) : undefined;
  const secs = Math.round(run.steps.reduce((a, s) => a + (s.ms ?? 0), 0) / 1000);
  const nextPending = run.steps.find((s) => s.status === "pending");
  return (
    <div className="space-y-3">
      <article className="rounded-2xl rounded-tl-sm border border-line bg-panel shadow-sm">
        <header className="border-b border-line px-5 py-4">
          <div className="text-xs text-muted"><span className="text-primary">{t("pillar.manage")}</span> · {t("run.title")}</div>
          <h2 className="mt-1 text-lg font-semibold leading-snug">{run.goal}</h2>
          <p className="mt-1 text-sm text-muted">{t("run.lead")}</p>
        </header>
        <ol className="px-5 py-3">
          {run.steps.map((s, i) => {
            const active = s.status === "running" || (run.status === "running" && s === nextPending);
            return (
              <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                {i < run.steps.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px bg-line" />}
                <span className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${s.status === "done" ? "border-green/40 bg-green/10 text-green" : s.status === "failed" ? "border-red/40 bg-red/10 text-red" : active ? "border-primary/40 bg-primary-soft text-primary" : "border-line bg-bg text-muted"}`}>
                  {s.status === "done" ? <Check className="h-3.5 w-3.5" /> : s.status === "failed" ? <X className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-2 w-2" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={`text-sm font-medium ${s.status === "pending" && !active ? "text-muted" : ""}`}>{label(s)}</span>
                    {s.status === "done" && s.ms != null && <span className="num text-[11px] text-muted">{t("run.meta", { s: (s.ms / 1000).toFixed(1), searches: s.usage?.searches ?? 0, cost: (s.usage?.cost ?? 0).toFixed(3) })}</span>}
                  </div>
                  {s.summary && <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.summary}</p>}
                  {s.notes && s.notes.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber">{s.notes.map((n, k) => <li key={k}>{n}</li>)}</ul>}
                  {active && !s.summary && <p className="mt-0.5 text-sm text-muted">{t("run.working")}</p>}
                  {s.status === "failed" && (
                    <div className="mt-1 space-y-1.5">
                      <p className="text-xs text-red">{t("run.failed")} {s.error}</p>
                      <button onClick={() => drive(true)} className="rounded-full border border-primary/40 px-3 py-1 text-xs text-primary">{t("run.retry")}</button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {run.stock && run.steps[0].status === "done" && (
          <ul className="mx-5 mb-3 space-y-0.5 rounded-xl bg-bg px-3 py-2 text-xs text-muted">{run.stock.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        )}
        {run.status === "done" && <footer className="num border-t border-line px-5 py-2.5 text-[11px] text-muted">{t("run.total", { s: secs, cost: (run.total_cost ?? 0).toFixed(3) })}</footer>}
      </article>
      {plan && <PlanCard plan={plan} onPaid={onChange} onError={onError} />}
    </div>
  );
}
