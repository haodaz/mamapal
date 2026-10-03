"use client";
import { useState } from "react";
import { Baby, Milk, Droplets, Package, type LucideIcon } from "lucide-react";
import type { State, SupplyType } from "@/lib/types";
import { supplyStatus, SUPPLY_TYPES } from "@/lib/inventory";
import { useLang } from "./LangProvider";

const ICON: Record<SupplyType, LucideIcon> = { diapers: Baby, formula: Milk, wipes: Droplets };

// Pantry: numbers first; "edit" turns the rows into inputs.
export function PantryCard({ state, onSaved }: { state: State; onSaved: () => void }) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [stock, setStock] = useState<Partial<Record<SupplyType, number>>>({});
  const rows = supplyStatus(state);
  async function save() {
    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplies: stock }) });
    setStock({}); setEditing(false); onSaved();
  }
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e6f4ff] text-primary"><Package className="h-5 w-5" /></span>
          <div className="text-sm font-medium">{t("supply.title")}</div>
        </div>
        {editing ? (
          <div className="flex gap-3 text-xs"><button onClick={() => { setEditing(false); setStock({}); }} className="text-muted">{t("me.close")}</button><button onClick={save} disabled={!SUPPLY_TYPES.some((k) => typeof stock[k] === "number")} className="rounded-full bg-primary px-3 py-1 font-semibold text-white disabled:opacity-30">{t("supply.set")}</button></div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-primary">{t("me.edit")}</button>
        )}
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((x) => { const I = ICON[x.type]; const unit = t(`supply.unit.${x.type}` as const); return (
          <li key={x.type} className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${x.low ? "bg-amber/10 text-amber" : "bg-bg text-muted"}`}><I className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{t(`supply.${x.type}` as const)}</span>
                {editing ? (
                  <span className="num flex items-center gap-1 text-xs text-muted"><input type="number" min={0} placeholder={String(x.left)} value={stock[x.type] ?? ""} onChange={(e) => setStock({ ...stock, [x.type]: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-24 rounded-lg border border-line bg-bg px-2 py-1 text-sm text-fg" />{unit}</span>
                ) : (
                  <span className={`num text-xs ${x.low ? "text-amber" : "text-muted"}`}>{x.tracked ? `${x.left} ${unit} · ${t("supply.days", { d: x.days ?? 0 })}` : t("supply.untracked")}</span>
                )}
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#eceef5]"><div className={`h-full ${x.low ? "bg-amber" : "bg-primary"}`} style={{ width: x.tracked ? `${Math.min(100, ((x.days ?? 0) / 30) * 100)}%` : "0%" }} /></div>
            </div>
          </li>
        ); })}
      </ul>
      {editing && <p className="mt-3 text-xs text-muted">{t("supply.hint")}</p>}
    </div>
  );
}
