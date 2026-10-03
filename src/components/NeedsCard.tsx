"use client";
import { useState } from "react";
import type { Child, Profile } from "@/lib/types";
import { childNeeds } from "@/lib/stages";
import { monthsSince, formatAge } from "@/lib/age";
import { useLang } from "./LangProvider";

export function NeedsCard({ child, profile }: { child: Child; profile: Profile }) {
  const { t, lang } = useLang();
  const [tips, setTips] = useState(false);
  const { stage, total, tiers } = childNeeds(child, profile);
  const name = child.name || (lang === "zh" ? "宝宝" : "Baby");
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">{t("pal.card.needs", { name })}</div>
        <div className="num text-xs text-muted">{formatAge(monthsSince(child.born), lang)} · {stage.label[lang]}</div>
      </div>
      {tiers.map(({ tier, needs, total: tt }) => needs.length > 0 && (
        <div key={tier} className="mt-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className={tier === 1 ? "font-medium text-fg" : "text-muted"}>{t(`tier.${tier}` as const)}</span>
            <span className="num text-muted">${tt}</span>
          </div>
          <ul className="mt-1 divide-y divide-line border-t border-line">
            {needs.map((n, i) => (
              <li key={i} className="py-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{n.label[lang]}{n.qty && <span className="num ml-1.5 text-xs text-muted">{n.qty}</span>}</span>
                  <span className="num">{n.cost ? `$${n.cost}` : t("needs.free")}</span>
                </div>
                {tips && n.cheap && <div className="mt-0.5 text-xs text-green">{n.cheap[lang]}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between">
        <button onClick={() => setTips((v) => !v)} className="text-xs text-primary">{t("pal.card.cheap")} {tips ? "−" : "+"}</button>
        <div className="num text-sm"><span className="text-muted">{t("pal.card.needs_total")} </span><span className="font-semibold">≈ ${total}/mo</span></div>
      </div>
    </div>
  );
}
