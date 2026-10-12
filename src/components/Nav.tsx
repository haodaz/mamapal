"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Wallet, HandCoins, UserRound, CalendarHeart, Plus, History, ArrowLeftRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "./Sidebar";
import { useLang } from "./LangProvider";
import { PalBust, PalFigure } from "./PalFace";
import { Logo } from "./Logo";
import { PalDrawer } from "./PalDrawer";
import { contextFor } from "@/lib/context";
import { useAppState } from "./useAppState";
import { monthsSince } from "@/lib/age";

// The frame around every signed-in page.
// Desktop: a left sidebar. On top, Pal (the conversation) and the tools she manages herself; below, her conversations
// with Pal; at the bottom, which household this is. Phones: a slim top bar and the bottom tabs.
// On the tool pages, a floating Pal opens the conversation in place, knowing which page it came from.
export function Nav() {
  return <Suspense fallback={null}><NavInner /></Suspense>;
}

function NavInner() {
  const { t, lang } = useLang();
  const path = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const { collapsed: slim, toggle } = useSidebar();
  const { data } = useAppState();
  const [demo, setDemo] = useState<string | null>(null);
  useEffect(() => { fetch("/api/login", { cache: "no-store" }).then((r) => r.json()).then((j) => setDemo(j.signed_in ? j.name : null)).catch(() => {}); }, []);
  const first = data?.state.profile.children[0];
  const kid = first?.name || (lang === "zh" ? "宝宝" : "the baby");
  const ctx = contextFor(path, lang, first ? monthsSince(first.born) : 0);
  const tools = [
    { href: "/plan", label: t("nav.plan"), Icon: CalendarHeart },
    { href: "/budget", label: t("nav.budget"), Icon: Wallet },
    { href: "/resources", label: t("nav.resources"), Icon: HandCoins },
    { href: "/me", label: t("nav.me"), Icon: UserRound },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  if (path === "/intro" || path === "/login" || path === "/doc" || path === "/welcome") return null;
  const convs = data?.state.conversations ?? [];
  const current = path === "/" ? params.get("c") : null;
  const row = `flex items-center gap-2.5 rounded-xl py-2 text-sm transition ${slim ? "justify-center px-0" : "px-3"}`;

  return (
    <>
      {/* Desktop: sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-panel/95 backdrop-blur transition-[width] md:flex ${slim ? "w-16" : "w-60"}`}>
        <div className={`flex items-center py-4 ${slim ? "flex-col gap-3 px-2" : "justify-between px-5"}`}>
          {slim ? <Link href="/" aria-label="MamaPal"><PalBust size={28} /></Link> : <Logo size="md" />}
          <button onClick={toggle} aria-label={slim ? t("nav.expand") : t("nav.collapse")} title={slim ? t("nav.expand") : t("nav.collapse")} className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-fg">
            {slim ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className={`space-y-0.5 ${slim ? "px-2" : "px-3"}`}>
          <Link href="/" title={t("nav.pal")} className={`${row} ${active("/") && !current ? "bg-primary-soft font-medium text-fg" : "text-fg/80 hover:bg-bg"}`}>
            <PalBust size={20} />{!slim && t("nav.pal")}
          </Link>
          {tools.map(({ href, label, Icon }) => (
            <Link key={href} href={href} title={label} className={`${row} ${active(href) ? "bg-primary-soft font-medium text-fg" : "text-fg/80 hover:bg-bg"}`}>
              <Icon className={`h-[18px] w-[18px] ${active(href) ? "text-primary" : "text-muted"}`} />{!slim && label}
            </Link>
          ))}
        </nav>
        {slim ? (
          <div className="mt-6 flex flex-col items-center gap-1 px-2">
            <Link href="/?new=1" title={t("nav.new")} className="rounded-xl p-2 text-primary hover:bg-bg"><Plus className="h-[18px] w-[18px]" /></Link>
            <Link href="/chat" title={t("nav.conversations")} className="rounded-xl p-2 text-muted hover:bg-bg hover:text-fg"><History className="h-[18px] w-[18px]" /></Link>
          </div>
        ) : (<>
        <div className="mt-6 flex items-center justify-between px-5 text-xs font-medium text-muted">
          <span>{t("nav.conversations")}</span>
          <Link href="/?new=1" className="flex items-center gap-1 text-primary hover:underline"><Plus className="h-3.5 w-3.5" />{t("nav.new")}</Link>
        </div>
        <div className="mt-1 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {convs.length === 0 && <p className="px-3 py-2 text-xs text-muted">{t("nav.no_conversations")}</p>}
          {convs.map((c) => (
            <Link key={c.id} href={`/?c=${c.id}`} title={c.title} className={`block truncate rounded-xl px-3 py-1.5 text-sm ${current === c.id ? "bg-bg font-medium text-fg" : "text-fg/75 hover:bg-bg"}`}>
              {c.title || "…"}
            </Link>
          ))}
        </div>
        </>)}
        <div className={`mt-auto flex items-center gap-2 border-t border-line py-3 text-xs text-muted ${slim ? "justify-center px-2" : "justify-between px-5"}`}>
          {!slim && <span className="truncate">{demo ?? data?.state.profile.name ?? ""}</span>}
          <button onClick={async () => { await fetch("/api/login", { method: "DELETE" }); window.location.href = "/login"; }} title={t("me.switch")} className="flex shrink-0 items-center gap-1 text-primary hover:underline">
            <ArrowLeftRight className="h-3 w-3" />{!slim && t("me.switch")}
          </button>
        </div>
      </aside>

      {/* Phones: slim top bar with the conversation list */}
      <div className="flex items-center justify-between px-4 pt-4 md:hidden">
        <Logo size="sm" />
        <Link href="/chat" aria-label={t("nav.conversations")} className="flex items-center gap-1 rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-muted"><History className="h-3.5 w-3.5" />{t("nav.conversations")}</Link>
      </div>

      {/* Phones: bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          <Link href="/" className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active("/") ? "text-primary" : "text-muted"}`}><PalBust size={24} className={active("/") ? "" : "opacity-70"} />Pal</Link>
          {tools.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(href) ? "text-primary" : "text-muted"}`}>
              <Icon className="h-5 w-5" strokeWidth={active(href) ? 2.5 : 2} />{label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Floating Pal on the tool pages: the conversation comes to her, and knows which page she is on */}
      {path !== "/" && path !== "/chat" && (
        <>
          {!open && <button onClick={() => setOpen(true)} aria-label={t("nav.chat")} className="fixed bottom-[4.2rem] right-2 z-30 flex flex-col items-center md:bottom-6 md:right-6">
            <span className="typing mb-1 mr-1 self-end rounded-2xl rounded-br-sm border border-line bg-panel px-2.5 py-1.5 shadow-sm"><i /><i /><i /></span>
            <PalFigure pose="wave" width={76} className="md:w-[96px]" />
          </button>}
          {open && <PalDrawer ctx={ctx} kid={kid} onClose={() => setOpen(false)} />}
        </>
      )}
    </>
  );
}
