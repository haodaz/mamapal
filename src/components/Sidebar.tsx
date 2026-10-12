"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Whether the desktop sidebar is narrow (icons only). Her own choice is remembered on this device; while a panel is
// open on the right, the sidebar folds by default to give the conversation room, and goes back when the panel closes.
type Ctx = { collapsed: boolean; toggle: () => void; setPaneOpen: (open: boolean) => void };
const SidebarCtx = createContext<Ctx>({ collapsed: false, toggle: () => {}, setPaneOpen: () => {} });

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useState<"open" | "closed">("open");
  const [paneOpen, setPaneOpenState] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null); // her choice while a panel is open
  useEffect(() => { try { if (localStorage.getItem("mp_sidebar") === "closed") setPref("closed"); } catch {} }, []);
  const collapsed = paneOpen ? override ?? true : pref === "closed";
  const toggle = useCallback(() => {
    if (paneOpen) { setOverride(!collapsed); return; }
    const next = pref === "open" ? "closed" : "open";
    setPref(next);
    try { localStorage.setItem("mp_sidebar", next); } catch {}
  }, [paneOpen, collapsed, pref]);
  const setPaneOpen = useCallback((open: boolean) => { setPaneOpenState(open); if (!open) setOverride(null); }, []);
  return <SidebarCtx.Provider value={{ collapsed, toggle, setPaneOpen }}>{children}</SidebarCtx.Provider>;
}

export const useSidebar = () => useContext(SidebarCtx);
