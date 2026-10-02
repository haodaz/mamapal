"use client";
import { useState } from "react";
import type { Child, Profile } from "@/lib/types";
import { childNeeds, type NeedCategory } from "@/lib/stages";
import { monthsSince, formatAge } from "@/lib/age";
import { useLang } from "./LangProvider";

const ORDER: NeedCategory[] = ["diapers", "feeding", "solids", "clothing", "play", "books", "health", "care"];

export function NeedsCard({ child, profile }: { child: Child; profile: Profile }) {
  const { t, lang } = useLang();
  const [tips, setTips] = useState(false);
  const { stage, needs, total } = childNeeds(child, profile);
  const name = child.name || (lang === "zh" ? "宝宝" : "Baby");
  const byCat = ORDER.map((c) => ({ c, items: needs.filter((n) => n.category === c) })).filter((g) => g.items.length);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">{t("pal.card.needs", { name })}</div>
        <div className="num text-xs text-muted">{formatAge(monthsSince(child.born), lang)} · {stage.label[lang]}</div>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {byCat.map(({ c, items }) => (
          <li key={c} className="py-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">{t(`needs.${c}` as const)}</span>
              <span className="num">${items.reduce((s, n) => s + n.cost, 0)}</span>
            </div>
            <div className="text-xs text-fg/80">{items.map((n) => n.label[lang]).join(" · ")}</div>
            {tips && items.some((n) => n.cheap) && <div className="mt-0.5 text-xs text-green">{items.filter((n) => n.cheap).map((n) => n.cheap![lang]).join("；")}</div>}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between">
        <button onClick={() => setTips((v) => !v)} className="text-xs text-primary">{t("pal.card.cheap")} {tips ? "−" : "+"}</button>
        <div className="num text-sm"><span className="text-muted">{t("pal.card.needs_total")} </span><span className="font-semibold">≈ ${total}/mo</span></div>
      </div>
    </div>
  );
}
