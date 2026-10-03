"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { PalFigure } from "@/components/PalFace";

export default function Intro() {
  const { t, lang, setLang } = useLang();
  const pillars = [
    { img: "/pal-heart-2.png", title: t("intro.cares"), text: t("intro.cares_t"), tint: "from-[#e6f4ff]" },
    { img: "/pal-receipt-2.png", title: t("intro.cuts"), text: t("intro.cuts_t"), tint: "from-[#fff1f0]" },
    { img: "/pal-baby-1.png", title: t("intro.claims"), text: t("intro.claims_t"), tint: "from-[#f6ffed]" },
  ];
  return (
    <main className="overflow-hidden">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-5">
        <span className="text-base font-semibold tracking-tight">{t("intro.kicker")}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "en" ? "zh" : "en")} className="num rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">{lang === "en" ? "中文" : "EN"}</button>
          <Link href="/login" className="rounded-full bg-fg px-4 py-1.5 text-sm font-medium text-white">{t("login.title")}</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-5 pb-10 pt-10 md:pt-16">
        <div className="pointer-events-none absolute -left-24 top-0 h-[26rem] w-[26rem] rounded-full bg-[#dbeafe] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-24 h-[22rem] w-[22rem] rounded-full bg-[#fde2e4] opacity-60 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{t("intro.h1")}</h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-fg/80">{t("intro.sub")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25">{t("intro.cta")}</Link>
              <a href="#how" className="rounded-full border border-line bg-panel px-6 py-3 text-sm font-semibold">{t("intro.cta2")}</a>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <PalFigure width={320} className="md:w-[380px]" />
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className={`rounded-3xl border border-line bg-gradient-to-b ${p.tint} to-panel p-6 shadow-sm`}>
              <img src={p.img} alt="" className="mx-auto h-36 w-auto drop-shadow-[0_8px_16px_rgba(40,50,110,0.12)]" />
              <h2 className="mt-4 text-xl font-semibold">{p.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-fg/80">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t("intro.how")}</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[t("intro.s1"), t("intro.s2"), t("intro.s3")].map((s, i) => (
            <li key={i} className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
              <div className="num text-3xl font-semibold text-primary">{i + 1}</div>
              <p className="mt-2 text-[15px] leading-relaxed">{s}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex justify-center"><Link href="/login" className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25">{t("intro.cta")}</Link></div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-16 pt-6 text-center text-xs text-muted">{t("intro.foot")}</footer>
    </main>
  );
}
