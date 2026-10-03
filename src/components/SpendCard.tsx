"use client";
import Link from "next/link";
import { Baby } from "lucide-react";
import type { Child, Profile, State } from "@/lib/types";
import { childNeeds } from "@/lib/stages";
import { CAT_ICON } from "./PlanNeeds";
import { useLang } from "./LangProvider";

const TIER_STYLE = ["", "bg-[#e6f4ff] text-[#1677ff]", "bg-[#f6ffed] text-[#389e0d]", "bg-[#fff7e6] text-[#d48806]"];

// What the baby needs this month (recurring), by tier, from the catalog. Bookkeeping lives in Budget.
export function SpendCard({ child, profile, state }: { child: Child; profile: Profile; state: State }) {
  const { t, lang } = useLang();
  const { total, oneTime, oneTimeTotal, tiers } = childNeeds(child, profile, state.owned ?? []);
  const spent = state.ledger.filter((e) => e.kind === "spend").reduce((s, e) => s + e.amount, 0);
  return (
    <div className="rounded-2xl rounded-tl-sm border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ff] text-primary"><Baby className="h-5 w-5" /></span>
          <div>
            <div className="text-sm font-medium">{t("pal.card.needs", { name: child.name || (lang === "zh" ? "宝宝" : "Baby") })}</div>
            <div className="num text-xs text-muted">{t("me.baseline")} <b className="text-fg">${total}/mo</b> · {t("me.spent_so_far")} <span className="text-red">${spent.toFixed(0)}</span>{oneTime.length > 0 && <> · {t("needs.one_time_left", { n: oneTime.length, total: oneTimeTotal })}</>}</div>
          </div>
        </div>
        <Link href="/plan" className="text-xs text-primary">{t("pal.card.open")} →</Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[3fr_2fr]">
        {tiers.map(({ tier, needs, total: tt }) => (
          <div key={tier} className={`rounded-xl bg-bg p-3 ${tier === 1 ? "md:row-span-2" : ""}`}>
            <div className="flex items-baseline justify-between"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TIER_STYLE[tier]}`}>{t(`tier.${tier}` as const)}</span><span className="num text-sm font-semibold">${tt}<span className="text-xs text-muted">/mo</span></span></div>
            <ul className="mt-2 space-y-1.5">
              {needs.filter((n) => n.kind !== "one_time").slice(0, tier === 1 ? 12 : 6).map((n) => { const I = CAT_ICON[n.category]; return (
                <li key={n.id} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-panel text-muted shadow-sm"><I className="h-3.5 w-3.5" /></span>
                  <Link href={`/item/${n.id}`} className="min-w-0 flex-1 truncate text-fg/85 hover:text-primary">{n.label[lang]}</Link>
                  <span className="num text-muted">{n.monthly ? `$${n.monthly}` : t("needs.free")}</span>
                </li>
              ); })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
