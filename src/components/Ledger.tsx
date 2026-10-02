"use client";
import type { LedgerEntry } from "@/lib/types";
import { useLang } from "./LangProvider";

export function Ledger({ entries }: { entries: LedgerEntry[] }) {
  const { t } = useLang();
  if (!entries.length) return <div className="text-xs text-muted">{t("ledger.empty")}</div>;
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-panel shadow-sm">
      {[...entries].reverse().map((e) => (
        <li key={e.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 px-4 py-2.5 text-sm">
          <span className="num text-[11px] text-muted">{e.ts.slice(5, 16).replace("T", " ")}</span>
          <span className="min-w-0 truncate">
            {e.note}
            {e.paypal_id && <span className="num ml-2 text-[10px] text-muted">{e.paypal_id}</span>}
          </span>
          <span className={`num ${e.kind === "spend" ? "text-red" : "text-green"}`}>{e.kind === "spend" ? "−" : "+"}${e.amount.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}
