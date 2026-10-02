"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { PalFace } from "@/components/PalFace";
import { NeedsCard } from "@/components/NeedsCard";
import { childNeeds } from "@/lib/stages";
import { monthsSince, formatAge } from "@/lib/age";
import type { ResourceReport } from "@/lib/types";

export default function Home() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { data } = useAppState();
  const [report, setReport] = useState<ResourceReport | null>(null);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { fetch("/api/resources", { cache: "no-store" }).then((r) => r.json()).then((j) => setReport(j.resources)); }, []);
  useEffect(() => { if (data && data.state.onboarded === false) router.replace("/welcome"); }, [data, router]);
  if (!data) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const { state, derived } = data;
  const mom = state.profile.name ? `, ${state.profile.name}` : "";
  const kids = state.profile.children;
  const first = kids[0];
  const kidName = first?.name || (lang === "zh" ? "宝宝" : "Baby");
  const needsTotal = kids.reduce((s, c) => s + childNeeds(c, state.profile).total, 0);
  const claimable = report ? report.items.filter((i) => i.eligibility !== "unlikely").reduce((s, i) => s + i.monthly_value_estimate, 0) : null;
  const latest = [...state.plans].reverse()[0];
  const money = (n: number) => `$${n.toFixed(0)}`;

  const line = [
    t("pal.line.money", { available: money(derived.available) }),
    first ? t("pal.line.child", { name: kidName, age: formatAge(monthsSince(first.born), lang), needs: money(needsTotal) }) : "",
    claimable != null ? t("pal.line.claims", { claims: money(claimable) }) : t("pal.line.claims_none"),
  ].filter(Boolean).join(lang === "zh" ? "" : " ");

  async function submit() {
    if (!ask.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ask, lang }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      router.push("/chat");
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  const chip = "rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-fg shadow-sm hover:border-primary hover:text-primary";
  const Card = ({ children, href, label }: { children: React.ReactNode; href?: string; label?: string }) => (
    <div className="flex items-start gap-3">
      <PalFace size={32} className="mt-1 shrink-0" />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-line bg-panel p-4 shadow-sm">
        {children}
        {href && <Link href={href} className="mt-3 inline-block text-xs text-primary">{label ?? t("pal.card.open")} →</Link>}
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 md:pt-12">
      <section className="flex flex-col items-center text-center">
        <PalFace size={96} />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("pal.hello", { name: mom })}</h1>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-fg/80">{line}</p>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex flex-wrap justify-center gap-2">
          <button onClick={() => box.current?.focus()} className={chip}>{t("pal.topic.buy")}</button>
          <Link href="/resources" className={chip}>{t("pal.topic.claim")}</Link>
          <a href="#needs" className={chip}>{t("pal.topic.month", { name: kidName })}</a>
          <Link href="/budget" className={chip}>{t("pal.topic.budget")}</Link>
        </div>
        <div className="flex items-end gap-2 rounded-3xl border border-line bg-panel p-2 shadow-sm">
          <textarea ref={box} value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={2} placeholder={t("pal.placeholder")} className="flex-1 resize-none bg-transparent px-3 py-2 text-[15px] placeholder:text-muted" />
          <button onClick={submit} disabled={busy || !ask.trim()} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-30">{busy ? t("composer.busy") : t("pal.send")}</button>
        </div>
        {error && <div className="mt-2 rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
      </section>

      <section className="mt-8 space-y-4">
        <Card href="/budget">
          <div className="text-sm font-medium">{t("pal.card.money")}</div>
          <div className="num mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-3xl font-semibold">{money(derived.available)}</span>
            <span className="text-xs text-muted">{t("pal.status", { available: money(derived.available), budget: money(state.budget), spent: money(derived.spent), earned: money(derived.earned) })}</span>
          </div>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-[#eceef5]">
            <div className="h-full bg-lock" style={{ width: `${(state.food_lock / Math.max(state.budget + derived.earned, 1)) * 100}%` }} />
            <div className="h-full bg-red/70" style={{ width: `${(derived.spent / Math.max(state.budget + derived.earned, 1)) * 100}%` }} />
            <div className="h-full bg-primary" style={{ width: `${(derived.available / Math.max(state.budget + derived.earned, 1)) * 100}%` }} />
          </div>
          {derived.intercepted > 0 && <div className="num mt-2 text-xs text-green">{t("pal.card.saved")} {money(derived.intercepted)}</div>}
        </Card>

        <div id="needs" className="space-y-4">
          {kids.map((c, i) => <Card key={i} href="/me"><NeedsCard child={c} profile={state.profile} /></Card>)}
        </div>

        <Card href="/resources" label={t("pal.card.claims_cta")}>
          <div className="text-sm font-medium">{t("pal.card.claims")}</div>
          {claimable != null && report ? (
            <>
              <div className="num mt-1 text-3xl font-semibold text-primary">{money(claimable)}<span className="text-sm text-muted">/mo</span></div>
              <div className="mt-1 text-xs text-muted">{report.items.filter((i) => i.eligibility === "likely").slice(0, 4).map((i) => i.name).join(" · ")}</div>
            </>
          ) : (
            <div className="mt-1 text-sm text-muted">{t("pal.line.claims_none")}</div>
          )}
        </Card>

        {latest && (
          <Card href="/chat">
            <div className="text-sm font-medium">{t("pal.card.verdict")}</div>
            <div className="mt-1 text-[15px]">{latest.headline}</div>
            <div className="num mt-1 flex gap-4 text-xs text-muted"><span>“{latest.ask.slice(0, 60)}{latest.ask.length > 60 ? "…" : ""}”</span></div>
            <div className="num mt-2 flex gap-4 text-sm"><span className="text-green">{t("pal.card.saved")} {money(latest.intercepted)}</span><span>{t("pal.card.paid")} {money(latest.approved_total)}</span></div>
          </Card>
        )}
      </section>
    </main>
  );
}
