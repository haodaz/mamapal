"use client";
import { useState } from "react";
import type { Plan, PlanItem } from "@/lib/types";
import { PayPalButton } from "./PayPalButton";
import { useLang } from "./LangProvider";

const VERDICT_CLS: Record<PlanItem["verdict"], string> = {
  buy: "text-green border-green/40 bg-green/5",
  swap: "text-amber border-amber/40 bg-amber/5",
  skip: "text-red border-red/40 bg-red/5",
  defer: "text-muted border-line bg-bg",
};

export function PlanCard({ plan, onPaid, onError }: { plan: Plan; onPaid: (r: unknown) => void; onError: (m: string) => void }) {
  const { t } = useLang();
  const paid = plan.status === "paid";
  const [comparing, setComparing] = useState(false);
  async function compare() {
    setComparing(true);
    try {
      const r = await fetch(`/api/plan/${plan.id}/compare`, { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "compare failed");
      onPaid(j); // generic "plan changed" refresh
    } catch (e) { onError((e as Error).message); } finally { setComparing(false); }
  }
  return (
    <article className={`rounded-2xl border ${paid ? "border-green/40" : "border-line"} bg-panel shadow-sm`}>
      <header className="border-b border-line px-5 py-4">
        <div className="text-xs text-muted"><span className="text-primary">{t("pillar.cut")}</span>{plan.items.length > 0 && <> · {paid ? t("plan.paid_label") : t("plan.filter_label")}</>}</div>
        <h2 className="mt-1 text-lg font-semibold leading-snug">{plan.headline}</h2>
        <p className="mt-1 text-sm text-muted">“{plan.ask}”</p>
      </header>
      <ul className="divide-y divide-line">
        {plan.items.map((it, i) => {
          const keep = it.verdict === "buy" || it.verdict === "swap";
          return (
            <li key={i} className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1 px-5 py-3">
              <span className={`num mt-0.5 h-fit rounded border px-1.5 py-0.5 text-[11px] font-semibold ${VERDICT_CLS[it.verdict]}`}>{t(`verdict.${it.verdict}` as const)}</span>
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="text-muted line-through decoration-red/60">{it.requested}</span>
                  {keep && it.buy_name && (
                    <>
                      <span className="mx-2 text-muted">→</span>
                      <span className="font-medium text-fg">{it.buy_name}</span>
                      {it.merchant && <span className="ml-2 text-xs text-muted">{it.merchant}</span>}
                    </>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted">{it.reason}</div>
                {it.offers && it.offers.length > 0 && (
                  <ul className="num mt-1.5 space-y-0.5 text-xs">
                    {it.offers.map((o, k) => (
                      <li key={k} className={k === 0 ? "text-green" : "text-muted"}>
                        {k === 0 && <span className="mr-1 rounded border border-green/40 px-1 text-[10px]">{t("compare.best")}</span>}
                        {o.url ? <a href={o.url} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2">{o.merchant}</a> : o.merchant} ${o.price.toFixed(2)}{o.note && <span className="ml-1 opacity-80">· {o.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="num text-right text-sm">
                <div className="text-muted line-through decoration-red/60">${it.requested_price.toFixed(0)}</div>
                {keep && it.buy_price != null ? <div className="text-fg">${it.buy_price.toFixed(0)}</div> : <div className="text-red">$0</div>}
              </div>
            </li>
          );
        })}
      </ul>
      <footer className="space-y-3 border-t border-line px-5 py-4">
        {plan.items.length > 0 && <div className="num flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="whitespace-nowrap text-muted">{t("plan.asked")} ${plan.requested_total.toFixed(2)}</span>
          <span className="whitespace-nowrap text-red">{t("plan.intercepted")} −${plan.intercepted.toFixed(2)}</span>
          <span className="whitespace-nowrap text-base font-semibold text-fg">{t("plan.pay")} ${plan.approved_total.toFixed(2)}</span>
        </div>}
        <p className="text-sm text-muted">{plan.note}</p>
        {!paid && plan.approved_total > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button onClick={compare} disabled={comparing} className="rounded-full border border-primary/40 px-3 py-1.5 text-primary disabled:opacity-50">{comparing ? t("compare.busy") : t("compare.button")}</button>
            {plan.compared_at && <span className="text-muted">{t("compare.done", { date: plan.compared_at.slice(0, 10) })}</span>}
          </div>
        )}
        {paid ? (
          <div className="num rounded-lg border border-green/30 bg-green/5 px-3 py-2 text-xs text-green">{t("plan.captured")} {plan.paypal_capture_id}</div>
        ) : plan.approved_total > 0 ? (
          <div>
            <div className="mb-2 text-xs text-muted">{t("plan.execute")} (${plan.approved_total.toFixed(2)})</div>
            <PayPalButton planId={plan.id} onPaid={onPaid} onError={onError} />
          </div>
        ) : plan.items.length > 0 ? (
          <div className="text-xs text-muted">{t("plan.nothing")}</div>
        ) : null}
      </footer>
    </article>
  );
}
