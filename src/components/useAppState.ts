"use client";
import { useCallback, useEffect, useState } from "react";
import type { State } from "@/lib/types";

export type Derived = { spent: number; earned: number; intercepted: number; available: number };
export type Payload = { state: State; derived: Derived; paypal_configured: boolean };

export function useAppState() {
  const [data, setData] = useState<Payload | null>(null);
  const refresh = useCallback(async () => {
    const r = await fetch("/api/state", { cache: "no-store" });
    setData(await r.json());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  // Any part of the page can say "the household changed" (a new verdict, a payment, a run's cart): every copy refreshes.
  useEffect(() => { const on = () => { refresh(); }; window.addEventListener("mp:changed", on); return () => window.removeEventListener("mp:changed", on); }, [refresh]);
  return { data, refresh, setData };
}

export function announceChange() {
  try { window.dispatchEvent(new Event("mp:changed")); } catch {}
}
