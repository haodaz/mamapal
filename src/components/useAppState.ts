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
  return { data, refresh, setData };
}
