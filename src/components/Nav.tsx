"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, HandCoins, UserRound, CalendarHeart } from "lucide-react";
import { useLang } from "./LangProvider";
import { PalBust, PalFigure } from "./PalFace";
import { Logo } from "./Logo";
import { PalDrawer } from "./PalDrawer";
import { contextFor } from "@/lib/context";
import { useState } from "react";
import { useAppState } from "./useAppState";

export function Nav() {
  const { t, lang } = useLang();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { data } = useAppState();
  const kid = data?.state.profile.children[0]?.name || (lang === "zh" ? "宝宝" : "the baby");
  const ctx = contextFor(path, lang);
  const chatHref = ctx ? `/chat?from=${ctx.screen}${ctx.itemId ? `&item=${encodeURIComponent(ctx.itemId)}` : ""}` : "/chat";
  const items = [
    { href: "/", label: t("nav.home"), mobileLabel: "Pal", Icon: Home, pal: true },
    { href: "/plan", label: t("nav.plan"), Icon: CalendarHeart },
    { href: "/budget", label: t("nav.budget"), Icon: Wallet },
    { href: "/resources", label: t("nav.resources"), Icon: HandCoins },
    { href: "/me", label: t("nav.me"), Icon: UserRound },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  if (path === "/intro" || path === "/login" || path === "/doc" || path === "/welcome") return null;
  return (
    <>
      {/* Desktop: top navigation */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-panel/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo size="md" />
          <nav className="flex items-center gap-6">
            {items.map(({ href, label }) => (
              <Link key={href} href={href} className={`relative py-1.5 text-sm transition-colors ${active(href) ? "text-fg" : "text-muted hover:text-fg"}`}>
                {label}
                <span className={`absolute inset-x-0 -bottom-0.5 mx-auto h-[2px] w-4 rounded-full bg-primary transition-opacity ${active(href) ? "opacity-100" : "opacity-0"}`} />
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile: slim top bar */}
      <div className="flex items-center justify-between px-4 pt-4 md:hidden">
        <Logo size="sm" />
      </div>

      {/* Mobile: bottom tabs (hidden on the chat screen, which has its own composer) */}
      {!active("/chat") && (
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          {items.map(({ href, label, mobileLabel, Icon, pal }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(href) ? "text-primary" : "text-muted"}`}>
              {pal ? <PalBust size={24} className={active(href) ? "" : "opacity-70"} /> : <Icon className="h-5 w-5" strokeWidth={active(href) ? 2.5 : 2} />}
              {mobileLabel ?? label}
            </Link>
          ))}
        </div>
      </nav>
      )}

      {/* Floating Pal on every page except home (own composer) and chat. Mobile → the chat page; desktop → a side panel. Both know where you are. */}
      {!active("/chat") && path !== "/" && (
        <>
          <Link href={chatHref} aria-label={t("nav.chat")} className="fixed bottom-[4.2rem] right-2 z-30 flex flex-col items-center md:hidden">
            <span className="typing mb-1 mr-1 self-end rounded-2xl rounded-br-sm border border-line bg-panel px-2.5 py-1.5 shadow-sm"><i /><i /><i /></span>
            <PalFigure pose="wave" width={76} />
          </Link>
          <button onClick={() => setOpen(true)} aria-label={t("nav.chat")} className="fixed bottom-6 right-6 z-30 hidden flex-col items-center md:flex">
            <span className="typing mb-1 mr-1 self-end rounded-2xl rounded-br-sm border border-line bg-panel px-2.5 py-1.5 shadow-sm"><i /><i /><i /></span>
            <PalFigure pose="wave" width={96} />
          </button>
          {open && <PalDrawer ctx={ctx} kid={kid} onClose={() => setOpen(false)} />}
        </>
      )}
    </>
  );
}
