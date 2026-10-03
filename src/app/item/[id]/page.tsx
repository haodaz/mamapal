"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { useAppState } from "@/components/useAppState";
import { useLang } from "@/components/LangProvider";
import { PalFace } from "@/components/PalFace";
import { childNeeds } from "@/lib/stages";
import type { Guide, Market } from "@/lib/types";

// One item, one page: Pal's slow-changing knowledge on top, retrieved brands and prices below.
export default function ItemPage() {
  const { t, lang } = useLang();
  const { id } = useParams<{ id: string }>();
  const { data, refresh } = useAppState();
  const [guide, setGuide] = useState<Guide | null | "loading">("loading");
  const [market, setMarket] = useState<Market | null>(null);
  const [looking, setLooking] = useState(false);
  const [tab, setTab] = useState<"memory" | "market">("memory");
  const child = data?.state.profile.children[0];
  const key = child?.name || "baby";
  useEffect(() => {
    if (!data || !child) return;
    fetch("/api/planning/guide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ child: key, id, lang }) }).then((r) => r.json()).then((j) => setGuide(j.guide ?? null));
    const { stage } = childNeeds(child, data.state.profile);
    setMarket(data.state.market?.[`${stage.key}|${id}|${lang}`] ?? null);
  }, [data, child, key, id, lang]);
  async function lookup(force = false) {
    setLooking(true);
    try {
      const r = await fetch("/api/planning/market", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ child: key, id, lang, refresh: force }) });
      const j = await r.json();
      if (r.ok) setMarket(j.market);
    } finally { setLooking(false); }
  }
  async function toggleOwned(value: boolean) {
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owned: { id, value } }) });
    refresh();
  }
  if (!data || !child) return <main className="p-8 text-sm text-muted">{t("loading")}</main>;
  const { needs } = childNeeds(child, data.state.profile, data.state.owned ?? []);
  const need = needs.find((n) => n.id === id);
  if (!need) return <main className="p-8 text-sm text-muted">…</main>;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-8">
      <Link href="/plan" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" />{t("item.back")}</Link>
      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted">{t(`tier.${need.tier}` as const)} · {t(`kind.${need.kind}` as const)}{need.essential && <span className="ml-2 rounded-full bg-[#fff1f0] px-2 py-0.5 text-[11px] text-red">{lang === "zh" ? "必需" : "essential"}</span>}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{need.label[lang]}</h1>
          <div className="num mt-1 text-sm text-muted">${need.cost}{need.kind === "monthly" ? "/mo" : ""}{need.qty && <> · {need.qty}</>}</div>
        </div>
        {need.kind === "one_time" && (
          <label className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-2 text-sm"><input type="checkbox" checked={need.owned} onChange={(e) => toggleOwned(e.target.checked)} className="accent-primary" />{t("item.owned")}<span className="text-xs text-muted">· {t("item.owned_hint")}</span></label>
        )}
      </header>

      <div className="mt-4 flex gap-1 rounded-xl bg-panel p-1 md:hidden">
        {(["memory", "market"] as const).map((k) => <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${tab === k ? "bg-primary-soft text-primary" : "text-muted"}`}>{t(k === "memory" ? "item.memory" : "item.market")}</button>)}
      </div>
      <div className="mt-3 grid gap-4 md:mt-6 md:grid-cols-2">
      {/* Memory */}
      <section className={`rounded-2xl border border-line bg-panel p-5 shadow-sm ${tab === "memory" ? "" : "hidden md:block"}`}>
        <div className="flex items-center gap-2"><PalFace size={24} /><span className="text-sm font-medium">{t("item.memory")}</span></div>
        {guide === "loading" ? <div className="mt-3 text-sm text-muted">{t("guide.loading")}</div> : !guide ? <div className="mt-3 text-sm text-red">…</div> : (
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed">
            {([["guide.what", guide.what], ["guide.which", guide.which_one], ["guide.how_much", guide.how_much]] as const).map(([k, v]) => <div key={k}><div className="text-xs text-muted">{t(k)}</div><p className="mt-0.5">{v}</p></div>)}
            <div><div className="text-xs text-muted">{t("guide.traps")}</div><ul className="mt-1 space-y-1">{guide.traps.map((x, i) => <li key={i} className="flex gap-2"><span className="text-red">×</span><span>{x}</span></li>)}</ul></div>
            <div><div className="text-xs text-muted">{t("guide.safety")}</div><p className="mt-0.5">{guide.safety}</p></div>
            <div className="rounded-xl bg-[#f6ffed] p-3"><div className="text-xs text-green">{t("guide.cheap")}</div><p className="mt-0.5 text-green">{guide.cheap}</p>{need.cheap && <p className="mt-1 text-xs text-muted">{need.cheap[lang]}</p>}</div>
          </div>
        )}
      </section>

      {/* Market */}
      <section className={`rounded-2xl border border-line bg-panel p-5 shadow-sm ${tab === "market" ? "" : "hidden md:block"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><Search className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{t("item.market")}</span>{market && <span className="num text-xs text-muted">{market.at.slice(0, 10)}</span>}</div>
          <button onClick={() => lookup(Boolean(market))} disabled={looking} className="flex items-center gap-1 rounded-full border border-primary/40 px-3 py-1 text-xs text-primary disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${looking ? "animate-spin" : ""}`} />{looking ? t("item.looking") : market ? t("item.refresh") : t("item.lookup")}</button>
        </div>
        {market ? (
          <>
            <ul className="mt-3 divide-y divide-line">
              {market.brands.map((b, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0"><div className="font-medium">{b.brand} <span className="font-normal text-fg/80">{b.product}</span></div><div className="text-xs text-muted">{b.url ? <a href={b.url} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2">{b.where}</a> : b.where}{b.note && <> · {b.note}</>}</div></div>
                  <div className={`num shrink-0 ${i === 0 ? "text-green" : ""}`}>${b.price.toFixed(2)}</div>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-xl bg-[#f6ffed] p-3 text-sm"><div className="text-xs text-green">{t("item.cheapest")}</div><p className="mt-0.5">{market.cheapest}</p></div>
          </>
        ) : <div className="mt-3 text-sm text-muted">{looking ? t("item.looking") : t("item.market_none")}</div>}
      </section>
      </div>
    </main>
  );
}
