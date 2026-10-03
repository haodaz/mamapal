"use client";
import { useState } from "react";
import { Baby, Milk, Utensils, Shirt, ToyBrick, BookOpen, HeartPulse, Droplets, ChevronDown, type LucideIcon } from "lucide-react";
import type { Child, Guide, Profile } from "@/lib/types";
import { childNeeds, type NeedCategory } from "@/lib/stages";
import { useLang } from "./LangProvider";

const ICON: Record<NeedCategory, LucideIcon> = { diapers: Baby, feeding: Milk, solids: Utensils, clothing: Shirt, play: ToyBrick, books: BookOpen, health: HeartPulse, care: Droplets };
const TIER_STYLE = ["", "bg-[#e6f4ff] text-[#1677ff]", "bg-[#f6ffed] text-[#389e0d]", "bg-[#fff7e6] text-[#d48806]"];

// The month's needs by tier; each item opens into Pal's guide (concepts first, traps included), cached server-side.
export function PlanNeeds({ child, profile, tierNotes }: { child: Child; profile: Profile; tierNotes?: { 1: string; 2: string; 3: string } }) {
  const { t, lang } = useLang();
  const { total, tiers } = childNeeds(child, profile);
  const [open, setOpen] = useState<string | null>(null);
  const [guides, setGuides] = useState<Record<string, Guide | "loading" | "error">>({});
  async function toggle(label_en: string) {
    if (open === label_en) { setOpen(null); return; }
    setOpen(label_en);
    if (guides[label_en]) return;
    setGuides((g) => ({ ...g, [label_en]: "loading" }));
    try {
      const r = await fetch("/api/planning/guide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ child: child.name || "baby", label_en, lang }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setGuides((g) => ({ ...g, [label_en]: j.guide }));
    } catch { setGuides((g) => ({ ...g, [label_en]: "error" })); }
  }
  return (
    <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
      {tiers.map(({ tier, needs, total: tt }) => (
        <section key={tier} className={`rounded-2xl border border-line bg-panel p-4 shadow-sm ${tier === 1 ? "md:row-span-2" : ""}`}>
          <div className="flex items-baseline justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_STYLE[tier]}`}>{t(`tier.${tier}` as const)}</span>
            <span className="num text-sm font-semibold">${tt}<span className="text-xs text-muted">/mo</span></span>
          </div>
          {tierNotes && <p className="mt-2 text-sm leading-relaxed text-fg/80">{tierNotes[tier as 1 | 2 | 3]}</p>}
          <ul className="mt-3 divide-y divide-line">
            {needs.map((n) => { const I = ICON[n.category]; const g = guides[n.label.en]; const isOpen = open === n.label.en; return (
              <li key={n.label.en}>
                <button onClick={() => toggle(n.label.en)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-muted"><I className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1 text-sm">{n.label[lang]}{n.qty && <span className="num ml-1.5 text-xs text-muted">{n.qty}</span>}</span>
                  <span className="num text-sm text-muted">{n.cost ? `$${n.cost}` : t("needs.free")}</span>
                  <ChevronDown className={`h-4 w-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="mb-3 rounded-xl bg-bg p-4 text-sm leading-relaxed">
                    {g === "loading" || !g ? <div className="text-muted">{t("guide.loading")}</div> : g === "error" ? <div className="text-red">…</div> : (
                      <div className="space-y-3">
                        <div className="text-base font-semibold">{g.title}</div>
                        {([["guide.what", g.what], ["guide.which", g.which_one], ["guide.how_much", g.how_much]] as const).map(([k, v]) => <div key={k}><div className="text-[11px] text-muted">{t(k)}</div><p>{v}</p></div>)}
                        <div><div className="text-[11px] text-muted">{t("guide.traps")}</div><ul className="mt-1 space-y-1">{g.traps.map((x, i) => <li key={i} className="flex gap-2"><span className="text-red">×</span><span>{x}</span></li>)}</ul></div>
                        <div><div className="text-[11px] text-muted">{t("guide.safety")}</div><p>{g.safety}</p></div>
                        <div><div className="text-[11px] text-green">{t("guide.cheap")}</div><p className="text-green">{g.cheap}</p></div>
                        {n.cheap && <p className="text-xs text-muted">{n.cheap[lang]}</p>}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ); })}
          </ul>
        </section>
      ))}
      <div className="num text-right text-sm md:col-span-2"><span className="text-muted">{t("pal.card.needs_total")} </span><b>≈ ${total}/mo</b></div>
    </div>
  );
}
