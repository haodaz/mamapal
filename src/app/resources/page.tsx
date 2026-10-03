"use client";
import { AskPalBar } from "@/components/AskPalBar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { monthsSince, formatAge } from "@/lib/age";
import type { Profile, Resource, ResourceReport } from "@/lib/types";
import { useLang } from "@/components/LangProvider";

const ELIG = {
  likely: "border-green/40 bg-green/5 text-green",
  maybe: "border-amber/40 bg-amber/5 text-amber",
  unlikely: "border-line bg-bg text-muted",
} as const;

export default function ResourcesPage() {
  const { t, lang } = useLang();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [report, setReport] = useState<ResourceReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/resources", { cache: "no-store" }).then((r) => r.json()).then((j) => { setProfile(j.profile); setReport(j.resources); });
  }, []);

  async function run() {
    if (!profile || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/resources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      setReport(j.resources);
      setProfile(j.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const total = report ? report.items.filter((i) => i.eligibility !== "unlikely").reduce((s, i) => s + i.monthly_value_estimate, 0) : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4 md:px-6 md:pt-8">
      <div className="text-xs text-muted"><span className="text-primary">{t("pillar.claim")}</span></div>
      <AskPalBar name={profile.children[0]?.name || "the baby"} />
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("res.title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("res.subtitle")}</p>

      <section className="mt-5 rounded-2xl border border-line bg-panel p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-xs text-muted">{t("res.profile")}</div>
          <Link href="/me" className="text-xs text-primary">{t("res.edit")}</Link>
        </div>
        <p className="num mt-2 text-sm">{t("res.profile_line", { zip: profile.zip || "—", state: profile.state || "—", n: profile.household_size, income: profile.monthly_income, children: profile.children.map((c) => formatAge(monthsSince(c.born), lang)).join(", ") })}</p>
        <button onClick={run} disabled={busy} className="mt-4 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? t("res.finding") : t("res.find")}
        </button>
        {error && <div className="mt-2 rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
      </section>

      {!report && !busy && <p className="mt-6 text-sm text-muted">{t("res.empty")}</p>}

      {report && (
        <>
          <section className="mt-6 rounded-2xl border border-primary/30 bg-primary-soft p-5">
            <div className="flex items-baseline justify-between gap-4">
              <div className="text-xs text-muted">{t("res.potential")}</div>
              <div className="num text-3xl font-semibold text-primary">${total.toFixed(0)}</div>
            </div>
            <div className="mt-2 text-xs text-muted">{t("res.summary")}</div>
            <p className="mt-1 text-sm">{report.summary}</p>
          </section>

          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {report.items.map((r: Resource) => {
              const isOpen = open === r.id;
              return (
                <li key={r.id} className="rounded-2xl border border-line bg-panel shadow-sm">
                  <button onClick={() => setOpen(isOpen ? null : r.id)} className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-4 text-left">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`num rounded border px-1.5 py-0.5 text-[11px] font-semibold ${ELIG[r.eligibility]}`}>{t(`res.${r.eligibility}` as const)}</span>
                        <span className="text-[11px] text-muted">{t(`cat.${r.category}` as const)} · {t(`scope.${r.scope}` as const)}</span>
                      </div>
                      <div className="mt-1 text-base font-medium">{r.name}</div>
                      <div className="mt-0.5 text-xs text-muted">{r.why}</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-sm font-semibold text-fg">{r.monthly_value_estimate > 0 ? `$${r.monthly_value_estimate.toFixed(0)}/mo` : ""}</div>
                      <div className="max-w-[9rem] text-[11px] text-muted">{r.value}</div>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-line px-5 py-4 text-sm">
                      <div className="text-xs text-muted">{t("res.how")}</div>
                      <ol className="mt-1.5 list-decimal space-y-1 pl-5">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                      {r.documents.length > 0 && (
                        <>
                          <div className="mt-3 text-xs text-muted">{t("res.documents")}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">{r.documents.map((d, i) => <span key={i} className="rounded-full border border-line bg-bg px-2.5 py-0.5 text-xs">{d}</span>)}</div>
                        </>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        {r.apply_url && <a href={r.apply_url} target="_blank" rel="noreferrer" className="rounded-full bg-primary px-3 py-1.5 font-medium text-white">{t("res.apply")} ↗</a>}
                        {r.phone && <a href={`tel:${r.phone}`} className="rounded-full border border-line px-3 py-1.5">{t("res.call")} {r.phone}</a>}
                      </div>
                      {r.verify_note && <p className="mt-3 text-xs text-amber">{r.verify_note}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[11px] text-muted">{t("res.verify", { date: report.generated_at.slice(0, 10) })}</p>
        </>
      )}
    </main>
  );
}
