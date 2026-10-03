"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { PalFigure } from "@/components/PalFace";
import { Logo } from "@/components/Logo";

export default function Intro() {
  const { t, lang, setLang } = useLang();
  const Check = () => <span className="mt-1 inline-block h-4 w-4 shrink-0 rounded-full bg-primary/10 text-center text-[10px] leading-4 text-primary">✓</span>;
  const Bullets = ({ items }: { items: string[] }) => (
    <ul className="mt-5 space-y-2.5">{items.map((b) => <li key={b} className="flex gap-2.5 text-[15px] leading-relaxed"><Check />{b}</li>)}</ul>
  );
  const Pillar = ({ img, kicker, title, text, bullets, children, flip, tint }: { img: string; kicker: string; title: string; text: string; bullets: string[]; children: React.ReactNode; flip?: boolean; tint: string }) => (
    <section className="mx-auto max-w-5xl px-5 py-12 md:py-16">
      <div className={`grid items-center gap-8 md:grid-cols-2 ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <div className="flex items-center gap-3">
            <img src={img} alt="" className="h-16 w-auto drop-shadow-[0_6px_12px_rgba(40,50,110,0.12)]" />
            <span className="text-sm font-semibold text-primary">{kicker}</span>
          </div>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">{title}</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-fg/80">{text}</p>
          <Bullets items={bullets} />
        </div>
        <div className={`rounded-3xl bg-gradient-to-br ${tint} p-5 md:p-7`}>{children}</div>
      </div>
    </section>
  );
  const card = "rounded-2xl border border-line bg-panel p-4 shadow-sm";

  return (
    <main className="overflow-hidden">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-5">
        <Logo size="md" href={null} />
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === "en" ? "zh" : "en")} className="num rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-muted">{lang === "en" ? "中文" : "EN"}</button>
          <Link href="/login" className="rounded-full bg-fg px-4 py-1.5 text-sm font-medium text-white">{t("login.title")}</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-5 pb-6 pt-10 md:pt-16">
        <div className="pointer-events-none absolute -left-24 top-0 h-[26rem] w-[26rem] rounded-full bg-[#dbeafe] opacity-70 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-24 h-[22rem] w-[22rem] rounded-full bg-[#fde2e4] opacity-60 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{t("intro.h1")}</h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-fg/80">{t("intro.sub")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25">{t("intro.cta")}</Link>
              <a href="#cares" className="rounded-full border border-line bg-panel px-6 py-3 text-sm font-semibold">{t("intro.cta2")}</a>
            </div>
            <div className="mt-8 flex gap-6 text-sm text-muted">
              <span><b className="text-fg">{t("intro.cares")}</b></span><span><b className="text-fg">{t("intro.cuts")}</b></span><span><b className="text-fg">{t("intro.claims")}</b></span>
            </div>
          </div>
          <div className="flex justify-center md:justify-end"><PalFigure width={320} className="md:w-[380px]" /></div>
        </div>
      </section>

      {/* Pal cares */}
      <div id="cares" />
      <Pillar img="/pal-heart-2.png" kicker={t("intro.cares")} title={t("intro.cares_h")} text={t("intro.cares_p")} bullets={[t("intro.cares_b1"), t("intro.cares_b2"), t("intro.cares_b3")]} tint="from-[#e6f4ff] to-[#f5f6fa]">
        <div className={card}>
          <div className="flex items-baseline justify-between"><span className="text-sm font-medium">{lang === "zh" ? "比特这个月需要什么" : "what BIT needs this month"}</span><span className="num text-xs text-muted">8 mo</span></div>
          {[
            [t("tier.1"), [["diapers 2/3", "$29"], ["wipes", "$8"], [lang === "zh" ? "初加辅食" : "first solids", "$20"], [lang === "zh" ? "6-9 月码衣服" : "6-9 mo clothes", "$15"]], "$90"],
            [t("tier.2"), [[lang === "zh" ? "牙胶、叠叠杯" : "teethers, stacking cups", "$6"], [lang === "zh" ? "触摸书" : "touch-and-feel books", "$3"]], "$9"],
            [t("tier.3"), [[lang === "zh" ? "一次游泳或音乐课" : "a swim or music session", "$15"]], "$15"],
          ].map(([tier, rows, total]) => (
            <div key={tier as string} className="mt-3">
              <div className="flex justify-between text-xs"><span className="font-medium">{tier as string}</span><span className="num text-muted">{total as string}</span></div>
              <ul className="num mt-1 divide-y divide-line border-t border-line text-sm">{(rows as string[][]).map(([n, c]) => <li key={n} className="flex justify-between py-1"><span className="text-fg/80">{n}</span><span>{c}</span></li>)}</ul>
            </div>
          ))}
          <div className="num mt-3 text-right text-sm"><span className="text-muted">{t("pal.card.needs_total")} </span><b>≈ $114/mo</b></div>
        </div>
      </Pillar>

      {/* Pal cuts */}
      <Pillar flip img="/pal-receipt-2.png" kicker={t("intro.cuts")} title={t("intro.cuts_h")} text={t("intro.cuts_p")} bullets={[t("intro.cuts_b1"), t("intro.cuts_b2"), t("intro.cuts_b3")]} tint="from-[#fff1f0] to-[#f5f6fa]">
        <div className="space-y-3">
          <div className="flex justify-end"><div className="max-w-[90%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white">{t("demo.ask")}</div></div>
          <div className={card}>
            <div className="text-base font-semibold leading-snug">{t("demo.headline")}</div>
            <ul className="mt-3 divide-y divide-line text-sm">
              <li className="flex items-start justify-between gap-3 py-2"><span><span className="num mr-2 rounded border border-amber/40 bg-amber/5 px-1 text-[10px] font-semibold text-amber">{t("verdict.swap")}</span><span className="text-muted line-through decoration-red/60">{t("demo.i1")}</span> → {t("demo.i1s")}</span><span className="num shrink-0"><s className="text-muted">$45</s> $5</span></li>
              <li className="flex items-start justify-between gap-3 py-2"><span><span className="num mr-2 rounded border border-amber/40 bg-amber/5 px-1 text-[10px] font-semibold text-amber">{t("verdict.swap")}</span><span className="text-muted line-through decoration-red/60">{t("demo.i2")}</span> → {t("demo.i2s")}</span><span className="num shrink-0"><s className="text-muted">$60</s> $13</span></li>
            </ul>
            <div className="num mt-3 flex justify-between text-sm"><span className="text-muted">{t("plan.asked")} $105</span><span className="text-red">{t("plan.intercepted")} −$87</span><b>{t("plan.pay")} $18</b></div>
            <div className="mt-3 rounded-full bg-[#0070ba] py-2.5 text-center text-sm font-semibold text-white">{t("demo.pay")}</div>
          </div>
        </div>
      </Pillar>

      {/* Pal claims */}
      <Pillar img="/pal-baby-1.png" kicker={t("intro.claims")} title={t("intro.claims_h")} text={t("intro.claims_p")} bullets={[t("intro.claims_b1"), t("intro.claims_b2"), t("intro.claims_b3")]} tint="from-[#f6ffed] to-[#f5f6fa]">
        <div className={card}>
          <div className="text-sm font-medium">{t("pal.card.claims")}</div>
          <div className="num mt-1 text-3xl font-semibold text-primary">$1,514<span className="text-sm text-muted">/mo</span></div>
          <div className="text-xs text-muted">{t("demo.claims_sum")} · Queens, NY · 2 · $1,200/mo</div>
          <ul className="mt-3 space-y-2 text-sm">
            {[t("demo.claims_1"), t("demo.claims_2"), t("demo.claims_3")].map((c) => <li key={c} className="flex items-center gap-2"><span className="num rounded border border-green/40 bg-green/5 px-1.5 py-0.5 text-[10px] font-semibold text-green">{t("res.likely")}</span><span>{c}</span></li>)}
          </ul>
          <div className="mt-3 flex gap-2"><span className="rounded-full border border-line px-2.5 py-0.5 text-xs">Photo ID</span><span className="rounded-full border border-line px-2.5 py-0.5 text-xs">{lang === "zh" ? "地址证明" : "Proof of address"}</span><span className="rounded-full border border-line px-2.5 py-0.5 text-xs">{lang === "zh" ? "出生证明" : "Birth certificate"}</span></div>
        </div>
      </Pillar>

      {/* More modules */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="text-2xl font-semibold tracking-tight">{t("intro.more")}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { img: "/pal-think-1.png", h: t("intro.f_compare"), p: t("intro.f_compare_t"), demo: <ul className="num mt-3 space-y-1 text-xs"><li className="text-green">IKEA ANTILOP $24.99</li><li className="text-muted">Walmart Cosco $34.99</li><li className="text-muted">Amazon $39.99</li></ul> },
            { img: "/pal-figure.png", h: t("intro.f_pantry"), p: t("intro.f_pantry_t"), demo: <div className="mt-3"><div className="num text-xs text-amber">{t("demo.pantry")}</div><div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#eceef5]"><div className="h-full w-1/4 bg-amber" /></div><div className="mt-2 rounded-lg border border-amber/40 bg-amber/5 px-2 py-1 text-xs text-amber">{t("demo.pantry_warn")}</div></div> },
            { img: "/pal-wave.png", h: t("intro.f_chat"), p: t("intro.f_chat_t"), demo: <div className="mt-3 space-y-1.5"><div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-primary px-3 py-1.5 text-xs text-white">{t("pal.q2", { name: "BIT" })}</div><div className="w-fit rounded-2xl rounded-bl-sm border border-line bg-panel px-3 py-1.5 text-xs">{lang === "zh" ? "8 个月，每天 750 ml 加两顿泥，够了。" : "8 months, 750 ml a day plus two meals of purée. Yes."}</div></div> },
            { img: "/pal-receipt-2.png", h: t("intro.f_pay"), p: t("intro.f_pay_t"), demo: <div className="mt-3 rounded-full bg-[#0070ba] py-2 text-center text-xs font-semibold text-white">PayPal · $18.00</div> },
            { img: "/pal-heart-2.png", h: t("intro.f_earn"), p: t("intro.f_earn_t"), demo: <div className="num mt-3 text-sm text-green">+$2.00 · PayPal Payouts</div> },
            { img: "/pal-baby-1.png", h: t("intro.f_ledger"), p: t("intro.f_ledger_t"), demo: <div className="num mt-3 grid grid-cols-3 gap-1 text-[11px] text-muted"><span>10-02</span><span>diapers</span><span className="text-right text-red">−$147.00</span><span>10-02</span><span>survey</span><span className="text-right text-green">+$2.00</span></div> },
          ].map((m) => (
            <div key={m.h} className="rounded-3xl border border-line bg-panel p-5 shadow-sm">
              <img src={m.img} alt="" className="h-14 w-auto" />
              <h3 className="mt-3 text-lg font-semibold">{m.h}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-fg/80">{m.p}</p>
              {m.demo}
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="text-2xl font-semibold tracking-tight">{t("intro.how")}</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[t("intro.s1"), t("intro.s2"), t("intro.s3")].map((s, i) => (
            <li key={i} className="rounded-3xl border border-line bg-panel p-6 shadow-sm"><div className="num text-3xl font-semibold text-primary">{i + 1}</div><p className="mt-2 text-[15px] leading-relaxed">{s}</p></li>
          ))}
        </ol>
        <div className="mt-8 flex justify-center"><Link href="/login" className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25">{t("intro.cta")}</Link></div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-16 pt-6 text-center text-xs text-muted">{t("intro.foot")}</footer>
    </main>
  );
}
