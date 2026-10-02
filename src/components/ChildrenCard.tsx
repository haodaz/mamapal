"use client";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { monthsSince, correctedMonths, formatAge } from "@/lib/age";
import { useLang } from "./LangProvider";

export function ChildrenCard({ profile }: { profile: Profile }) {
  const { t, lang } = useLang();
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-muted"><span className="text-primary">{t("pillar.manage")}</span> · {t("home.children")}</div>
        <Link href="/me" className="text-xs text-muted hover:text-fg">{t("budget.edit")}</Link>
      </div>
      <ul className="mt-3 space-y-2">
        {profile.children.map((c, i) => {
          const m = monthsSince(c.born);
          const cm = correctedMonths(c);
          const preterm = c.gestational_weeks && c.gestational_weeks < 37;
          return (
            <li key={i} className="flex items-baseline justify-between gap-3">
              <div>
                <span className="font-medium">{c.name || (lang === "zh" ? "宝宝" : "Baby")}</span>
                {preterm && <span className="ml-2 text-xs text-muted">{t("home.preterm", { weeks: c.gestational_weeks! })}</span>}
                {c.notes && <div className="text-xs text-muted">{c.notes}</div>}
              </div>
              <div className="num text-right text-sm">
                <span>{formatAge(m, lang)}</span>
                {preterm && cm !== m && <span className="ml-2 text-xs text-primary">{t("home.corrected")} {formatAge(cm, lang)}</span>}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="num mt-3 border-t border-line pt-3 text-xs text-muted">
        {t("home.supplies", { d: profile.diapers_per_day, f: profile.formula_ml_per_day ? t("home.supplies_formula", { ml: profile.formula_ml_per_day }) : "" })}
        <span className="ml-2">{t("home.runout", { n: profile.diapers_per_day * 30 })}</span>
      </div>
    </section>
  );
}
