"use client";
import { AskPalBar } from "@/components/AskPalBar";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { BudgetBar } from "@/components/BudgetBar";
import { PlanCard } from "@/components/PlanCard";
import { EarnCard } from "@/components/EarnCard";
import { Ledger } from "@/components/Ledger";

export default function BudgetPage() {
  const { t } = useLang();
  const { data, refresh } = useAppState();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const onMoney = useCallback(async () => { await refresh(); setFlash((f) => f + 1); }, [refresh]);
  const onError = useCallback((m: string) => setError(m), []);
  if (!data) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const { state, derived } = data;
  const plans = [...state.plans].reverse();
  const input = "num mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-fg";
  async function saveBudget(form: FormData) {
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget: Number(form.get("budget")), food_lock: Number(form.get("food_lock")) }) });
    setEditing(false);
    refresh();
  }
  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 md:px-6 md:pt-8">
      <AskPalBar from="budget" name={state.profile.children[0]?.name || "the baby"} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div key={flash} className={flash ? "flash rounded-2xl" : ""}><BudgetBar state={state} derived={derived} onEdit={() => setEditing((v) => !v)} /></div>
          {editing && (
            <form action={saveBudget} className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-panel p-4 text-sm shadow-sm">
              <label className="text-xs text-muted">{t("budget.monthly")}<input name="budget" type="number" defaultValue={state.budget} className={input} /></label>
              <label className="text-xs text-muted">{t("budget.lock_food")}<input name="food_lock" type="number" defaultValue={state.food_lock} className={input} /></label>
              <button className="col-span-2 rounded-full bg-primary py-2 text-sm font-semibold text-white">{t("budget.lock_it")}</button>
            </form>
          )}
          {error && <div className="rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
          <div>
            <div className="mb-2 text-xs text-muted"><span className="text-primary">{t("pillar.cut")}</span> · {t("budget.plans")}</div>
            {plans.length ? <div className="space-y-4">{plans.map((p) => <PlanCard key={p.id} plan={p} onPaid={onMoney} onError={onError} />)}</div> : <div className="text-sm text-muted">{t("budget.no_plans")}</div>}
          </div>
          <div>
            <div className="mb-2 flex items-baseline justify-between text-xs text-muted"><span>{t("ledger.section")}</span><Link href="/me#ledger" className="text-primary">{t("pal.card.details")} →</Link></div>
            <Ledger entries={state.ledger} />
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs text-muted"><span className="text-primary">{t("pillar.claim")}</span> · {t("earn.section")}</div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            {state.opportunities.map((o) => <EarnCard key={o.id} opp={o} onDone={onMoney} onError={onError} />)}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted">{t("footer.boundary")}{!data.paypal_configured && <span className="text-amber"> {t("footer.not_configured")}</span>}</p>
        </div>
      </div>
    </main>
  );
}
