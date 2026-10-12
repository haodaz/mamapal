"use client";
import { usePathname } from "next/navigation";
import { useSidebar } from "./Sidebar";

// Leaves room for the desktop sidebar on signed-in pages; the intro, sign-in and welcome pages use the full width.
export function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { collapsed } = useSidebar();
  const bare = path === "/intro" || path === "/login" || path === "/doc" || path === "/welcome";
  return <div className={bare ? "" : collapsed ? "transition-[padding] md:pl-16" : "transition-[padding] md:pl-60"}>{children}</div>;
}
