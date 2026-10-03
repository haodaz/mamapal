"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "./LangProvider";

declare global {
  interface Window { paypal?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
}

let loading: Promise<void> | null = null;
function loadSdk(clientId: string) {
  if (window.paypal) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&disable-funding=card,credit,paylater`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PayPal SDK failed to load"));
    document.head.appendChild(s);
  });
  return loading;
}

// Sandbox buyer credentials shown next to the button so a tester never has to remember them. Fake account, fake money.
function BuyerHint() {
  const { t } = useLang();
  const email = process.env.NEXT_PUBLIC_SANDBOX_BUYER_EMAIL;
  const pass = process.env.NEXT_PUBLIC_SANDBOX_BUYER_PASSWORD;
  const [done, setDone] = useState<string | null>(null);
  if (!email) return null;
  const copy = async (label: string, v: string) => { try { await navigator.clipboard.writeText(v); setDone(label); setTimeout(() => setDone(null), 1200); } catch {} };
  const Chip = ({ label, value }: { label: string; value: string }) => (
    <button onClick={() => copy(label, value)} className="num rounded-full border border-line bg-bg px-2.5 py-1 text-[11px] text-fg hover:border-primary">
      {label}: {value} · <span className="text-primary">{done === label ? t("paypal.copied") : t("paypal.copy")}</span>
    </button>
  );
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
      <span>{t("paypal.buyer")}</span>
      <Chip label="email" value={email} />
      {pass && <Chip label={t("paypal.password")} value={pass} />}
    </div>
  );
}

export function PayPalButton({ planId, onPaid, onError }: { planId: string; onPaid: (result: unknown) => void; onError: (msg: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const { t } = useLang();
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    loadSdk(clientId)
      .then(() => {
        if (cancelled || !ref.current || !window.paypal) return;
        ref.current.innerHTML = "";
        window.paypal
          .Buttons({
            style: { layout: "horizontal", color: "blue", shape: "pill", height: 44, tagline: false, label: "pay" },
            createOrder: async () => {
              const r = await fetch("/api/paypal/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: planId }) });
              const j = await r.json();
              if (!r.ok) throw new Error(j.error ?? "Could not create order");
              return j.id as string;
            },
            onApprove: async (data: { orderID: string }) => {
              const r = await fetch(`/api/paypal/order/${data.orderID}/capture`, { method: "POST" });
              const j = await r.json();
              if (!r.ok) throw new Error(j.error ?? "Capture failed");
              onPaid(j);
            },
            onError: (err: unknown) => onError(err instanceof Error ? err.message : String(err)),
          })
          .render(ref.current)
          .then(() => setReady(true));
      })
      .catch((e: Error) => onError(e.message));
    return () => { cancelled = true; };
  }, [clientId, planId, onPaid, onError]);

  if (!clientId) return <div className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">{t("paypal.not_configured")}</div>;
  return (
    <div>
      {!ready && <div className="text-xs text-muted">{t("paypal.loading")}</div>}
      <div ref={ref} />
      <BuyerHint />
    </div>
  );
}
