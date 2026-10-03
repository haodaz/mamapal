"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Baby, Package, HandCoins, MessageCircle, type LucideIcon } from "lucide-react";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { PalFace, PalFigure } from "@/components/PalFace";
import { NeedsCard } from "@/components/NeedsCard";
import { PlanCard } from "@/components/PlanCard";
import { BabyAvatar } from "@/components/BabyAvatar";
import { SpendCard } from "@/components/SpendCard";
import { childNeeds } from "@/lib/stages";
import { supplyStatus } from "@/lib/inventory";
import { monthsSince, formatAge } from "@/lib/age";
import type { Plan, ResourceReport, SupplyType } from "@/lib/types";

type Tab = "money" | "pantry" | "needs" | "claims";

export default function Home() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { data, refresh } = useAppState();
  const [report, setReport] = useState<ResourceReport | null>(null);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<{ ask: string; plan: Plan }[]>([]);
  const [tab, setTab] = useState<Tab>("money");
  const box = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { fetch("/api/resources", { cache: "no-store" }).then((r) => r.json()).then((j) => setReport(j.resources)); }, []);
  useEffect(() => { if (data && data.state.onboarded === false) router.replace("/welcome"); }, [data, router]);
  useEffect(() => { if (thread.length || busy) end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [thread.length, busy]);
  const onMoney = useCallback(() => refresh(), [refresh]);
  const onError = useCallback((m: string) => setError(m), []);
  if (!data) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const { state, derived } = data;
  const mom = state.profile.name ? `, ${state.profile.name}` : "";
  const kids = state.profile.children;
  const first = kids[0];
  const kidName = first?.name || (lang === "zh" ? "宝宝" : "Baby");
  const needsTotal = kids.reduce((s, c) => s + childNeeds(c, state.profile).total, 0);
  const claimable = report ? report.items.filter((i) => i.eligibility !== "unlikely").reduce((s, i) => s + i.monthly_value_estimate, 0) : null;
  const latest = [...state.plans].reverse().find((p) => !thread.some((x) => x.plan.id === p.id));
  const pantry = supplyStatus(state).filter((x) => x.tracked);
  const low = pantry.filter((x) => x.low);
  const sname = (k: SupplyType) => t(`supply.${k}` as const);
  const money = (n: number) => `$${n.toFixed(0)}`;
  const hello = first?.name ? t("pal.welcome_back", { name: mom, kid: first.name }) : t("pal.welcome_nokid", { name: mom });

  const lines: { icon: LucideIcon; text: string; tone?: string }[] = [
    { icon: Wallet, text: t("pal.line.money", { available: money(derived.available) }) },
    ...(first ? [{ icon: Baby, text: t("pal.line.child", { name: kidName, age: formatAge(monthsSince(first.born), lang), needs: money(needsTotal) }) }] : []),
    ...(pantry.length ? [{ icon: Package, text: low.length ? low.map((x) => t("supply.low", { item: sname(x.type), d: x.days ?? 0 })).join(" ") : t("supply.ok", { items: pantry.map((x) => `${sname(x.type)} ${t("supply.days", { d: x.days ?? 0 })}`).join(", ") }), tone: low.length ? "text-amber" : undefined }] : []),
    { icon: HandCoins, text: claimable != null ? t("pal.line.claims", { claims: money(claimable) }) : t("pal.line.claims_none") },
    ...(latest ? [{ icon: MessageCircle, text: t("pal.line.verdict", { saved: money(latest.intercepted) }) }] : []),
  ];
  const quick = [...low.map((x) => t("supply.ask", { item: sname(x.type) })), t("pal.q1"), t("pal.q2", { name: kidName }), t("pal.q3")];

  async function submit() {
    if (!ask.trim() || busy) return;
    const text = ask.trim();
    setBusy(true); setError(null); setAsk("");
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ask: text, lang }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      setThread((th) => [...th, { ask: text, plan: j.plan }]);
      refresh();
    } catch (e) { setError((e as Error).message); setAsk(text); } finally { setBusy(false); }
  }

  const PalMsg = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
    <div className="flex items-start gap-2 md:gap-3">
      <PalFace size={28} className="mt-1 md:mt-2" />
      <div className={`min-w-0 flex-1 ${wide ? "" : "max-w-[85%]"}`}>{children}</div>
    </div>
  );
  const Bubble = ({ children }: { children: React.ReactNode }) => (
    <PalMsg><div className="w-fit rounded-2xl rounded-tl-sm border border-line bg-panel px-4 py-2.5 text-[15px] leading-relaxed shadow-sm">{children}</div></PalMsg>
  );
  const Mine = ({ children }: { children: React.ReactNode }) => (
    <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[15px] text-white">{children}</div></div>
  );
  const panel = "rounded-2xl rounded-tl-sm border border-line bg-panel shadow-sm";
  const Bulletin = () => (
    <ul className="space-y-1.5">
      {lines.map((l, i) => { const I = l.icon; return <li key={i} className={`flex items-start gap-2 text-[15px] leading-snug ${l.tone ?? ""}`}><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-bg text-muted"><I className="h-3 w-3" /></span>{l.text}</li>; })}
    </ul>
  );
  const Numbers = () => (
    <div className="num grid grid-cols-3 gap-2">
      {[[t("budget.available"), money(derived.available), "text-fg"], [t("pal.card.saved"), money(derived.intercepted), "text-green"], [t("home.claims"), claimable == null ? "—" : money(claimable), "text-primary"]].map(([l, v, c]) => (
        <div key={l} className="rounded-2xl bg-bg px-3 py-2.5"><div className="text-[11px] text-muted">{l}</div><div className={`text-xl font-semibold ${c}`}>{v}</div></div>
      ))}
    </div>
  );
  const MoneyBody = () => (
    <>
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
      <div className="mt-3 flex gap-4 text-xs"><Link href="/budget" className="text-primary">{t("pal.card.open")} →</Link><Link href="/me#ledger" className="text-primary">{t("pal.card.details")} →</Link></div>
    </>
  );
  const PantryBody = () => (
    <>
      <ul className="mt-2 space-y-2">{pantry.map((x) => (
        <li key={x.type}>
          <div className="flex items-baseline justify-between text-sm"><span>{sname(x.type)}</span><span className={`num ${x.low ? "text-amber" : "text-muted"}`}>{t("supply.left", { n: x.left, unit: t(`supply.unit.${x.type}` as const) })} · {t("supply.days", { d: x.days ?? 0 })}</span></div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#eceef5]"><div className={`h-full ${x.low ? "bg-amber" : "bg-primary"}`} style={{ width: `${Math.min(100, ((x.days ?? 0) / 30) * 100)}%` }} /></div>
        </li>
      ))}</ul>
      {!pantry.length && <div className="mt-2 text-sm text-muted">{t("supply.untracked")}</div>}
      <div className="mt-3 text-xs"><Link href="/plan#pantry" className="text-primary">{t("budget.edit")} →</Link></div>
    </>
  );
  const ClaimsBody = () => (
    <>
      {claimable != null && report ? (
        <>
          <div className="num mt-1 text-3xl font-semibold text-primary">{money(claimable)}<span className="text-sm text-muted">/mo</span></div>
          <ul className="mt-2 space-y-1 text-sm">{report.items.filter((i) => i.eligibility === "likely").slice(0, 5).map((i) => <li key={i.id} className="flex justify-between gap-3"><span className="truncate">{i.name}</span><span className="num shrink-0 text-muted">{i.monthly_value_estimate ? `$${i.monthly_value_estimate.toFixed(0)}/mo` : ""}</span></li>)}</ul>
        </>
      ) : <div className="mt-1 text-sm text-muted">{t("pal.line.claims_none")}</div>}
      <div className="mt-3 text-xs"><Link href="/resources" className="text-primary">{t("pal.card.claims_cta")} →</Link></div>
    </>
  );
  const Thread = () => (
    <>
      {latest && !thread.length && (
        <div className="space-y-3">
          <Mine>{latest.ask}</Mine>
          <PalMsg wide><PlanCard plan={latest} onPaid={onMoney} onError={onError} /></PalMsg>
        </div>
      )}
      {thread.map(({ ask: a, plan }) => (
        <div key={plan.id} className="space-y-3">
          <Mine>{a}</Mine>
          <PalMsg wide><PlanCard plan={state.plans.find((p) => p.id === plan.id) ?? plan} onPaid={onMoney} onError={onError} /></PalMsg>
        </div>
      ))}
      {busy && <Bubble><span className="text-muted">{t("composer.busy")}</span></Bubble>}
      {error && <div className="rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
      <div ref={end} />
    </>
  );
  const chip = "shrink-0 rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-fg shadow-sm hover:border-primary hover:text-primary";
  const tabs: { k: Tab; l: string }[] = [{ k: "money", l: t("tab.money") }, { k: "pantry", l: t("tab.pantry") }, { k: "needs", l: t("tab.needs") }, { k: "claims", l: t("tab.claims") }];

  return (
    <main className="mx-auto max-w-2xl px-4 pb-56 pt-4 md:max-w-6xl md:px-6 md:pb-48 md:pt-8">
      <div className="relative flex flex-col items-center md:flex-row md:items-end md:gap-6">
        <div className="relative z-10 -mb-14 md:mb-0 md:shrink-0">
          <PalFigure width={170} className="md:w-[190px]" />
          {first && <BabyAvatar child={first} size={64} className="absolute -right-6 bottom-10 ring-4" />}
        </div>
        <section className="w-full rounded-3xl border border-line bg-panel px-5 pb-5 pt-16 shadow-sm md:flex-1 md:pt-5">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{hello}</h1>
          <p className="mt-1 text-sm text-muted">{t("pal.intro")}</p>
          <div className="mt-4"><Numbers /></div>
          {low.length > 0 && <div className="mt-4 rounded-xl border border-amber/40 bg-amber/5 px-3 py-2 text-sm text-amber">{low.map((x) => t("supply.low", { item: sname(x.type), d: x.days ?? 0 })).join(" ")}</div>}
          <div className="mt-4 text-[11px] text-muted">{t("pal.quick")}</div>
          <div className="mt-1.5 flex flex-wrap gap-2">{quick.map((q) => <button key={q} onClick={() => { setAsk(q); box.current?.focus(); }} className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm hover:border-primary hover:text-primary">{q}</button>)}</div>
        </section>
      </div>

      <section className="mt-5 space-y-4">
        <PalMsg wide>
          <div className={`${panel} px-4 py-3`}>
            <div className="mb-1.5 text-[11px] text-muted">{t("pal.says")}</div>
            <Bulletin />
          </div>
        </PalMsg>

        <div className="md:hidden">
          <PalMsg wide>
            <div className={`${panel} p-4`}>
              <div className="flex gap-1 rounded-xl bg-bg p-1">{tabs.map((x) => <button key={x.k} onClick={() => setTab(x.k)} className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${tab === x.k ? "bg-panel text-fg shadow-sm" : "text-muted"}`}>{x.l}</button>)}</div>
              <div className="mt-3">
                {tab === "money" && <><div className="text-sm font-medium">{t("pal.card.money")}</div><MoneyBody /></>}
                {tab === "pantry" && <><div className="text-sm font-medium">{t("supply.title")}</div><PantryBody /></>}
                {tab === "needs" && first && <NeedsCard child={first} profile={state.profile} />}
                {tab === "claims" && <><div className="text-sm font-medium">{t("pal.card.claims")}</div><ClaimsBody /></>}
              </div>
            </div>
          </PalMsg>
        </div>

        <div className="hidden md:block">
          <PalMsg wide>
            <div className="grid grid-cols-3 gap-4">
              <div className={`${panel} p-4`}><div className="flex items-center gap-2 text-sm font-medium"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff1f0] text-red"><Wallet className="h-4 w-4" /></span>{t("pal.card.money")}</div><MoneyBody /></div>
              <div className={`${panel} p-4`}><div className="flex items-center gap-2 text-sm font-medium"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e6f4ff] text-primary"><Package className="h-4 w-4" /></span>{t("supply.title")}</div><PantryBody /></div>
              <div className={`${panel} p-4`}><div className="flex items-center gap-2 text-sm font-medium"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6ffed] text-green"><HandCoins className="h-4 w-4" /></span>{t("pal.card.claims")}</div><ClaimsBody /></div>
            </div>
          </PalMsg>
          <div className="mt-4 space-y-4">{kids.map((c, i) => <PalMsg key={i} wide><SpendCard child={c} profile={state.profile} state={state} /></PalMsg>)}</div>
        </div>

        <Thread />
      </section>

      <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 bg-gradient-to-t from-bg via-bg/95 to-bg/0 pt-6 md:bottom-0">
        <div className="relative mx-auto max-w-2xl px-4 pb-2.5 md:max-w-6xl md:px-6">
          <PalFigure pose="wave" width={96} className="absolute bottom-[3.9rem] left-2 z-0 md:left-0 md:w-[120px]" />
          <div className="relative mb-2 ml-24 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:ml-32">
            <button onClick={() => box.current?.focus()} className={chip}>{t("pal.topic.buy")}</button>
            <Link href="/resources" className={chip}>{t("pal.topic.claim")}</Link>
            <Link href="/plan" className={chip}>{t("pal.topic.month", { name: kidName })}</Link>
            <Link href="/budget" className={chip}>{t("pal.topic.budget")}</Link>
            <Link href="/chat" className={chip}>{t("pal.history")}</Link>
          </div>
          <div className="relative flex items-end gap-2 rounded-3xl border border-line bg-panel p-1.5 shadow-[0_-6px_24px_rgba(40,50,110,0.08)]">
            <textarea ref={box} value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={1} placeholder={t("pal.placeholder")} className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] placeholder:text-muted" />
            <button onClick={submit} disabled={busy || !ask.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">{busy ? t("composer.busy") : t("pal.send")}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
