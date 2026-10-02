"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { BudgetBar } from "@/components/BudgetBar";
import { ChildrenCard } from "@/components/ChildrenCard";
import { Ledger } from "@/components/Ledger";
import type { ResourceReport } from "@/lib/types";

export default function Home() {
  const { t } = useLang();
  const { data } = useAppState();
  const [report, setReport] = useState<ResourceReport | null>(null);
  useEffect(() => { fetch("/api/resources", { cache: "no-store" }).then((r) => r.json()).then((j) => setReport(j.resources)); }, []);
  if (!data) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const { state, derived } = data;
  const claimable = report ? report.items.filter((i) => i.eligibility !== "unlikely").reduce((s, i) => s + i.monthly_value_estimate, 0) : null;
  const latest = [...state.plans].reverse()[0];
  const tile = (label: string, value: string, cls = "text-fg") => (
    <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
      <div className="text-xs text-muted">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 md:px-6 md:pt-8">
      <h2 className="text-2xl font-semibold tracking-tight">{t("home.hi", { name: state.profile.name || t("home.mom") })}</h2>
      <p className="text-sm text-muted">{state.month}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <BudgetBar state={state} derived={derived} onEdit={() => (window.location.href = "/me")} />
          <div className="grid grid-cols-3 gap-3">
            {tile(t("home.intercepted"), `$${derived.intercepted.toFixed(0)}`, "text-red")}
            {tile(t("home.earned"), `+$${derived.earned.toFixed(2)}`, "text-green")}
            {tile(t("home.claims"), claimable == null ? "—" : `$${claimable.toFixed(0)}`, "text-primary")}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/chat" className="flex-1 rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-white">{t("home.ask_pal")}</Link>
            <Link href="/resources" className="flex-1 rounded-full border border-primary/40 px-5 py-3 text-center text-sm font-semibold text-primary">{t("home.find_claims")}</Link>
          </div>
        </div>
        <ChildrenCard profile={state.profile} />
      </div>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs text-muted">{t("home.latest_plan")}</div>
          {latest ? (
            <Link href="/chat" className="block rounded-2xl border border-line bg-panel p-5 shadow-sm hover:border-primary">
              <div className="text-base font-medium">{latest.headline}</div>
              <div className="mt-1 text-xs text-muted">“{latest.ask}”</div>
              <div className="num mt-3 flex gap-4 text-sm"><span className="text-muted">{t("plan.asked")} ${latest.requested_total.toFixed(0)}</span><span className="text-red">−${latest.intercepted.toFixed(0)}</span><span className="font-semibold">{t("plan.pay")} ${latest.approved_total.toFixed(0)}</span></div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">{t("home.no_activity")}</div>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs text-muted">{t("home.recent")} · PayPal</div>
          <Ledger entries={state.ledger.slice(-5)} />
        </div>
      </section>
    </main>
  );
}
