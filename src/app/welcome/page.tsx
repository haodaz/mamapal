"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { PalFace } from "@/components/PalFace";
import { stageFor } from "@/lib/stages";
import { monthsSince } from "@/lib/age";
import type { Child, Profile } from "@/lib/types";

const TOTAL = 5;

export default function Welcome() {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const { data } = useAppState();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile | null>(null);
  const [budget, setBudget] = useState(400);
  const [food, setFood] = useState(100);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !p) { setP(data.state.profile); setBudget(data.state.budget); setFood(data.state.food_lock); } }, [data, p]);
  if (!p) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;

  const input = "num mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-base text-fg";
  const upd = (k: keyof Profile, v: unknown) => setP({ ...p, [k]: v } as Profile);
  const updChild = (i: number, c: Partial<Child>) => upd("children", p.children.map((x, j) => (j === i ? { ...x, ...c } : x)));
  // Typical daily use for the youngest child's stage, offered as defaults on the "daily use" step.
  const youngest = p.children.reduce((a, c) => (monthsSince(c.born) < monthsSince(a.born) ? c : a), p.children[0]);
  const stage = stageFor(monthsSince(youngest.born));

  async function finish() {
    setBusy(true);
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget, food_lock: food, profile: p, onboarded: true }) });
    router.push("/");
  }
  function next() {
    if (step === 1 && p) {
      // entering "daily use": prefill from the stage when still at zero
      const cur = p;
      setP({ ...cur, diapers_per_day: cur.diapers_per_day || stage.diapersPerDay, formula_ml_per_day: cur.formula_ml_per_day || stage.formulaMlPerDay });
    }
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  }

  return (
    <main className="mx-auto max-w-lg px-5 pt-6 md:pt-12">
      <div className="flex items-center gap-3">
        <PalFace size={44} />
        <div>
          <div className="text-base font-semibold">{t("wel.title")}</div>
          <div className="text-xs text-muted">{t("wel.step", { n: step + 1, total: TOTAL })}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-1">{Array.from({ length: TOTAL }).map((_, i) => <i key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-line"}`} />)}</div>

      <section className="mt-6 rounded-2xl border border-line bg-panel p-5 shadow-sm">
        {step === 0 && (
          <>
            <h2 className="text-xl font-semibold">{t("wel.lang")}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["en", "zh"] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={`rounded-2xl border px-4 py-5 text-lg ${lang === l ? "border-primary bg-primary-soft text-primary" : "border-line"}`}>{l === "en" ? "English" : "中文"}</button>)}
            </div>
            <h2 className="mt-8 text-xl font-semibold">{t("wel.you")}</h2>
            <p className="text-sm text-muted">{t("wel.you_hint")}</p>
            <input value={p.name} onChange={(e) => upd("name", e.target.value)} className={input} />
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold">{t("wel.children")}</h2>
            <p className="text-sm text-muted">{t("wel.children_hint")}</p>
            <div className="mt-4 space-y-3">
              {p.children.map((c, i) => (
                <div key={i} className="rounded-xl border border-line bg-bg p-3">
                  <label className="block text-xs text-muted">{t("me.child_name")}<input value={c.name} onChange={(e) => updChild(i, { name: e.target.value })} className={input} /></label>
                  <label className="mt-2 block text-xs text-muted">{t("me.born")}<input type="month" value={c.born} onChange={(e) => updChild(i, { born: e.target.value })} className={input} /></label>
                  <label className="mt-2 block text-xs text-muted">{t("me.notes")}<input value={c.notes ?? ""} placeholder={t("me.notes_hint")} onChange={(e) => updChild(i, { notes: e.target.value })} className={input} /></label>
                  {p.children.length > 1 && <button onClick={() => upd("children", p.children.filter((_, j) => j !== i))} className="mt-2 text-xs text-red">{t("me.remove")}</button>}
                </div>
              ))}
              <button onClick={() => upd("children", [...p.children, { name: "", born: new Date().toISOString().slice(0, 7) }])} className="text-sm text-primary">{t("me.add_child")}</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold">{t("wel.use")}</h2>
            <p className="text-sm text-muted">{t("wel.use_hint")} ({stage.label[lang]}: {stage.diapersPerDay}/day{stage.formulaMlPerDay ? `, ${stage.formulaMlPerDay} ml` : ""})</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">{t("me.diapers_day")}<input type="number" min={0} value={p.diapers_per_day} onChange={(e) => upd("diapers_per_day", Number(e.target.value))} className={input} /></label>
              <label className="text-xs text-muted">{t("me.formula_day")}<input type="number" min={0} step={10} value={p.formula_ml_per_day} onChange={(e) => upd("formula_ml_per_day", Number(e.target.value))} className={input} /></label>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-xl font-semibold">{t("wel.money")}</h2>
            <p className="text-sm text-muted">{t("wel.money_hint")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">{t("budget.monthly")}<input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className={input} /></label>
              <label className="text-xs text-muted">{t("budget.lock_food")}<input type="number" min={0} value={food} onChange={(e) => setFood(Number(e.target.value))} className={input} /></label>
              <label className="text-xs text-muted">{t("res.household")}<input type="number" min={1} value={p.household_size} onChange={(e) => upd("household_size", Number(e.target.value))} className={input} /></label>
              <label className="text-xs text-muted">{t("res.income")}<input type="number" min={0} value={p.monthly_income} onChange={(e) => upd("monthly_income", Number(e.target.value))} className={input} /></label>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-xl font-semibold">{t("wel.where")}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">{t("res.zip")}<input value={p.zip} onChange={(e) => upd("zip", e.target.value)} className={input} placeholder="10001" /></label>
              <label className="text-xs text-muted">{t("res.state")}<input value={p.state} onChange={(e) => upd("state", e.target.value.toUpperCase())} maxLength={2} className={input} placeholder="NY" /></label>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {(["pregnant", "on_snap", "on_medicaid"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-muted"><input type="checkbox" checked={p[k]} onChange={(e) => upd(k, e.target.checked)} className="accent-primary" />{t(`res.${k}` as const)}</label>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => (step === 0 ? finish() : setStep((s) => s - 1))} className="text-sm text-muted">{step === 0 ? t("wel.skip") : t("wel.back")}</button>
        {step < TOTAL - 1 ? (
          <button onClick={next} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white">{t("wel.next")}</button>
        ) : (
          <button onClick={finish} disabled={busy} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{t("wel.done")}</button>
        )}
      </div>
    </main>
  );
}
