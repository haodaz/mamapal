"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Baby, Package, HandCoins, MessageCircle } from "lucide-react";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { PalFace, PalFigure } from "@/components/PalFace";
import { NeedsCard } from "@/components/NeedsCard";
import { PlanCard } from "@/components/PlanCard";
import { BabyAvatar } from "@/components/BabyAvatar";
import { SpendCard } from "@/components/SpendCard";
import { PantryCard } from "@/components/PantryCard";
import { childNeeds } from "@/lib/stages";
import { supplyStatus } from "@/lib/inventory";
import { monthsSince, formatAge } from "@/lib/age";
import type { Plan, ResourceReport, SupplyType } from "@/lib/types";

export default function Home() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { data, refresh } = useAppState();
  const [report, setReport] = useState<ResourceReport | null>(null);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<{ ask: string; plan: Plan }[]>([]);
  const box = useRef<HTMLTextAreaElement>(null);
  const boxD = useRef<HTMLTextAreaElement>(null);
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

  // What Pal has to say today, as short lines (mobile: bubbles; desktop: a bulletin)
  const lines: { icon: typeof Wallet; text: string; tone?: string }[] = [
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

  const Bubble = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-end gap-2">
      <PalFace size={28} className="mb-1" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-panel px-4 py-2.5 text-[15px] leading-relaxed shadow-sm">{children}</div>
    </div>
  );
  const Mine = ({ children }: { children: React.ReactNode }) => (
    <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[15px] text-white">{children}</div></div>
  );
  const Card = ({ children, href, label, extra }: { children: React.ReactNode; href?: string; label?: string; extra?: { href: string; label: string } }) => (
    <div className="flex items-start gap-2">
      <PalFace size={28} className="mt-1" />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-line bg-panel p-4 shadow-sm">
        {children}
        <div className="mt-3 flex gap-4 text-xs">
          {href && <Link href={href} className="text-primary">{label ?? t("pal.card.open")} →</Link>}
          {extra && <Link href={extra.href} className="text-primary">{extra.label} →</Link>}
        </div>
      </div>
    </div>
  );
  const chip = "shrink-0 rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-fg shadow-sm hover:border-primary hover:text-primary";
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
    </>
  );
  const Thread = () => (
    <>
      {thread.map(({ ask: a, plan }) => (
        <div key={plan.id} className="space-y-3">
          <Mine>{a}</Mine>
          <div className="flex items-start gap-2"><PalFace size={28} className="mt-1" /><div className="min-w-0 flex-1"><PlanCard plan={state.plans.find((p) => p.id === plan.id) ?? plan} onPaid={onMoney} onError={onError} /></div></div>
        </div>
      ))}
      {busy && <Bubble><span className="text-muted">{t("composer.busy")}</span></Bubble>}
      {error && <div className="rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
      <div ref={end} />
    </>
  );

  return (
    <>
      {/* ============ Mobile: Pal's feed ============ */}
      <main className="mx-auto max-w-2xl px-4 pb-52 pt-4 md:hidden">
        <div className="relative flex flex-col items-center">
          <div className="relative z-10 -mb-14">
            <PalFigure width={170} />
            {first && <BabyAvatar child={first} size={64} className="absolute -right-6 bottom-10 ring-4" />}
          </div>
          <section className="w-full rounded-3xl border border-line bg-panel px-5 pb-5 pt-16 shadow-sm">
            <h1 className="text-xl font-semibold tracking-tight">{hello}</h1>
            <p className="mt-1 text-sm text-muted">{t("pal.intro")}</p>
            <div className="num mt-4 grid grid-cols-3 gap-2">
              {[[t("budget.available"), money(derived.available), "text-fg"], [t("pal.card.saved"), money(derived.intercepted), "text-green"], [t("home.claims"), claimable == null ? "—" : money(claimable), "text-primary"]].map(([l, v, c]) => (
                <div key={l} className="rounded-2xl bg-bg px-3 py-2.5"><div className="text-[11px] text-muted">{l}</div><div className={`text-xl font-semibold ${c}`}>{v}</div></div>
              ))}
            </div>
            {low.length > 0 && <div className="mt-4 rounded-xl border border-amber/40 bg-amber/5 px-3 py-2 text-sm text-amber">{low.map((x) => t("supply.low", { item: sname(x.type), d: x.days ?? 0 })).join(" ")}</div>}
            <div className="mt-4 text-[11px] text-muted">{t("pal.quick")}</div>
            <div className="mt-1.5 flex flex-wrap gap-2">{quick.map((q) => <button key={q} onClick={() => { setAsk(q); box.current?.focus(); }} className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm hover:border-primary hover:text-primary">{q}</button>)}</div>
          </section>
        </div>

        <section className="mt-5 space-y-3">
          <Bubble>{lines[0].text}</Bubble>
          <Card href="/budget" extra={{ href: "/me#ledger", label: t("pal.card.details") }}><div className="text-sm font-medium">{t("pal.card.money")}</div><MoneyBody /></Card>
          {first && <Bubble>{t("pal.line.child", { name: kidName, age: formatAge(monthsSince(first.born), lang), needs: money(needsTotal) })}</Bubble>}
          <div id="needs" className="space-y-3">{kids.map((c, i) => <Card key={i} href="/me"><NeedsCard child={c} profile={state.profile} /></Card>)}</div>
          {pantry.length > 0 && (
            <>
              <Bubble>{low.length ? low.map((x) => t("supply.low", { item: sname(x.type), d: x.days ?? 0 })).join(" ") : t("supply.ok", { items: pantry.map((x) => `${sname(x.type)} ${t("supply.days", { d: x.days ?? 0 })}`).join(", ") })}</Bubble>
              <Card href="/me#supplies" label={t("budget.edit")}>
                <div className="text-sm font-medium">{t("supply.title")}</div>
                <ul className="mt-2 space-y-2">{pantry.map((x) => (
                  <li key={x.type}>
                    <div className="flex items-baseline justify-between text-sm"><span>{sname(x.type)}</span><span className={`num ${x.low ? "text-amber" : "text-muted"}`}>{t("supply.left", { n: x.left, unit: t(`supply.unit.${x.type}` as const) })} · {t("supply.days", { d: x.days ?? 0 })}</span></div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#eceef5]"><div className={`h-full ${x.low ? "bg-amber" : "bg-primary"}`} style={{ width: `${Math.min(100, ((x.days ?? 0) / 30) * 100)}%` }} /></div>
                  </li>
                ))}</ul>
              </Card>
            </>
          )}
          <Bubble>{claimable != null ? t("pal.line.claims", { claims: money(claimable) }) : t("pal.line.claims_none")}</Bubble>
          {claimable != null && report && (
            <Card href="/resources" label={t("pal.card.claims_cta")}>
              <div className="text-sm font-medium">{t("pal.card.claims")}</div>
              <div className="num mt-1 text-3xl font-semibold text-primary">{money(claimable)}<span className="text-sm text-muted">/mo</span></div>
              <div className="mt-1 text-xs text-muted">{report.items.filter((i) => i.eligibility === "likely").slice(0, 4).map((i) => i.name).join(" · ")}</div>
            </Card>
          )}
          {latest && (
            <>
              <Bubble>{t("pal.line.verdict", { saved: money(latest.intercepted) })}</Bubble>
              <Card href="/chat">
                <div className="text-sm font-medium">{t("pal.card.verdict")}</div>
                <div className="mt-1 text-[15px]">{latest.headline}</div>
                <div className="mt-1 text-xs text-muted">“{latest.ask.slice(0, 80)}{latest.ask.length > 80 ? "…" : ""}”</div>
                <div className="num mt-2 flex gap-4 text-sm"><span className="text-green">{t("pal.card.saved")} {money(latest.intercepted)}</span><span>{t("pal.card.paid")} {money(latest.approved_total)}</span></div>
              </Card>
            </>
          )}
          <Thread />
        </section>

        <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 bg-gradient-to-t from-bg via-bg/95 to-bg/0 pt-6">
          <div className="relative mx-auto max-w-2xl px-4 pb-2.5">
            <PalFigure pose="wave" width={96} className="absolute bottom-[3.9rem] left-2 z-0" />
            <div className="relative mb-2 ml-24 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => box.current?.focus()} className={chip}>{t("pal.topic.buy")}</button>
              <Link href="/resources" className={chip}>{t("pal.topic.claim")}</Link>
              <a href="#needs" className={chip}>{t("pal.topic.month", { name: kidName })}</a>
              <Link href="/budget" className={chip}>{t("pal.topic.budget")}</Link>
            </div>
            <div className="relative flex items-end gap-2 rounded-3xl border border-line bg-panel p-1.5 shadow-[0_-6px_24px_rgba(40,50,110,0.08)]">
              <textarea ref={box} value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={1} placeholder={t("pal.placeholder")} className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] placeholder:text-muted" />
              <button onClick={submit} disabled={busy || !ask.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">{busy ? t("composer.busy") : t("pal.send")}</button>
            </div>
          </div>
        </div>
      </main>

      {/* ============ Desktop: dashboard ============ */}
      <main className="mx-auto hidden max-w-6xl px-6 pb-16 pt-6 md:block">
        {/* Banner: Pal + baby, welcome, bulletin, numbers */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-panel shadow-sm">
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#dbeafe] opacity-60 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-24 h-64 w-64 rounded-full bg-[#fde2e4] opacity-50 blur-3xl" />
          <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-8 px-8 py-6">
            <div className="relative">
              <PalFigure width={150} />
              {first && <BabyAvatar child={first} size={60} className="absolute -right-5 bottom-8 ring-4" />}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{hello}</h1>
              <div className="mt-1 text-xs text-muted">{t("pal.says")}</div>
              <ul className="mt-2 space-y-1.5">
                {lines.map((l, i) => { const I = l.icon; return <li key={i} className={`flex items-start gap-2 text-[15px] leading-snug ${l.tone ?? ""}`}><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-bg text-muted"><I className="h-3 w-3" /></span>{l.text}</li>; })}
              </ul>
            </div>
            <div className="num grid w-56 gap-2">
              {[[t("budget.available"), money(derived.available), "text-fg"], [t("pal.card.saved"), money(derived.intercepted), "text-green"], [t("home.claims"), claimable == null ? "—" : money(claimable), "text-primary"]].map(([l, v, c]) => (
                <div key={l} className="flex items-baseline justify-between rounded-2xl bg-bg px-4 py-2.5"><span className="text-xs text-muted">{l}</span><span className={`text-xl font-semibold ${c}`}>{v}</span></div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-[3fr_2fr] gap-5">
          {/* Conversation */}
          <div className="flex min-h-[32rem] flex-col rounded-3xl border border-line bg-panel shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-medium"><PalFace size={24} />{t("pal.conversation")}</div>
              <Link href="/chat" className="text-xs text-primary">{t("pal.history")} →</Link>
            </div>
            <div className="flex-1 space-y-3 px-5 py-4">
              {latest && !thread.length && (
                <div className="space-y-3">
                  <Mine>{latest.ask}</Mine>
                  <div className="flex items-start gap-2"><PalFace size={28} className="mt-1" /><div className="min-w-0 flex-1"><PlanCard plan={latest} onPaid={onMoney} onError={onError} /></div></div>
                </div>
              )}
              {!latest && !thread.length && <Bubble>{t("chat.empty")}</Bubble>}
              <Thread />
            </div>
            <div className="border-t border-line px-5 py-3">
              <div className="mb-2 flex flex-wrap gap-2">{quick.map((q) => <button key={q} onClick={() => { setAsk(q); boxD.current?.focus(); }} className="rounded-full border border-line bg-bg px-3 py-1 text-xs hover:border-primary hover:text-primary">{q}</button>)}</div>
              <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg p-1.5">
                <textarea ref={boxD} value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={2} placeholder={t("pal.placeholder")} className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] placeholder:text-muted" />
                <button onClick={submit} disabled={busy || !ask.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">{busy ? t("composer.busy") : t("pal.send")}</button>
              </div>
            </div>
          </div>

          {/* Right column: money, pantry, claims */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-line bg-panel p-5 shadow-sm">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1f0] text-red"><Wallet className="h-5 w-5" /></span><div className="text-sm font-medium">{t("pal.card.money")}</div></div><div className="flex gap-3 text-xs"><Link href="/budget" className="text-primary">{t("pal.card.open")}</Link><Link href="/me#ledger" className="text-primary">{t("pal.card.details")}</Link></div></div>
              <MoneyBody />
            </div>
            <PantryCard state={state} onSaved={refresh} />
            <div className="rounded-3xl border border-line bg-panel p-5 shadow-sm">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f6ffed] text-green"><HandCoins className="h-5 w-5" /></span><div className="text-sm font-medium">{t("pal.card.claims")}</div></div><Link href="/resources" className="text-xs text-primary">{t("pal.card.claims_cta")}</Link></div>
              {claimable != null && report ? (
                <>
                  <div className="num mt-2 text-3xl font-semibold text-primary">{money(claimable)}<span className="text-sm text-muted">/mo</span></div>
                  <ul className="mt-2 space-y-1 text-sm">{report.items.filter((i) => i.eligibility === "likely").slice(0, 5).map((i) => <li key={i.id} className="flex justify-between gap-3"><span className="truncate">{i.name}</span><span className="num shrink-0 text-muted">{i.monthly_value_estimate ? `$${i.monthly_value_estimate.toFixed(0)}/mo` : ""}</span></li>)}</ul>
                </>
              ) : <div className="mt-2 text-sm text-muted">{t("pal.line.claims_none")}</div>}
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-5">{kids.map((c, i) => <SpendCard key={i} child={c} profile={state.profile} state={state} />)}</section>
      </main>
    </>
  );
}
