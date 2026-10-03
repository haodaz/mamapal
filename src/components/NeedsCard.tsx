"use client";
import Link from "next/link";
import type { Child, Profile } from "@/lib/types";
import { childNeeds } from "@/lib/stages";
import { monthsSince, formatAge } from "@/lib/age";
import { useLang } from "./LangProvider";

export function NeedsCard({ child, profile, owned = [] }: { child: Child; profile: Profile; owned?: string[] }) {
  const { t, lang } = useLang();
  const { stage, total, oneTime, oneTimeTotal, tiers } = childNeeds(child, profile, owned);
  const name = child.name || (lang === "zh" ? "宝宝" : "Baby");
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">{t("pal.card.needs", { name })}</div>
        <div className="num text-xs text-muted">{formatAge(monthsSince(child.born), lang)} · {stage.label[lang]}</div>
      </div>
      {tiers.map(({ tier, needs, total: tt }) => needs.length > 0 && (
        <div key={tier} className="mt-3">
          <div className="flex items-baseline justify-between text-xs"><span className={tier === 1 ? "font-medium text-fg" : "text-muted"}>{t(`tier.${tier}` as const)}</span><span className="num text-muted">${tt}/mo</span></div>
          <ul className="mt-1 divide-y divide-line border-t border-line">
            {needs.filter((n) => n.kind !== "one_time").slice(0, tier === 1 ? 10 : 5).map((n) => (
              <li key={n.id} className="flex items-baseline justify-between gap-3 py-1.5 text-sm"><Link href={`/item/${n.id}`} className="min-w-0 truncate">{n.label[lang]}</Link><span className="num text-muted">{n.monthly ? `$${n.monthly}` : t("needs.free")}</span></li>
            ))}
          </ul>
        </div>
      ))}
      <div className="num mt-3 flex items-baseline justify-between text-sm">
        <span className="text-xs text-muted">{oneTime.length > 0 ? t("needs.one_time_left", { n: oneTime.length, total: oneTimeTotal }) : ""}</span>
        <span><span className="text-muted">{t("pal.card.needs_total")} </span><b>≈ ${total}/mo</b></span>
      </div>
      <div className="mt-2 text-xs"><Link href="/plan" className="text-primary">{t("pal.card.open")} →</Link></div>
    </div>
  );
}
