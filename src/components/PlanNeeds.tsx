"use client";
import Link from "next/link";
import { Baby, Milk, Utensils, Shirt, ToyBrick, BookOpen, HeartPulse, Droplets, Moon, Bath, ShieldCheck, Package, Heart, TreePine, ChevronRight, type LucideIcon } from "lucide-react";
import type { Child, Profile } from "@/lib/types";
import { childNeeds, type NeedCategory } from "@/lib/stages";
import { useLang } from "./LangProvider";

export const CAT_ICON: Record<NeedCategory, LucideIcon> = { diapers: Baby, feeding: Milk, solids: Utensils, feeding_gear: Utensils, clothing: Shirt, sleep: Moon, bath_care: Bath, health: HeartPulse, safety: ShieldCheck, gear: Package, play: ToyBrick, books: BookOpen, mom: Heart, outings: TreePine };
const TIER_STYLE = ["", "bg-[#e6f4ff] text-[#1677ff]", "bg-[#f6ffed] text-[#389e0d]", "bg-[#fff7e6] text-[#d48806]"];

// The month's needs by tier, from the catalog. Each row opens its own page; one-time items can be marked as owned.
export function PlanNeeds({ child, profile, owned, tierNotes, onOwned }: { child: Child; profile: Profile; owned: string[]; tierNotes?: { 1: string; 2: string; 3: string }; onOwned: (id: string, value: boolean) => void }) {
  const { t, lang } = useLang();
  const { total, oneTimeTotal, oneTime, tiers } = childNeeds(child, profile, owned);
  return (
    <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
      {tiers.map(({ tier, needs, total: tt, oneTime: ot }) => (
        <section key={tier} className={`rounded-2xl border border-line bg-panel p-4 shadow-sm ${tier === 1 ? "md:row-span-2" : ""}`}>
          <div className="flex items-baseline justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_STYLE[tier]}`}>{t(`tier.${tier}` as const)}</span>
            <span className="num text-sm"><b>${tt}</b><span className="text-xs text-muted">/mo</span>{ot > 0 && <span className="ml-2 text-xs text-muted">+ ${ot} {t("kind.one_time")}</span>}</span>
          </div>
          {tierNotes && <p className="mt-2 text-sm leading-relaxed text-fg/80">{tierNotes[tier as 1 | 2 | 3]}</p>}
          <ul className="mt-3 divide-y divide-line">
            {needs.map((n) => { const I = CAT_ICON[n.category]; return (
              <li key={n.id} className={`flex items-center gap-3 py-2 ${n.owned ? "opacity-50" : ""}`}>
                {n.kind === "one_time" ? (
                  <input type="checkbox" checked={n.owned} onChange={(e) => onOwned(n.id, e.target.checked)} title={t("item.owned")} className="h-4 w-4 shrink-0 accent-primary" />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg text-muted"><I className="h-3.5 w-3.5" /></span>
                )}
                <Link href={`/item/${n.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{n.label[lang]}{n.kind !== "monthly" && <span className="ml-1.5 rounded-full bg-bg px-1.5 py-0.5 text-[10px] text-muted">{t(`kind.${n.kind}` as const)}</span>}</span>
                  <span className="num shrink-0 text-sm text-muted">{n.kind === "monthly" ? `$${n.monthly}` : `$${n.cost}`}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              </li>
            ); })}
          </ul>
        </section>
      ))}
      <div className="num flex flex-wrap items-baseline justify-between gap-2 text-sm md:col-span-2">
        <span className="text-muted">{oneTime.length > 0 ? t("needs.one_time_left", { n: oneTime.length, total: oneTimeTotal }) : ""}</span>
        <span><span className="text-muted">{t("pal.card.needs_total")} </span><b>≈ ${total}/mo</b></span>
      </div>
    </div>
  );
}
