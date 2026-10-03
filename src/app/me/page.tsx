"use client";
import { useEffect, useState } from "react";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import dynamic from "next/dynamic";
const LedgerGrid = dynamic(() => import("@/components/LedgerGrid").then((m) => m.LedgerGrid), { ssr: false, loading: () => <div className="text-xs text-muted">…</div> });
import { monthsSince, formatAge } from "@/lib/age";
import { supplyStatus, SUPPLY_TYPES } from "@/lib/inventory";
import type { SupplyType } from "@/lib/types";
import type { Child, Profile, ResourceReport } from "@/lib/types";

export default function MePage() {
  const { t, lang, setLang } = useLang();
  const { data, refresh } = useAppState();
  const [p, setP] = useState<Profile | null>(null);
  const [budget, setBudget] = useState(400);
  const [food, setFood] = useState(100);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [report, setReport] = useState<ResourceReport | null>(null);
  const [stock, setStock] = useState<Partial<Record<SupplyType, number>>>({});
  async function saveStock() {
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplies: stock }) });
    setStock({}); refresh();
  }
  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    window.location.href = "/intro";
  }
  useEffect(() => { if (data && !p) { setP(data.state.profile); setBudget(data.state.budget); setFood(data.state.food_lock); } }, [data, p]);
  useEffect(() => { fetch("/api/resources", { cache: "no-store" }).then((r) => r.json()).then((j) => setReport(j.resources)); }, []);
  if (!data || !p) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const { state, derived } = data;

  const input = "num mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-fg";
  const upd = (k: keyof Profile, v: unknown) => setP({ ...p, [k]: v } as Profile);
  const updChild = (i: number, c: Partial<Child>) => upd("children", p.children.map((x, j) => (j === i ? { ...x, ...c } : x)));
  async function save() {
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget, food_lock: food, profile: p }) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
    setEditing(false);
    refresh();
  }
  async function reset() {
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
    refresh();
  }
  const claimable = report ? report.items.filter((i) => i.eligibility !== "unlikely").reduce((s, i) => s + i.monthly_value_estimate, 0) : null;
  const label = (k: string) => <div className="text-xs text-muted">{k}</div>;
  const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-line bg-bg p-4">{label(title)}<div className="mt-2">{children}</div></div>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 md:px-6 md:pt-8">
      <div className="text-xs text-muted"><span className="text-primary">{t("pillar.manage")}</span></div>
      <h2 className="text-2xl font-semibold tracking-tight">{state.profile.name || t("home.mom")}</h2>
      <p className="text-sm text-muted">{t("me.subtitle")}</p>

      {/* Status card: compact, edit opens the form */}
      <section className="mt-5 rounded-2xl border border-line bg-panel p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          {label(t("me.status"))}
          <button onClick={() => setEditing((v) => !v)} className="text-xs text-primary">{editing ? t("me.close") : t("me.edit")}</button>
        </div>
        {!editing && (
          <div className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div>
              {state.profile.children.map((c, i) => {
                const m = monthsSince(c.born);
                return <div key={i} className="num"><span className="font-medium">{c.name || (lang === "zh" ? "宝宝" : "Baby")}</span> · {formatAge(m, lang)}{c.notes && <span className="text-muted"> · {c.notes}</span>}</div>;
              })}
              <div className="num text-muted">{t("home.supplies", { d: state.profile.diapers_per_day, f: state.profile.formula_ml_per_day ? t("home.supplies_formula", { ml: state.profile.formula_ml_per_day }) : "" })}</div>
            </div>
            <div className="num text-muted">
              <div>{t("me.budget_line", { budget: state.budget, food: state.food_lock })}</div>
              <div>{t("me.household_line", { n: state.profile.household_size, income: state.profile.monthly_income, zip: state.profile.zip || "—", state: state.profile.state || "—" })}</div>
              <div>{claimable == null ? t("me.claims_none") : t("me.claims_line", { date: report!.generated_at.slice(0, 10), value: claimable.toFixed(0) })}</div>
            </div>
          </div>
        )}
        {editing && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Box title={t("me.children")}>
              <div className="space-y-3">
                <label className="block text-xs text-muted">{t("me.name")}<input value={p.name} onChange={(e) => upd("name", e.target.value)} className={input} /></label>
                {p.children.map((c, i) => (
                  <div key={i} className="rounded-lg border border-line bg-panel p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-muted">{t("me.child_name")}<input value={c.name} onChange={(e) => updChild(i, { name: e.target.value })} className={input} /></label>
                      <label className="text-xs text-muted">{t("me.born")}<input type="month" value={c.born} onChange={(e) => updChild(i, { born: e.target.value })} className={input} /></label>
                    </div>
                    <label className="mt-2 block text-xs text-muted">{t("me.notes")}<input value={c.notes ?? ""} placeholder={t("me.notes_hint")} onChange={(e) => updChild(i, { notes: e.target.value })} className={input} /></label>
                    {p.children.length > 1 && <div className="mt-2 text-right text-[11px]"><button onClick={() => upd("children", p.children.filter((_, j) => j !== i))} className="text-red">{t("me.remove")}</button></div>}
                  </div>
                ))}
                <button onClick={() => upd("children", [...p.children, { name: "", born: new Date().toISOString().slice(0, 7) }])} className="text-xs text-primary">{t("me.add_child")}</button>
              </div>
            </Box>
            <div className="space-y-3">
              <Box title={t("me.supplies")}>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted">{t("me.diapers_day")}<input type="number" min={0} value={p.diapers_per_day} onChange={(e) => upd("diapers_per_day", Number(e.target.value))} className={input} /></label>
                  <label className="text-xs text-muted">{t("me.formula_day")}<input type="number" min={0} step={10} value={p.formula_ml_per_day} onChange={(e) => upd("formula_ml_per_day", Number(e.target.value))} className={input} /></label>
                </div>
              </Box>
              <Box title={t("me.budget")}>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted">{t("budget.monthly")}<input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className={input} /></label>
                  <label className="text-xs text-muted">{t("budget.lock_food")}<input type="number" min={0} value={food} onChange={(e) => setFood(Number(e.target.value))} className={input} /></label>
                </div>
              </Box>
            </div>
            <Box title={t("me.household")}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="text-xs text-muted">{t("res.zip")}<input value={p.zip} onChange={(e) => upd("zip", e.target.value)} className={input} placeholder="10001" /></label>
                <label className="text-xs text-muted">{t("res.state")}<input value={p.state} onChange={(e) => upd("state", e.target.value.toUpperCase())} maxLength={2} className={input} placeholder="NY" /></label>
                <label className="text-xs text-muted">{t("res.household")}<input type="number" min={1} value={p.household_size} onChange={(e) => upd("household_size", Number(e.target.value))} className={input} /></label>
                <label className="text-xs text-muted">{t("res.income")}<input type="number" min={0} value={p.monthly_income} onChange={(e) => upd("monthly_income", Number(e.target.value))} className={input} /></label>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                {(["pregnant", "on_snap", "on_medicaid"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-1.5 text-muted"><input type="checkbox" checked={p[k]} onChange={(e) => upd(k, e.target.checked)} className="accent-primary" />{t(`res.${k}` as const)}</label>
                ))}
              </div>
            </Box>
            <Box title={t("me.language")}>
              <div className="flex gap-2">
                {(["en", "zh"] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded-full border px-4 py-1.5 text-sm ${lang === l ? "border-primary bg-primary text-white" : "border-line"}`}>{l === "en" ? "English" : "中文"}</button>)}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span>{t("me.data_note")}</span>
                <span className="flex gap-4"><button onClick={logout}>{t("me.logout")}</button><button onClick={reset} className="text-red">{t("reset")}</button></span>
              </div>
            </Box>
            <div className="flex justify-end md:col-span-2">
              <button onClick={save} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white">{saved ? t("me.saved") : t("me.save")}</button>
            </div>
          </div>
        )}
      </section>

      {/* Pantry */}
      <section id="supplies" className="mt-8 scroll-mt-20">
        <div className="mb-3 text-xs text-muted">{t("supply.title")}</div>
        <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <ul className="divide-y divide-line">
            {supplyStatus(state).map((x) => (
              <li key={x.type} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="w-16 font-medium">{t(`supply.${x.type}` as const)}</span>
                <span className={`num flex-1 ${x.low ? "text-amber" : "text-muted"}`}>{x.tracked ? `${t("supply.left", { n: x.left, unit: t(`supply.unit.${x.type}` as const) })} · ${t("supply.days", { d: x.days ?? 0 })}` : t("supply.untracked")}</span>
                <input type="number" min={0} placeholder={String(x.left)} value={stock[x.type] ?? ""} onChange={(e) => setStock({ ...stock, [x.type]: e.target.value === "" ? undefined : Number(e.target.value) })} className="num w-24 rounded-lg border border-line bg-bg px-2 py-1 text-sm" />
                <span className="text-xs text-muted">{t(`supply.unit.${x.type}` as const)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted">{t("supply.hint")}</span>
            <button onClick={saveStock} disabled={!SUPPLY_TYPES.some((k) => typeof stock[k] === "number")} className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-30">{t("supply.set")}</button>
          </div>
        </div>
      </section>

      {/* Records */}
      <section className="mt-8">
        <div className="mb-3 text-xs text-muted">{t("me.records")} · {t("me.this_month")} {state.month}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t("budget.available"), `$${derived.available.toFixed(0)}`, "text-fg"],
            [t("budget.spent"), `$${derived.spent.toFixed(2)}`, "text-red"],
            [t("home.earned"), `+$${derived.earned.toFixed(2)}`, "text-green"],
            [t("home.intercepted"), `$${derived.intercepted.toFixed(0)}`, "text-primary"],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-2xl border border-line bg-panel p-4 shadow-sm">{label(l)}<div className={`num mt-1 text-xl font-semibold ${c}`}>{v}</div></div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div>
          <div className="mb-3 text-xs text-muted"><span className="text-primary">{t("pillar.cut")}</span> · {t("me.verdicts")}</div>
          {state.plans.length ? (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-panel shadow-sm">
              {[...state.plans].reverse().map((pl) => (
                <li key={pl.id} className="px-4 py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate font-medium">{pl.headline}</span>
                    <span className={`num shrink-0 text-xs ${pl.status === "paid" ? "text-green" : "text-muted"}`}>{pl.status === "paid" ? t("me.paid") : t("me.proposed")}</span>
                  </div>
                  <div className="num mt-0.5 flex gap-3 text-xs text-muted"><span>{pl.created_at.slice(5, 10)}</span><span>${pl.requested_total.toFixed(0)} → ${pl.approved_total.toFixed(0)}</span><span className="text-red">−${pl.intercepted.toFixed(0)}</span>{pl.paypal_capture_id && <span className="truncate">{pl.paypal_capture_id}</span>}</div>
                </li>
              ))}
            </ul>
          ) : <div className="text-sm text-muted">{t("me.no_verdicts")}</div>}
        </div>
      </section>

      <section id="ledger" className="mt-8 scroll-mt-20">
        <h3 className="text-lg font-semibold tracking-tight">{t("me.ledger_motto")}</h3>
        <div className="mb-3 text-xs text-muted">{t("me.ledger_all")}</div>
        <LedgerGrid state={state} />
      </section>

      <section className="mt-8">
        <div className="mb-3 text-xs text-muted">{t("me.months")}</div>
        {state.history.length ? (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-panel shadow-sm">
            {[...state.history].reverse().map((h) => (
              <li key={h.month} className="num grid grid-cols-[auto_1fr_auto] items-baseline gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{h.month}</span>
                <span className="text-xs text-muted">{t("me.verdict_count", { n: h.plans.length })} · ${h.budget} · <span className="text-red">−${h.spent.toFixed(0)}</span> · <span className="text-green">+${h.earned.toFixed(2)}</span></span>
                <span className="text-primary">−${h.intercepted.toFixed(0)}</span>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-muted">{t("me.no_months")}</div>}
      </section>
    </main>
  );
}
