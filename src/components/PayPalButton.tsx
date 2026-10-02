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
    </div>
  );
}
