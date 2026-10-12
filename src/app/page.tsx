"use client";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, Package, HandCoins, PiggyBank, ShoppingBasket, ListChecks, X, Loader2, Check, AlertTriangle, type LucideIcon } from "lucide-react";
import { useAppState, announceChange } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { PalFace, PalFigure } from "@/components/PalFace";
import { PlanCard } from "@/components/PlanCard";
import { BabyAvatar } from "@/components/BabyAvatar";
import { RunCard, useRunDriver } from "@/components/RunCard";
import { MicButton, speak, useVoice } from "@/components/Voice";
import { useSidebar } from "@/components/Sidebar";
import { childNeeds } from "@/lib/stages";
import { supplyStatus } from "@/lib/inventory";
import { monthsSince, formatAge } from "@/lib/age";
import type { Key } from "@/lib/i18n";
import type { MonthRun, Plan, RunStep } from "@/lib/types";

// Home is a conversation with Pal. Pal talks; what it does arrives as small cards in the conversation, and a card
// opens in a panel on the right (full screen on a phone) only when there is something to look at.
// The tools she manages herself (this month, budget, claims, me) live in the sidebar.

type Pane = { kind: "plan" | "run"; id: string } | null;

export default function Home() {
  return <Suspense fallback={null}><Conversation /></Suspense>;
}

function Conversation() {
  const { t, lang } = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const { data, refresh } = useAppState();
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>(null);
  const sidebar = useSidebar();
  const { setPaneOpen } = sidebar;
  useEffect(() => { setPaneOpen(!!pane); }, [pane, setPaneOpen]);
  useEffect(() => () => setPaneOpen(false), [setPaneOpen]);
  const [live, setLive] = useState<Record<string, MonthRun>>({});
  const [cid, setCid] = useState<string | null>(params.get("c"));
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<(text?: string, spoke?: boolean) => void>(() => {});
  const voice = useVoice((said) => submitRef.current(said, true), (heard) => setAsk(heard));

  // The URL decides the conversation: ?c=<id> to continue one, nothing (or ?new=1) for a fresh one.
  const paramC = params.get("c");
  const paramNew = params.get("new");
  useEffect(() => { setCid(paramC); setPane(null); setError(null); }, [paramC, paramNew]);
  useEffect(() => { if (data && data.state.onboarded === false) router.replace("/welcome"); }, [data, router]);

  const changed = useCallback(() => { refresh(); announceChange(); }, [refresh]);
  const onRunUpdate = useCallback((run: MonthRun, planReady: boolean) => { setLive((m) => ({ ...m, [run.id]: run })); if (planReady || run.status !== "running") changed(); }, [changed]);
  const drive = useRunDriver(onRunUpdate, (m) => setError(m));

  const conv = data?.state.conversations?.find((c) => c.id === cid) ?? null;
  const runOf = useCallback((id: string) => live[id] ?? data?.state.runs?.find((r) => r.id === id), [live, data]);
  // A run left half-way (closed tab, timeout) carries on when its conversation is opened again.
  useEffect(() => { for (const it of conv?.items ?? []) if (it.kind === "run") { const r = runOf(it.id); if (r?.status === "running") drive(r); } }, [conv, runOf, drive]);
  const count = conv?.items.length ?? 0;
  useEffect(() => { if (count || busy) end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [count, busy]);

  const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  const remember = (id: string) => { if (id !== cid) { setCid(id); router.replace(`/?c=${id}`); } };

  async function startRun() {
    if (busy) return;
    setError(null);
    try {
      const r = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, conversation_id: cid ?? undefined }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      setLive((m) => ({ ...m, [j.run.id]: j.run }));
      remember(j.conversation_id);
      changed();
      if (isDesktop()) setPane({ kind: "run", id: j.run.id });
      drive(j.run);
    } catch (e) { setError((e as Error).message); }
  }

  // "plan my month" (typed or said) starts a month run instead of a one-off verdict
  const wantsRun = (s: string) => /\b(plan|sort|cover)\b.*\b(month|rest of)\b|排.*(这个)?月|这个月.*(安排|排)/i.test(s);
  async function submit(said?: string, spoke = false) {
    const text = (said ?? ask).trim();
    if (!text || busy) return;
    if (wantsRun(text)) { setAsk(""); if (spoke) speak(t("voice.run_ok"), lang); return startRun(); }
    setBusy(true); setError(null); setAsk("");
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ask: text, lang, conversation_id: cid ?? undefined }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "failed");
      remember(j.conversation_id);
      changed();
      if (spoke) speak(`${j.plan.headline} ${j.plan.note}`, lang);
    } catch (e) { setError((e as Error).message); setAsk(text); } finally { setBusy(false); }
  }
  submitRef.current = submit;

  const brief = useMemo(() => {
    if (!data) return null;
    const { state, derived } = data;
    const first = state.profile.children[0];
    const pantry = supplyStatus(state).filter((x) => x.tracked);
    const low = pantry.filter((x) => x.low);
    const shortest = pantry.reduce<number | null>((m, x) => (x.days == null ? m : m == null ? x.days : Math.min(m, x.days)), null);
    const claimable = state.resources ? state.resources.items.filter((i) => i.eligibility !== "unlikely").reduce((s, i) => s + i.monthly_value_estimate, 0) : null;
    const needs = state.profile.children.reduce((s, c) => s + childNeeds(c, state.profile).total, 0);
    return { state, derived, first, pantry, low, shortest, claimable, needs };
  }, [data]);

  if (!data || !brief) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const { state, derived, first, low, shortest, claimable, needs } = brief;
  const money = (n: number) => `$${n.toFixed(0)}`;
  const mom = state.profile.name ? `, ${state.profile.name}` : "";
  const kidName = first?.name || (lang === "zh" ? "宝宝" : "Baby");
  const hello = first?.name ? t("pal.welcome_back", { name: mom, kid: first.name }) : t("pal.welcome_nokid", { name: mom });
  const sname = (k: "diapers" | "formula" | "wipes") => t(`supply.${k}` as const);
  const working = (state.runs ?? []).map((r) => live[r.id] ?? r).find((r) => r.status === "running");
  const quick = [...low.map((x) => t("supply.ask", { item: sname(x.type) })), t("pal.q1"), t("pal.q2", { name: kidName }), t("pal.q3")];
  const stepLabel = (s: RunStep) => t(`run.step.${s.key}${s.attempt > 0 && s.key !== "stock" && s.key !== "cart" ? "_rev" : ""}` as Key);

  const counters: { icon: LucideIcon; label: string; value: string; href: string; tone?: string }[] = [
    { icon: Wallet, label: t("budget.available"), value: money(derived.available), href: "/budget" },
    { icon: PiggyBank, label: t("pal.card.saved"), value: money(derived.intercepted), href: "/me#ledger", tone: "text-green" },
    { icon: Package, label: t("brief.pantry"), value: shortest == null ? "—" : t("brief.days", { d: shortest }), href: "/plan#pantry", tone: low.length ? "text-amber" : undefined },
    { icon: HandCoins, label: t("home.claims"), value: claimable == null ? "—" : money(claimable), href: "/resources", tone: "text-primary" },
  ];

  const Mine = ({ children }: { children: React.ReactNode }) => (
    <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[15px] text-white">{children}</div></div>
  );
  const PalSays = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2.5">
      <PalFace size={28} className="mt-1 shrink-0" />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-line bg-panel px-4 py-3 text-[15px] leading-relaxed shadow-sm">{children}</div>
    </div>
  );
  const Chip = ({ icon: I, children, onClick, active }: { icon: LucideIcon; children: React.ReactNode; onClick: () => void; active?: boolean }) => (
    <button onClick={onClick} className={`mt-2.5 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${active ? "border-primary bg-primary-soft" : "border-line bg-bg hover:border-primary/60"}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel text-primary shadow-sm"><I className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="shrink-0 text-xs text-primary">{t("conv.open")} →</span>
    </button>
  );

  const PlanReply = ({ plan }: { plan: Plan }) => (
    <PalSays>
      <div className="font-medium">{plan.headline}</div>
      <p className="mt-1 text-sm text-muted">{plan.note}</p>
      {plan.items.length > 0 && (
        <Chip icon={ShoppingBasket} onClick={() => setPane({ kind: "plan", id: plan.id })} active={pane?.id === plan.id}>
          <span className="num block text-sm">{plan.status === "paid" ? `${t("conv.paid")} · $${plan.approved_total.toFixed(2)}` : t("conv.items", { n: plan.items.filter((i) => i.verdict === "buy" || i.verdict === "swap").length, pay: plan.approved_total.toFixed(0) })}</span>
          {plan.intercepted > 0 && <span className="num block text-xs text-green">{t("conv.saved", { n: plan.intercepted.toFixed(0) })}</span>}
        </Chip>
      )}
    </PalSays>
  );

  const RunReply = ({ run }: { run: MonthRun }) => {
    const done = run.steps.filter((s) => s.status === "done").length;
    const cur = run.steps.find((s) => s.status === "running" || s.status === "failed") ?? run.steps.find((s) => s.status === "pending");
    const last = [...run.steps].reverse().find((s) => s.summary);
    const plan = run.plan_id ? state.plans.find((p) => p.id === run.plan_id) : undefined;
    return (
      <PalSays>
        <div className="font-medium">{run.status === "done" && plan ? plan.headline : t("run.lead")}</div>
        {run.status !== "done" && last && <p className="mt-1 text-sm text-muted">{last.summary}</p>}
        {run.status === "done" && plan && <p className="mt-1 text-sm text-muted">{plan.note}</p>}
        <div className="mt-2.5 flex gap-1" aria-hidden>{run.steps.map((s, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${s.status === "done" ? "bg-green" : s.status === "failed" ? "bg-red" : s === cur && run.status === "running" ? "animate-pulse bg-primary" : "bg-line"}`} />)}</div>
        <Chip icon={ListChecks} onClick={() => setPane({ kind: "run", id: run.id })} active={pane?.id === run.id}>
          <span className="flex items-center gap-1.5 text-sm">
            {run.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : run.status === "failed" ? <AlertTriangle className="h-3.5 w-3.5 text-red" /> : <Check className="h-3.5 w-3.5 text-green" />}
            {run.status === "running" && cur ? t("conv.working", { step: stepLabel(cur) }) : t("conv.open_run")}
          </span>
          <span className="num block text-xs text-muted">{done}/{run.steps.length} · ${(run.total_cost ?? 0).toFixed(2)}{plan ? ` · ${t("conv.items", { n: plan.items.length, pay: plan.approved_total.toFixed(0) })}` : ""}</span>
        </Chip>
      </PalSays>
    );
  };

  const paneRun = pane?.kind === "run" ? runOf(pane.id) : undefined;
  const panePlan = pane?.kind === "plan" ? state.plans.find((p) => p.id === pane.id) : undefined;
  const paneBody = pane && (
    <>
      <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-2.5 text-sm">
        <span className="font-medium">{pane.kind === "run" ? t("conv.title_run") : t("conv.title_plan")}</span>
        <button onClick={() => setPane(null)} aria-label={t("conv.close")} className="rounded-full p-1.5 text-muted hover:bg-bg hover:text-fg"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {paneRun && <RunCard run={paneRun} plans={state.plans} onChange={changed} onError={setError} onRetry={() => drive(paneRun, true)} />}
        {panePlan && <PlanCard plan={panePlan} onPaid={changed} onError={setError} />}
      </div>
    </>
  );

  return (
    <div className="flex">
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-48 pt-4 md:px-6 md:pt-8">
          {/* Brief: Pal, the child, and the four numbers that matter today */}
          <section className="flex items-start gap-4">
            <div className={`relative hidden shrink-0 ${pane ? "" : "sm:block"}`}>
              <PalFigure width={92} />
              {first && <BabyAvatar child={first} size={40} className="absolute -right-3 bottom-1 ring-2" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{hello}</h1>
              <p className="mt-0.5 text-sm text-muted">{first ? t("pal.line.child", { name: kidName, age: formatAge(monthsSince(first.born), lang), needs: money(needs) }) : t("pal.intro")}</p>
              <div className={`num mt-3 grid grid-cols-2 gap-2 ${pane ? "xl:grid-cols-4" : "sm:grid-cols-4"}`}>
                {counters.map(({ icon: I, label, value, href, tone }) => (
                  <Link key={label} href={href} className="rounded-xl border border-line bg-panel px-3 py-2 shadow-sm hover:border-primary/50">
                    <div className="flex items-center gap-1 text-[11px] text-muted"><I className="h-3 w-3" />{label}</div>
                    <div className={`text-lg font-semibold ${tone ?? "text-fg"}`}>{value}</div>
                  </Link>
                ))}
              </div>
              {low.length > 0 && <div className="mt-2 rounded-xl border border-amber/40 bg-amber/5 px-3 py-1.5 text-sm text-amber">{low.map((x) => t("supply.low", { item: sname(x.type), d: x.days ?? 0 })).join(" ")}</div>}
              {working && !conv?.items.some((i) => i.id === working.id) && (
                <button onClick={() => setPane({ kind: "run", id: working.id })} className="mt-2 flex items-center gap-1.5 text-xs text-primary"><Loader2 className="h-3 w-3 animate-spin" />{t("conv.working", { step: stepLabel(working.steps.find((s) => s.status !== "done") ?? working.steps[0]) })}</button>
              )}
            </div>
          </section>

          <section className="mt-6 space-y-4">
            {!conv && (
              <>
                <PalSays>
                  <ul className="space-y-1">
                    <li>{t("pal.line.money", { available: money(derived.available) })}</li>
                    <li>{claimable != null ? t("pal.line.claims", { claims: money(claimable) }) : t("pal.line.claims_none")}</li>
                    <li className="text-muted">{t("run.lead")}</li>
                  </ul>
                </PalSays>
                <div className="ml-10 flex flex-wrap gap-2">
                  <button onClick={startRun} className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-white shadow-sm hover:opacity-90">{t("run.start")}</button>
                  {quick.map((q) => <button key={q} onClick={() => submit(q)} className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm hover:border-primary hover:text-primary">{q}</button>)}
                </div>
              </>
            )}
            {conv?.items.map((it) => {
              if (it.kind === "plan") {
                const plan = state.plans.find((p) => p.id === it.id);
                return plan ? <div key={it.id} className="space-y-3"><Mine>{plan.ask}</Mine><PlanReply plan={plan} /></div> : null;
              }
              const run = runOf(it.id);
              return run ? <div key={it.id} className="space-y-3"><Mine>{run.goal}</Mine><RunReply run={run} /></div> : null;
            })}
            {busy && <div className="flex items-end gap-2.5"><PalFace size={28} className="mb-1" /><span className="typing rounded-2xl rounded-bl-sm border border-line bg-panel px-3 py-2"><i /><i /><i /></span></div>}
            {error && <div className="rounded-lg border border-red/40 bg-red/5 px-3 py-2 text-xs text-red">{error}</div>}
            <div ref={end} />
          </section>
        </div>

        {/* Composer: stays at the bottom of the conversation column */}
        <div className={`fixed bottom-[calc(3.6rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 bg-gradient-to-t from-bg via-bg/95 to-bg/0 pt-6 md:bottom-0 ${sidebar.collapsed ? "md:left-16" : "md:left-60"} ${pane ? "md:right-[min(44%,600px)]" : ""}`}>
          <div className="mx-auto max-w-[720px] px-4 pb-3 md:px-6">
            {conv && <div className="mb-2 flex gap-2 overflow-x-auto [scrollbar-width:none]"><button onClick={startRun} className="shrink-0 rounded-full border border-primary/50 bg-panel px-3 py-1 text-xs text-primary">{t("run.start")}</button>{quick.slice(0, 3).map((q) => <button key={q} onClick={() => submit(q)} className="shrink-0 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted hover:text-fg">{q}</button>)}</div>}
            <div className="flex items-end gap-2 rounded-3xl border border-line bg-panel p-1.5 shadow-[0_-6px_24px_rgba(40,50,110,0.08)]">
              <textarea ref={box} value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} rows={1} placeholder={voice.listening ? t("voice.listening") : t("pal.placeholder")} className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] placeholder:text-muted" />
              <MicButton voice={voice} />
              <button onClick={() => submit()} disabled={busy || !ask.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">{busy ? t("composer.busy") : t("pal.send")}</button>
            </div>
          </div>
        </div>
      </main>

      {/* The panel: two columns only while a card is open */}
      {pane && <aside className="sticky top-0 hidden h-screen w-[44%] max-w-[600px] shrink-0 flex-col border-l border-line bg-bg md:flex">{paneBody}</aside>}
      {pane && <div className="fixed inset-0 z-40 flex flex-col bg-bg md:hidden">{paneBody}</div>}
    </div>
  );
}
