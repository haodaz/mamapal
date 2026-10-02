"use client";
import { useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type GridApi } from "ag-grid-community";
import type { State } from "@/lib/types";
import { useLang } from "./LangProvider";

ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid lives only here, in Me → records: every PayPal event across months, sortable, filterable,
// with a pinned total row and CSV export. The rest of the app stays Pal-shaped.
type Row = { month: string; date: string; kind: "spend" | "earn" | ""; note: string; paypal_id: string; amount: number };

const theme = themeQuartz.withParams({
  accentColor: "#1677ff",
  backgroundColor: "#ffffff",
  foregroundColor: "#1d2233",
  headerBackgroundColor: "#f5f6fa",
  headerTextColor: "#6c7478",
  borderColor: "#e9ebf2",
  wrapperBorderRadius: 16,
  fontFamily: "inherit",
  fontSize: 13,
  rowHeight: 40,
  headerHeight: 36,
});

export function LedgerGrid({ state }: { state: State }) {
  const { t, lang } = useLang();
  const api = useRef<GridApi | null>(null);
  const [quick, setQuick] = useState("");
  const [month, setMonth] = useState<string>("all");

  const all = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    const push = (m: string, e: State["ledger"][number]) => rows.push({ month: m, date: e.ts.slice(0, 16).replace("T", " "), kind: e.kind, note: e.note, paypal_id: e.paypal_id ?? "", amount: e.kind === "spend" ? -e.amount : e.amount });
    state.history.forEach((h) => h.ledger.forEach((e) => push(h.month, e)));
    state.ledger.forEach((e) => push(state.month, e));
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [state]);
  const months = useMemo(() => Array.from(new Set(all.map((r) => r.month))).sort().reverse(), [all]);
  const rows = month === "all" ? all : all.filter((r) => r.month === month);
  const spent = rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);
  const earned = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const money = (v: number) => `${v < 0 ? "−" : "+"}$${Math.abs(v).toFixed(2)}`;

  const cols = useMemo<ColDef<Row>[]>(() => [
    { field: "month", headerName: t("grid.month"), width: 100, filter: true },
    { field: "date", headerName: t("grid.date"), width: 140, sort: "desc" },
    { field: "kind", headerName: t("grid.type"), width: 100, filter: true, valueFormatter: (p) => (p.value === "spend" ? t("grid.spend") : p.value === "earn" ? t("grid.earn") : ""), cellClass: (p) => (p.value === "spend" ? "text-red" : p.value === "earn" ? "text-green" : "") },
    { field: "note", headerName: t("grid.note"), flex: 1, minWidth: 180, filter: true },
    { field: "paypal_id", headerName: t("grid.paypal_id"), width: 190, cellClass: "num text-muted" },
    { field: "amount", headerName: t("grid.amount"), width: 120, type: "rightAligned", valueFormatter: (p) => (typeof p.value === "number" ? money(p.value) : ""), cellClass: (p) => `num font-medium ${p.value < 0 ? "text-red" : "text-green"}` },
  ], [t]);

  const totals: Row[] = [{ month: "", date: "", kind: "", note: `${t("grid.total")} · ${t("grid.spend")} ${money(spent)} · ${t("grid.earn")} ${money(earned)}`, paypal_id: "", amount: spent + earned }];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-line bg-panel px-2 py-1.5 text-sm">
          <option value="all">{t("grid.all_months")}</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={t("grid.search")} className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm" />
        <button onClick={() => api.current?.exportDataAsCsv({ fileName: `mamapal-ledger-${month}.csv` })} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-primary">{t("grid.export")}</button>
      </div>
      <div style={{ width: "100%" }}>
        <AgGridReact<Row>
          theme={theme}
          rowData={rows}
          columnDefs={cols}
          pinnedBottomRowData={totals}
          quickFilterText={quick}
          domLayout="autoHeight"
          suppressCellFocus
          localeText={lang === "zh" ? { noRowsToShow: "还没有记录", filterOoo: "筛选…", page: "页", of: "/", to: "到" } : undefined}
          onGridReady={(e) => { api.current = e.api; }}
        />
      </div>
    </div>
  );
}
