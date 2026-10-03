"use client";
import type { Child } from "@/lib/types";
import { STAGES, MILESTONES, stageFor } from "@/lib/stages";
import { monthsSince, formatAge } from "@/lib/age";
import { useLang } from "./LangProvider";
import { BabyAvatar } from "./BabyAvatar";

// Where the child is on the road: stages as a track, the current one lit, what they're working on now and what comes next.
export function BabyTimeline({ child }: { child: Child }) {
  const { t, lang } = useLang();
  const months = monthsSince(child.born);
  const stage = stageFor(months);
  const idx = STAGES.findIndex((s) => s.key === stage.key);
  const next = STAGES[idx + 1];
  const name = child.name || (lang === "zh" ? "宝宝" : "Baby");
  return (
    <div>
      <div className="flex items-center gap-3">
        <BabyAvatar child={child} size={56} />
        <div>
          <div className="text-lg font-semibold leading-tight">{name}</div>
          <div className="num text-sm text-muted">{formatAge(months, lang)} · {stage.label[lang]}</div>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="flex min-w-[560px] items-start gap-1">
          {STAGES.map((s, i) => {
            const done = i < idx, cur = i === idx;
            return (
              <li key={s.key} className="flex-1">
                <div className="relative h-2 rounded-full bg-[#eceef5]">
                  <div className={`h-full rounded-full ${done ? "bg-primary/50" : cur ? "bg-primary" : ""}`} style={{ width: cur ? `${Math.max(12, Math.min(100, ((months - s.min + 1) / (s.max - s.min + 1)) * 100))}%` : "100%" }} />
                  {cur && <span className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-primary shadow" style={{ left: `${Math.max(12, Math.min(100, ((months - s.min + 1) / (s.max - s.min + 1)) * 100))}%` }} />}
                </div>
                <div className={`mt-2 text-[11px] leading-tight ${cur ? "font-semibold text-fg" : "text-muted"}`}>{s.label[lang]}{cur && <span className="ml-1 text-primary">· {t("me.now")}</span>}</div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-primary-soft/60 p-3">
          <div className="text-[11px] text-primary">{t("me.working_on")} · {stage.label[lang]}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{(MILESTONES[stage.key] ?? []).map((m) => <span key={m.en} className="rounded-full bg-panel px-2.5 py-1 text-xs shadow-sm">{m[lang]}</span>)}</div>
        </div>
        {next && (
          <div className="rounded-xl bg-bg p-3">
            <div className="text-[11px] text-muted">{t("me.next")} · {next.label[lang]}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">{(MILESTONES[next.key] ?? []).map((m) => <span key={m.en} className="rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">{m[lang]}</span>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
