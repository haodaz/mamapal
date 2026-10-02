"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, HandCoins, UserRound } from "lucide-react";
import { useLang } from "./LangProvider";
import { PalBust, PalFigure } from "./PalFace";

export function Nav() {
  const { lang, setLang, t } = useLang();
  const path = usePathname();
  const items = [
    { href: "/", label: "Pal", Icon: Home, pal: true },
    { href: "/budget", label: t("nav.budget"), Icon: Wallet },
    { href: "/resources", label: t("nav.resources"), Icon: HandCoins },
    { href: "/me", label: t("nav.me"), Icon: UserRound },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const LangBtn = () => (
    <button onClick={() => setLang(lang === "en" ? "zh" : "en")} className="num rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted hover:text-fg" aria-label="language">
      {lang === "en" ? "中文" : "EN"}
    </button>
  );
  return (
    <>
      {/* Desktop: top navigation */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-panel/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="text-base font-semibold tracking-tight">{t("app.title")}</span>
            <span className="text-xs text-muted">{t("app.tagline")}</span>
          </Link>
          <nav className="flex items-center gap-1">
            {items.map(({ href, label, pal }) => (
              <Link key={href} href={href} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${active(href) ? "bg-fg text-white" : "text-muted hover:text-fg"}`}>{pal && <PalBust size={22} />}{label}</Link>
            ))}
            <Link href="/chat" className={`ml-1 flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-sm ${active("/chat") ? "bg-primary text-white" : "border border-primary/40 text-primary hover:bg-primary-soft"}`}>
              <PalBust size={22} />{t("nav.chat")}
            </Link>
            <span className="ml-2"><LangBtn /></span>
          </nav>
        </div>
      </header>

      {/* Mobile: slim top bar */}
      <div className="flex items-center justify-between px-4 pt-4 md:hidden">
        <span className="text-base font-semibold tracking-tight">{t("app.title")}</span>
        <LangBtn />
      </div>

      {/* Mobile: bottom tabs (hidden on the chat screen, which has its own composer) */}
      {!active("/chat") && (
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-4">
          {items.map(({ href, label, Icon, pal }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(href) ? "text-primary" : "text-muted"}`}>
              {pal ? <PalBust size={24} className={active(href) ? "" : "opacity-70"} /> : <Icon className="h-5 w-5" strokeWidth={active(href) ? 2.5 : 2} />}
              {label}
            </Link>
          ))}
        </div>
      </nav>
      )}

      {/* Mobile: floating chat button */}
      {!active("/chat") && path !== "/" && (
        <Link href="/chat" aria-label={t("nav.chat")} className="fixed bottom-[4.2rem] right-2 z-30 flex flex-col items-center md:hidden">
          <span className="mb-0.5 rounded-full border border-line bg-panel px-2 py-0.5 text-[11px] text-primary shadow-sm">{t("nav.chat")}</span>
          <PalFigure pose="wave" width={76} />
        </Link>
      )}
    </>
  );
}
