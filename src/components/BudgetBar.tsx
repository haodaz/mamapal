"use client";
import type { State } from "@/lib/types";
import { useLang } from "./LangProvider";

type Derived = { spent: number; earned: number; intercepted: number; available: number };

export function BudgetBar({ state, derived, onEdit }: { state: State; derived: Derived; onEdit: () => void }) {
  const { t } = useLang();
  const total = Math.max(state.budget + derived.earned, 1);
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / total) * 100))}%`;
  const danger = derived.available < 50;
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-muted"><span className="text-primary">{t("pillar.manage")}</span> · {state.month} · {t("budget.label")}</div>
        <button onClick={onEdit} className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline">{t("budget.edit")}</button>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-1">
        <div>
          <div className={`num text-5xl font-semibold ${danger ? "text-red" : "text-fg"}`}>${derived.available.toFixed(0)}</div>
          <div className="mt-1 text-xs text-muted">{t("budget.available")}</div>
        </div>
        <div className="num mb-1 text-sm text-muted">
          <span className="text-fg">${state.budget}</span> {t("budget.total")} · <span className="text-fg">${state.food_lock}</span> {t("budget.locked")}
          {derived.earned > 0 && <> · <span className="text-green">+${derived.earned.toFixed(2)}</span> {t("budget.earned")}</>}
        </div>
      </div>
      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[#eceae4]">
        <div className="h-full bg-lock" style={{ width: pct(state.food_lock) }} />
        <div className="h-full bg-red/70" style={{ width: pct(derived.spent) }} />
        <div className={`h-full ${danger ? "bg-red" : "bg-primary"}`} style={{ width: pct(derived.available) }} />
      </div>
      <div className="num mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-lock" />{t("budget.food")} ${state.food_lock}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-red/70" />{t("budget.spent")} ${derived.spent.toFixed(2)}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-primary" />{t("budget.available")} ${derived.available.toFixed(2)}</span>
        {derived.intercepted > 0 && <span className="ml-auto text-green">{t("budget.intercepted")} ${derived.intercepted.toFixed(2)}</span>}
      </div>
    </section>
  );
}
