"use client";
import { Baby, Milk, Utensils, Shirt, ToyBrick, BookOpen, HeartPulse, Droplets, type LucideIcon } from "lucide-react";
import type { Child, Profile, State } from "@/lib/types";
import { childNeeds, type NeedCategory } from "@/lib/stages";
import { useLang } from "./LangProvider";

const ICON: Record<NeedCategory, LucideIcon> = { diapers: Baby, feeding: Milk, solids: Utensils, clothing: Shirt, play: ToyBrick, books: BookOpen, health: HeartPulse, care: Droplets };
const TIER_STYLE = ["", "bg-[#e6f4ff] text-[#1677ff]", "bg-[#f6ffed] text-[#389e0d]", "bg-[#fff7e6] text-[#d48806]"];

// This month's spending for a child: what the month should cost (by tier, with decorative icons) against what was actually paid.
export function SpendCard({ child, profile, state }: { child: Child; profile: Profile; state: State }) {
  const { t, lang } = useLang();
  const { total, tiers } = childNeeds(child, profile);
  const spent = state.ledger.filter((e) => e.kind === "spend").reduce((s, e) => s + e.amount, 0);
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ff] text-primary"><Baby className="h-5 w-5" /></span>
          <div>
            <div className="text-sm font-medium">{t("pal.card.needs", { name: child.name || (lang === "zh" ? "宝宝" : "Baby") })}</div>
            <div className="num text-xs text-muted">{t("me.baseline")} <b className="text-fg">${total}</b> · {t("me.spent_so_far")} <span className="text-red">${spent.toFixed(0)}</span></div>
          </div>
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-[#eceef5]"><div className="h-full bg-red/70" style={{ width: `${Math.min(100, (spent / Math.max(total, 1)) * 100)}%` }} /></div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[3fr_2fr]">
        {tiers.map(({ tier, needs, total: tt }) => (
          <div key={tier} className={`rounded-xl bg-bg p-3 ${tier === 1 ? "md:row-span-2" : ""}`}>
            <div className="flex items-baseline justify-between">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TIER_STYLE[tier]}`}>{t(`tier.${tier}` as const)}</span>
              <span className="num text-sm font-semibold">${tt}</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {needs.map((n, i) => { const I = ICON[n.category]; return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-panel text-muted shadow-sm"><I className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1 truncate text-fg/85">{n.label[lang]}</span>
                  <span className="num text-muted">{n.cost ? `$${n.cost}` : t("needs.free")}</span>
                </li>
              ); })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
