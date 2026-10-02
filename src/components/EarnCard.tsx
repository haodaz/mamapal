"use client";
import { useState } from "react";
import type { Opportunity } from "@/lib/types";
import { OPPS } from "@/lib/i18n";
import { useLang } from "./LangProvider";

export function EarnCard({ opp, onDone, onError }: { opp: Opportunity; onDone: (r: unknown) => void; onError: (m: string) => void }) {
  const { t, lang } = useLang();
  const copy = OPPS[lang][opp.id] ?? OPPS.en[opp.id];
  const [answers, setAnswers] = useState<(string | null)[]>(copy.questions.map(() => null));
  const [busy, setBusy] = useState(false);
  const complete = answers.every(Boolean);
  const done = opp.status === "done";

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch("/api/earn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunity_id: opp.id, answers }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Payout failed");
      onDone(j);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`rounded-2xl border ${done ? "border-green/40" : "border-line"} bg-panel p-5 shadow-sm`}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-muted">{done ? t("earn.paid_out") : t("earn.opportunity")}</div>
        <div className="num text-green">+${opp.reward.toFixed(2)}</div>
      </div>
      <div className="mt-1 text-sm font-medium">{copy.title}</div>
      <div className="text-xs text-muted">{copy.brand} · ~{opp.seconds}s</div>
      {done ? (
        <div className="num mt-3 text-xs text-green">{t("earn.batch")} {opp.paypal_batch_id}</div>
      ) : (
        <div className="mt-4 space-y-3">
          {copy.questions.map((q, qi) => (
            <div key={qi}>
              <div className="mb-1.5 text-xs text-muted">{q.q}</div>
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((o) => (
                  <button
                    key={o}
                    onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? o : v)))}
                    className={`rounded-full border px-3 py-1 text-xs ${answers[qi] === o ? "border-primary bg-primary text-white" : "border-line text-fg hover:border-muted"}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button disabled={!complete || busy} onClick={submit} className="num w-full rounded-full bg-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">
            {busy ? t("earn.paying") : t("earn.cash_out", { amount: `$${opp.reward.toFixed(2)}` })}
          </button>
        </div>
      )}
    </article>
  );
}
